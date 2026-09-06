import { CONFIG } from '../config/constants'
import MatchManager from '../managers/matchManager'
import PoolManager from '../managers/poolManager'
import { cleanupUser, clearChatPair, requeueUserImmediate } from '../lifecycle/cleanup'
import ServerState from '../state/serverState'
import type { JoinAnonymousChatPayload, SessionId, SessionPayload, SocketContext } from '../types'

const registerConnectionHandlers = ({ io, socket }: SocketContext): void => {
  const normalizeInterests = (value: unknown): string[] => {
    if (!Array.isArray(value)) return []
    return value
      .filter((item): item is string => typeof item === 'string')
      .map(item => item.trim())
      .filter(Boolean)
      .slice(0, 5)
  }

  const normalizeChatMode = (value: unknown): string | undefined => {
    const allowed = ['text', 'voice', 'video']
    return typeof value === 'string' && allowed.includes(value) ? value : undefined
  }

  const ownsSession = (sessionId: string, eventName: string): boolean => {
    if (ServerState.socketIdLookup.get(sessionId) === socket.id && sessionId) return true
    socket.emit('error', { message: `Invalid session for ${eventName}` })
    return false
  }
  socket.on('join-anonymous-chat', ({ sessionId, interests = [], chatMode, safeMode = false }: JoinAnonymousChatPayload) => {
    if (!sessionId || ServerState.waitingQueue.includes(sessionId) || ServerState.activeChats.has(sessionId)) return
    const nextInterests = normalizeInterests(interests)
    const nextChatMode = normalizeChatMode(chatMode)
    const previousSocketId = ServerState.socketIdLookup.get(sessionId)
    if (previousSocketId && previousSocketId !== socket.id) io.sockets.sockets.get(previousSocketId)?.disconnect(true)
    const currentUser = ServerState.connectedUsers.get(sessionId)
    const nextUser = {
      ...(currentUser ?? { connectedAt: new Date() }),
      ...currentUser,
      interests: nextInterests,
      chatMode: nextChatMode,
      safeMode: safeMode,
      joinedAt: new Date(),
      lastActivity: new Date(),
    }
    ServerState.connectedUsers.set(sessionId, nextUser)
    ServerState.socketIdLookup.set(sessionId, socket.id)
    PoolManager.addToPool(sessionId)
    const match = PoolManager.findImmediateMatch(sessionId, io)
    if (match && MatchManager.create(sessionId, match, io)) {
      return
    }
    const poolStats = PoolManager.getPoolStats()
    socket.emit('queued-for-match', { position: ServerState.waitingQueue.length, estimatedWait: Math.max(10, ServerState.waitingQueue.length * 15), totalInQueue: ServerState.waitingQueue.length, poolInfo: { bufferSize: poolStats.bufferSize, nextBatchIn: CONFIG.POOL.BATCH_MATCHING_INTERVAL / 1000 } })
  })
  socket.on('skip-partner', ({ sessionId }: SessionPayload) => {
    if (!ownsSession(sessionId, 'skip-partner')) return
    const partnerId = ServerState.activeChats.get(sessionId)
    if (!partnerId) return void socket.emit('error', { message: 'No active partner to skip' })
    if (ServerState.activeChats.get(sessionId) !== partnerId) return
    const currentUser = ServerState.connectedUsers.get(sessionId)
    const partnerUser = ServerState.connectedUsers.get(partnerId)
    const partnerSocket = io.sockets.sockets.get(ServerState.socketIdLookup.get(partnerId) ?? '')

    clearChatPair(sessionId, partnerId)
    if (currentUser) {
      currentUser.lastSkipped = partnerId
      currentUser.lastSkippedAt = new Date()
    }
    if (partnerUser) {
      partnerUser.lastSkipped = sessionId
      partnerUser.lastSkippedAt = new Date()
    }

    socket.emit('partner-disconnected')
    partnerSocket?.emit('partner-disconnected')
    const currentSocketUser = ServerState.connectedUsers.get(sessionId)
    const currentPartnerUser = ServerState.connectedUsers.get(partnerId)
    if (currentSocketUser && currentSocketUser === currentUser && !ServerState.activeChats.has(sessionId) && !ServerState.waitingQueue.includes(sessionId)) {
      requeueUserImmediate(sessionId, currentSocketUser, io)
    }
    if (partnerSocket && currentPartnerUser && currentPartnerUser === partnerUser && !ServerState.activeChats.has(partnerId) && !ServerState.waitingQueue.includes(partnerId)) {
      requeueUserImmediate(partnerId, currentPartnerUser, io)
    }
  })
  socket.on('user-left', ({ sessionId }: SessionPayload, acknowledge?: (response: { ok: boolean }) => void) => {
    if (!ownsSession(sessionId, 'user-left')) {
      acknowledge?.({ ok: false })
      return
    }
    cleanupUser(socket.id, io)
    acknowledge?.({ ok: true })
  })
  socket.on('disconnect', reason => { console.log(`Socket left: ${socket.id}, reason: ${reason}`); cleanupUser(socket.id, io) })
}

export default registerConnectionHandlers
