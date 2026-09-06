import MessageUtils from '../utils/messageUtils'
import ServerState from '../state/serverState'
import type { ChatMessagePayload, SocketContext, TypingPayload } from '../types'

const registerChatHandlers = ({ io, socket }: SocketContext): void => {
  const ownsSession = (sessionId: string, eventName: string): boolean => {
    if (sessionId && ServerState.socketIdLookup.get(sessionId) === socket.id) return true
    socket.emit('error', { message: `Invalid session for ${eventName}` })
    return false
  }

  const emitReaction = (to: string, emoji: string): void => {
    const targetSocketId = ServerState.socketIdLookup.get(to)
    io.sockets.sockets.get(targetSocketId ?? '')?.emit('partner-reaction', { emoji, from: socket.id })
  }

  socket.on('anonymous-chat-message', ({ sessionId, message }: ChatMessagePayload) => {
    if (!ownsSession(sessionId, 'anonymous-chat-message')) return
    const partnerId = ServerState.activeChats.get(sessionId)
    if (!partnerId) return void socket.emit('error', { message: 'No active chat partner' })
    const user = ServerState.connectedUsers.get(sessionId)
    const normalizedMessage = typeof message === 'string' ? message : null
    const sanitizedMessage = user?.safeMode ? MessageUtils.sanitize(normalizedMessage) : normalizedMessage

    if (normalizedMessage && normalizedMessage.length > 1000) {
      return void socket.emit('message-blocked', { reason: 'Message exceeds maximum length' })
    }
    if (sanitizedMessage === null) {
      return void socket.emit('message-blocked', { reason: 'Message contains inappropriate content' })
    }
    if (!sanitizedMessage) return

    io.sockets.sockets.get(ServerState.socketIdLookup.get(partnerId) ?? '')?.emit('anonymous-chat-message', { message: sanitizedMessage, timestamp: new Date().toISOString(), from: socket.id })
    socket.emit('message-delivered', { message: sanitizedMessage, timestamp: new Date().toISOString() })
    if (user) user.lastActivity = new Date()
  })

  socket.on('typing', ({ sessionId, typing }: TypingPayload) => {
    if (!ownsSession(sessionId, 'typing')) return
    const partnerId = ServerState.activeChats.get(sessionId)
    if (!partnerId) return
    const user = ServerState.connectedUsers.get(sessionId)
    if (user) user.lastActivity = new Date()
    io.sockets.sockets.get(ServerState.socketIdLookup.get(partnerId) ?? '')?.emit('partner-typing', typing)
  })

  socket.on('send-reaction', ({ to, emoji }: { to: string; emoji: string }) => {
    const sessionId = [...ServerState.socketIdLookup.entries()].find(([, socketId]) => socketId === socket.id)?.[0]
    const partnerId = sessionId ? ServerState.activeChats.get(sessionId) : undefined
    if (!partnerId || partnerId !== to) return
    if (typeof emoji !== 'string' || !emoji.trim()) return
    const user = sessionId ? ServerState.connectedUsers.get(sessionId) : undefined
    if (user) user.lastActivity = new Date()
    emitReaction(to, emoji.trim())
  })
}

export default registerChatHandlers
