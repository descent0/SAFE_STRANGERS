import { useCallback, useEffect, useState } from "react"
import { getSocketInstance } from "../services/socketManager"

export const useChatMessaging = (
  sessionId,
  partner,
) => {
  const socket = getSocketInstance()

  const [messages, setMessages] = useState([])
  const [isPartnerTyping, setIsPartnerTyping] = useState(false)
  const [blockedCount, setBlockedCount] = useState(0)

  useEffect(() => {
    setMessages([])
    setIsPartnerTyping(false)
    setBlockedCount(0)
  }, [sessionId, partner?.id])

  const makeMessageId = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID()
    }
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`
  }

  useEffect(() => {
    if (!socket) return

    const handleMessage = ({ message, timestamp }) => {
      setMessages(prev => [
        ...prev,
        {
          id: makeMessageId(),
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
      console.warn('🚫 Message blocked:', reason)
      setBlockedCount(prev => prev + 1)
    }

    socket.on('anonymous-chat-message', handleMessage)
    socket.on('partner-typing', handleTyping)
    socket.on('message-blocked', handleBlockedMessage)
    const handleDeliveredMessage = ({ message, timestamp }) => {
      setMessages(prev => [
        ...prev,
        {
          id: makeMessageId(),
          text: message,
          sender: 'You',
          timestamp
        }
      ])
    }
    socket.on('message-delivered', handleDeliveredMessage)

    return () => {
      socket.off('anonymous-chat-message', handleMessage)
      socket.off('partner-typing', handleTyping)
      socket.off('message-blocked', handleBlockedMessage)
      socket.off('message-delivered', handleDeliveredMessage)
    }
  }, [socket, sessionId, partner])

  const sendMessage = useCallback((text) => {
    const trimmed = typeof text === 'string' ? text.trim() : ''
    if (!socket?.connected || !partner?.id || !trimmed) return

    const safeMode = sessionStorage.getItem('safeMode') === 'true'
    if (trimmed.length > (safeMode ? 500 : 1000)) return

    socket.emit('anonymous-chat-message', {
      sessionId,
      safeMode,
      message: trimmed
    })
  }, [socket, partner, sessionId])

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