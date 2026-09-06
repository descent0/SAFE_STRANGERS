import { useEffect, useState, useCallback } from 'react'
import {
  getSocketInstance,
  disconnectSocket
} from '../services/socketManager'

import { CONNECTION_STATES } from '../const/socket'
export const useMatchUser = (sessionId, chatMode) => {
  const socket = sessionId ? getSocketInstance() : null

  const [connectionStatus, setConnectionStatus] = useState(
    CONNECTION_STATES.DISCONNECTED
  )

  const [partner, setPartner] = useState({
    id: null,
    interests: null,
    isWebRTCInitator: null,
  })
  const [queuePosition, setQueuePosition] = useState(null)

  const resetMatchState = useCallback(() => {
    setPartner({
      id: null,
      interests: null,
      isWebRTCInitator: null,
    })
    setQueuePosition(null)
  }, [])

  const handleConnect = useCallback(() => {
    console.log('✅ Connected to server')
    setConnectionStatus(CONNECTION_STATES.CONNECTED)
  }, [])

  const handleDisconnect = useCallback((reason) => {
    console.log('📡 Disconnected from server:', reason)
    setConnectionStatus(CONNECTION_STATES.DISCONNECTED)
    resetMatchState()
  }, [resetMatchState])

  const handleError = useCallback((error) => {
    console.error('❌ Socket error:', error)
    setConnectionStatus(CONNECTION_STATES.ERROR)
  }, [])

  const handleConnectError = useCallback((error) => {
    console.error('❌ Socket connection failed:', error.message)
    setConnectionStatus(CONNECTION_STATES.ERROR)
  }, [])

  const handleSessionExpired = useCallback(() => {
    console.log('⏰ Session expired')
    setConnectionStatus(CONNECTION_STATES.EXPIRED)
  }, [])

  const handleMatchFound = useCallback(({ partnerId, partnerInterests, isWebRTCInitator }) => {
    console.log('🎯 Match found!', partnerId)
    setPartner({
      id: partnerId,
      interests: partnerInterests,
      isWebRTCInitator,
    })
    setQueuePosition(null)
    setConnectionStatus(CONNECTION_STATES.MATCHED)
  }, [])

  const handleQueued = useCallback(({ position, skipped, reconnected }) => {
    console.log('⏳ Queued for match')
    setPartner({
      id: null,
      interests: null,
      isWebRTCInitator: null,
    })
    setQueuePosition(position)
    setConnectionStatus(reconnected || skipped ? CONNECTION_STATES.FINDING_NEW : CONNECTION_STATES.QUEUED)
  }, [])

  const handlePartnerDisconnected = useCallback(() => {
    console.log('💔 Partner disconnected')
    setPartner({
      id: null,
      interests: null,
      isWebRTCInitator: null,
    })
    setConnectionStatus(CONNECTION_STATES.PARTNER_LEFT)
  }, [])

  useEffect(() => {
    if (!socket || !sessionId) return

    socket.on('connect', handleConnect)
    socket.on('disconnect', handleDisconnect)
    socket.on('error', handleError)
    socket.on('connect_error', handleConnectError)
    socket.on('session-expired', handleSessionExpired)

    socket.on('anonymous-match-found', handleMatchFound)
    socket.on('queued-for-match', handleQueued)
    socket.on('partner-disconnected', handlePartnerDisconnected)

    if (socket.connected) {
      handleConnect()
    } else {
      socket.connect()
    }

    return () => {
      socket.off('connect', handleConnect)
      socket.off('disconnect', handleDisconnect)
      socket.off('error', handleError)
      socket.off('connect_error', handleConnectError)
      socket.off('session-expired', handleSessionExpired)

      socket.off('anonymous-match-found', handleMatchFound)
      socket.off('queued-for-match', handleQueued)
      socket.off('partner-disconnected', handlePartnerDisconnected)
    }
  }, [socket, sessionId, handleConnect, handleDisconnect, handleError, handleConnectError, handleSessionExpired, handleMatchFound, handleQueued, handlePartnerDisconnected])

  const joinAnonymousChat = useCallback(() => {
    if (!socket?.connected || !sessionId) return
    if (connectionStatus === CONNECTION_STATES.JOINING) return

    setConnectionStatus(CONNECTION_STATES.JOINING)
    const interests = JSON.parse(sessionStorage.getItem('chatInterests') || '[]')
    const safeMode = sessionStorage.getItem('safeMode') === 'true'
    const preferences = {
      sessionId,
      interests,
      chatMode,
      safeMode,
    }

    socket.emit('join-anonymous-chat', preferences)
  }, [socket, sessionId, chatMode, connectionStatus])

  useEffect(() => {
    if (connectionStatus === CONNECTION_STATES.CONNECTED) {
     console.log("JOINING");
      joinAnonymousChat()
    }
  }, [connectionStatus, joinAnonymousChat])

  const skipPartner = useCallback(() => {
    if (!socket?.connected || !partner.id) return
    setConnectionStatus(CONNECTION_STATES.SKIPPING)
    socket.emit('skip-partner', { sessionId })
  }, [socket, partner, sessionId])

  const leaveChat = useCallback(() => {
    setConnectionStatus(CONNECTION_STATES.DISCONNECTED)
    if (!socket?.connected || !sessionId) {
      disconnectSocket()
      return
    }

    let closed = false
    const closeSocket = () => {
      if (closed) return
      closed = true
      disconnectSocket()
    }

    socket.timeout(1000).emit('user-left', { sessionId }, closeSocket)
    setTimeout(closeSocket, 1200)
  }, [socket, sessionId])

  return {
    connectionStatus,
    partner,
    queuePosition,
    joinAnonymousChat,
    skipPartner,
    leaveChat,
  }
}
