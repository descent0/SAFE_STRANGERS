import { useEffect, useRef, useState, useCallback } from 'react'
import { io } from 'socket.io-client'

// Constants for better maintainability
const SOCKET_CONFIG = {
  transports: ['websocket'],
  timeout: 5000,
}

const CONNECTION_STATES = {
  DISCONNECTED: 'disconnected',
  CONNECTED: 'connected',
  JOINING: 'joining',
  QUEUED: 'queued',
  MATCHED: 'matched',
  SKIPPING: 'skipping',
  FINDING_NEW: 'finding-new',
  PARTNER_LEFT: 'partner-left',
  EXPIRED: 'expired',
  ERROR: 'error',
}

export const useAnonymousChat = (sessionId, chatMode, onMatchFound, onPartnerDisconnected, onMessage) => {
  // State management
  const [socket, setSocket] = useState(null)
  const [isConnected, setIsConnected] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState(CONNECTION_STATES.DISCONNECTED)
  const [partner, setPartner] = useState(null)
  const [queuePosition, setQueuePosition] = useState(null)
  const [userPreferences, setUserPreferences] = useState(null)
  const [isJoining, setIsJoining] = useState(false)

  // Helper function to reset state
  const resetMatchState = useCallback(() => {
    setPartner(null)
    setQueuePosition(null)
    setIsJoining(false)
  }, [])

  // Socket event handlers organized by category
  const setupConnectionHandlers = useCallback((newSocket) => {
    newSocket.on('connect', () => {
      console.log('✅ Connected to server')
      setIsConnected(true)
      setConnectionStatus(CONNECTION_STATES.CONNECTED)
      setIsJoining(false)
    })

    newSocket.on('disconnect', (reason) => {
      console.log('📡 Disconnected from server:', reason)
      setIsConnected(false)
      setConnectionStatus(CONNECTION_STATES.DISCONNECTED)
      resetMatchState()
    })

    newSocket.on('error', (error) => {
      console.error('❌ Socket error:', error)
      setConnectionStatus(CONNECTION_STATES.ERROR)
    })

    newSocket.on('session-expired', () => {
      console.log('⏰ Session expired')
      setConnectionStatus(CONNECTION_STATES.EXPIRED)
    })
  }, [resetMatchState])

  const setupMatchingHandlers = useCallback((newSocket) => {
    newSocket.on('anonymous-match-found', ({ partnerId, partnerInterests, skipped }) => {
      console.log('🎯 Match found!', { partnerId })
      setPartner({ id: partnerId, interests: partnerInterests })
      setConnectionStatus(CONNECTION_STATES.MATCHED)
      setQueuePosition(null)
      setIsJoining(false)
      
      onMatchFound?.({ partnerId, partnerInterests, skipped })
    })

    newSocket.on('queued-for-match', ({ position, estimatedWait, skipped, reconnected }) => {
      console.log('⏳ Queued for match', { position, estimatedWait, skipped, reconnected })
      
      if (reconnected) {
        setConnectionStatus(CONNECTION_STATES.FINDING_NEW)
      } else if (skipped) {
        setConnectionStatus(CONNECTION_STATES.FINDING_NEW)
      } else {
        setConnectionStatus(CONNECTION_STATES.QUEUED)
      }
      
      setQueuePosition(position)
      setPartner(null)
      setIsJoining(false)
    })

    newSocket.on('partner-disconnected', () => {
      console.log('💔 Partner disconnected')
      setPartner(null)
      setConnectionStatus(CONNECTION_STATES.PARTNER_LEFT)
      setIsJoining(false)
      
      onPartnerDisconnected?.()
    })
  }, [onMatchFound, onPartnerDisconnected])

  const setupMessageHandlers = useCallback((newSocket) => {
    newSocket.on('anonymous-chat-message', ({ message, timestamp }) => {
      onMessage?.({
        id: Date.now(),
        text: message,
        sender: 'Stranger',
        timestamp
      })
    })

    newSocket.on('partner-typing', (typing) => {
      // Use global function for typing indicator
      window.setPartnerTyping?.(typing)
    })

    newSocket.on('partner-reaction', ({ emoji }) => {
      // Use global function for reactions
      window.addReaction?.(emoji)
    })

    newSocket.on('message-blocked', ({ reason }) => {
      console.warn('🚫 Message blocked:', reason)
      // TODO: Show toast notification
    })
  }, [onMessage])

  // Main effect to set up socket connection and handlers
  useEffect(() => {
    if (!sessionId) return

    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001'
    const newSocket = io(socketUrl, SOCKET_CONFIG)

    // Set up all event handlers
    setupConnectionHandlers(newSocket)
    setupMatchingHandlers(newSocket)
    setupMessageHandlers(newSocket)

    setSocket(newSocket)

    // Cleanup on unmount
    return () => {
      console.log('🧹 Cleaning up socket connection')
      newSocket.disconnect()
    }
  }, [sessionId, setupConnectionHandlers, setupMatchingHandlers, setupMessageHandlers])

  // Helper function to validate socket and session
  const isValidConnection = useCallback(() => {
    return socket && sessionId && socket.connected
  }, [socket, sessionId])

  // Join anonymous chat with better validation
  const joinAnonymousChat = useCallback((interests = [], safeMode = false) => {
    if (!isValidConnection()) {
      console.warn('⚠️ Cannot join chat: Invalid connection state')
      return
    }

    if (isJoining) {
      console.log('⚠️ Already joining, ignoring duplicate request')
      return
    }

    setIsJoining(true)
    setConnectionStatus(CONNECTION_STATES.JOINING)
    
    const preferences = {
      sessionId,
      interests,
      chatMode,
      safeMode
    }
    
    setUserPreferences(preferences)
    console.log('🔗 Joining anonymous chat with preferences:', preferences)
    socket.emit('join-anonymous-chat', preferences)
  }, [socket, sessionId, chatMode, isJoining, isValidConnection])

  // Send message with validation
  const sendMessage = useCallback((messageText) => {
    if (!isValidConnection() || !partner) {
      console.warn('⚠️ Cannot send message: No active connection or partner')
      return null
    }

    const trimmedMessage = messageText.trim()
    if (!trimmedMessage) {
      console.warn('⚠️ Cannot send empty message')
      return null
    }

    socket.emit('anonymous-chat-message', {
      sessionId,
      message: trimmedMessage
    })
    
    // Return message for local display
    return {
      id: Date.now(),
      text: trimmedMessage,
      sender: 'You',
      timestamp: new Date().toISOString()
    }
  }, [socket, sessionId, partner, isValidConnection])

  // Send typing indicator
  const sendTyping = useCallback((typing) => {
    if (isValidConnection() && partner) {
      socket.emit('typing', { sessionId, typing })
    }
  }, [socket, sessionId, partner, isValidConnection])

  // Send reaction
  const sendReaction = useCallback((emoji) => {
    if (isValidConnection() && partner) {
      socket.emit('anonymous-reaction', { sessionId, emoji })
      console.log('🎭 Sent reaction:', emoji)
    }
  }, [socket, sessionId, partner, isValidConnection])

  // Skip current partner
  const skipPartner = useCallback(() => {
    if (!isValidConnection() || !partner) {
      console.warn('⚠️ Cannot skip: No active partner')
      return
    }

    if (isJoining) {
      console.warn('⚠️ Cannot skip while joining')
      return
    }

    setConnectionStatus(CONNECTION_STATES.SKIPPING)
    setIsJoining(true)
    socket.emit('skip-partner', { sessionId })
    console.log('⏭️ Skipping current partner')
    
    // Reset joining state after a timeout to prevent permanent disable
    setTimeout(() => {
      setIsJoining(false)
    }, 2000)
  }, [socket, sessionId, partner, isJoining, isValidConnection])

  // Leave chat and disconnect
  const leaveChat = useCallback(() => {
    if (socket) {
      console.log('🚪 Leaving chat and disconnecting')
      socket.disconnect()
    }
  }, [socket])

  // Return organized public API
  return {
    // Connection state
    socket,
    isConnected,
    connectionStatus,
    
    // Match state
    partner,
    queuePosition,
    userPreferences,
    
    // Actions
    joinAnonymousChat,
    sendMessage,
    sendTyping,
    sendReaction,
    skipPartner,
    leaveChat,
  }
}
