import { useCallback, useEffect, useState } from "react"
import { getSocketInstance } from "../services/socketManager"

export const useChatMessaging = (
  sessionId,
  partner,
) => {
  const socket = getSocketInstance()

  const [messages, setMessages] = useState([])
  const [isPartnerTyping, setIsPartnerTyping] = useState(false)
  const [blockedCount, setBlockedCount] = useState(0);

  useEffect(() => {
    if (!socket) return

    const handleMessage = ({ message, timestamp }) => {
      setMessages(prev => [
        ...prev,
        {
          id: Date.now(),
          text: message,
          sender: 'Stranger',
          timestamp
        }
      ])
    }

    const handleTyping = (typing) => {
      setIsPartnerTyping(typing)
    }
    const handleBlockedMessage = ({ reason }) => {
  console.warn('🚫 Message blocked:', reason);
  setBlockedCount(prev => prev + 1)
}

    socket.on('anonymous-chat-message', handleMessage)
    socket.on('partner-typing', handleTyping)
    socket.on('message-blocked', handleBlockedMessage)

    return () => {
      socket.off('anonymous-chat-message', handleMessage)
      socket.off('partner-typing', handleTyping)
      socket.off('message-blocked', handleBlockedMessage)
    }
  }, [sessionId, partner])

  // FIX #3: was useCallback(..., []) — closed over the initial `partner`
  // (id: null) and `sessionId` from first render forever, so messages
  // silently stopped sending once a real partner was matched.
  const sendMessage = useCallback((text) => {
    if (!socket?.connected || !partner?.id) return
      const safeMode = sessionStorage.getItem('safeMode') === 'true'
    socket.emit('anonymous-chat-message', {
      sessionId,
      safeMode,
      message: text
    })

    setMessages(prev => [
      ...prev,
      {
        id: Date.now(),
        text,
        sender: 'You',
        timestamp: new Date().toISOString()
      }
    ])
  }, [socket, partner, sessionId])

  // FIX #3: same stale-closure issue as sendMessage above.
  const sendTyping = useCallback((typing) => {
    if (!socket?.connected || !partner?.id) return

    socket.emit('typing', {
      sessionId,
      typing
    })
  }, [socket, partner, sessionId])

  return {
    messages,
    isPartnerTyping,
    blockedCount,
    sendMessage,
    sendTyping
  }
}