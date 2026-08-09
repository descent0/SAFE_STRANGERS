import { useEffect, useState, useCallback } from 'react'
import {
  getSocketInstance,
  disconnectSocket
} from '../services/socketManager'

import { CONNECTION_STATES } from '../const/socket'

export const useMatchUser = (sessionId, chatMode) => {
  const socket = getSocketInstance()

  const [connectionStatus, setConnectionStatus] = useState(
    CONNECTION_STATES.DISCONNECTED
  )

  const [partner, setPartner] = useState({
      id: null,
      interests: null,
       isWebRTCInitator: null,
    })
    const [queuePosition, setQueuePosition] = useState(null)


 useEffect(() => {
  if (!socket || !sessionId) return


  const resetMatchState = () => {
    setPartner({
      id: null,
      interests: null,
      isWebRTCInitator: null
    })
    setQueuePosition(null)
  }

  const handleConnect = () => {
    console.log('✅ Connected to server')
    setConnectionStatus(CONNECTION_STATES.CONNECTED)
  }

  const handleDisconnect = (reason) => {
    console.log('📡 Disconnected from server:', reason)

    setConnectionStatus(CONNECTION_STATES.DISCONNECTED)
    resetMatchState()
  }

  const handleError = (error) => {
    console.error('❌ Socket error:', error)

    setConnectionStatus(CONNECTION_STATES.ERROR)
  }

  const handleSessionExpired = () => {
    console.log('⏰ Session expired')

    setConnectionStatus(CONNECTION_STATES.EXPIRED)
  }

  const handleMatchFound = ({
    partnerId,
    partnerInterests,
    isWebRTCInitator,
  }) => {
    console.log('🎯 Match found!', partnerId)

    setPartner({
      id: partnerId,
      interests: partnerInterests,
      isWebRTCInitator: isWebRTCInitator,
    })

    setQueuePosition(null)

    setConnectionStatus(CONNECTION_STATES.MATCHED)
  }

  const handleQueued = ({
    position,
    skipped,
    reconnected
  }) => {
    console.log('⏳ Queued for match')

    setPartner({
      id: null,
      interests: null,
      isWebRTCInitator: null
    })

    setQueuePosition(position)

    if (reconnected || skipped) {
      setConnectionStatus(CONNECTION_STATES.FINDING_NEW)
    } else {
      setConnectionStatus(CONNECTION_STATES.QUEUED)
    }
  }

  const handlePartnerDisconnected = () => {
    console.log('💔 Partner disconnected')

    setPartner({
      id: null,
      interests: null,
      isWebRTCInitator: null

    })

    setConnectionStatus(CONNECTION_STATES.PARTNER_LEFT)
  }

  socket.on('connect', handleConnect)
  socket.on('disconnect', handleDisconnect)
  socket.on('error', handleError)
  socket.on('session-expired', handleSessionExpired)

  socket.on('anonymous-match-found', handleMatchFound)
  socket.on('queued-for-match', handleQueued)
  socket.on('partner-disconnected', handlePartnerDisconnected)

  return () => {
    socket.off('connect', handleConnect)
    socket.off('disconnect', handleDisconnect)
    socket.off('error', handleError)
    socket.off('session-expired', handleSessionExpired)

    socket.off('anonymous-match-found', handleMatchFound)
    socket.off('queued-for-match', handleQueued)
    socket.off('partner-disconnected', handlePartnerDisconnected)
  }
}, [socket, sessionId])

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
        safeMode
      }

      socket.emit('join-anonymous-chat', preferences)
    }, [socket, sessionId, chatMode, connectionStatus])

  // FIX #4: joinAnonymousChat used to only be called once on mount from ChatContent,
  // before the socket was necessarily connected — so it would silently bail out and
  // never retry. This effect re-triggers the join the moment the socket actually
  // reports 'connected', regardless of timing.
  useEffect(() => {
    if (connectionStatus === CONNECTION_STATES.CONNECTED) {
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
    disconnectSocket()
  }, [])

  return {
    connectionStatus,
    partner,
    queuePosition,
    joinAnonymousChat,
    skipPartner,
    leaveChat
  }
}