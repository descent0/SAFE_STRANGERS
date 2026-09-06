import type { Server, Socket } from 'socket.io'
import { CONFIG } from '../config/constants'
import MatchManager from '../managers/matchManager'
import PoolManager from '../managers/poolManager'
import ServerState from '../state/serverState'
import type { ConnectedUser, SessionId, SocketId } from '../types'

export const clearChatPair = (sessionId1: SessionId, sessionId2: SessionId): void => {
  ServerState.activeChats.delete(sessionId1)
  ServerState.activeChats.delete(sessionId2)
  ServerState.waitingQueue = ServerState.waitingQueue.filter(id => id !== sessionId1 && id !== sessionId2)
}

export const autoRequeuePartner = (partnerId: SessionId, io: Server): void => {
  const partnerSocket = io.sockets.sockets.get(ServerState.socketIdLookup.get(partnerId) ?? '')
  if (!ServerState.connectedUsers.has(partnerId) || !partnerSocket?.connected) return
  if (ServerState.activeChats.has(partnerId) || ServerState.waitingQueue.includes(partnerId)) return
  if (!PoolManager.addToPool(partnerId, { priority: true })) return
  const match = PoolManager.findImmediateMatch(partnerId, io)
  if (match && MatchManager.create(partnerId, match, io)) return
  const poolStats = PoolManager.getPoolStats()
  console.log("QUEUED",ServerState);
  partnerSocket.emit('queued-for-match', { position: ServerState.waitingQueue.length, estimatedWait: Math.max(CONFIG.QUEUE.MIN_ESTIMATED_WAIT, ServerState.waitingQueue.length * CONFIG.QUEUE.ESTIMATED_WAIT_PER_POSITION), totalInQueue: ServerState.waitingQueue.length, reconnected: true, poolInfo: { bufferSize: poolStats.bufferSize, nextBatchIn: CONFIG.POOL.BATCH_MATCHING_INTERVAL / 1000 } })
}

export const handlePartnerDisconnect = (sessionId: SessionId, partnerId: SessionId, io: Server): void => {
  const partnerSocket = io.sockets.sockets.get(ServerState.socketIdLookup.get(partnerId) ?? '')
  clearChatPair(sessionId, partnerId)
  if (partnerSocket && ServerState.connectedUsers.has(partnerId)) {
    partnerSocket.emit('partner-disconnected')
    autoRequeuePartner(partnerId, io)
  }
}

export const requeueUserImmediate = (sessionId: SessionId, _user: ConnectedUser, io: Server): void => {
  const socket = io.sockets.sockets.get(ServerState.socketIdLookup.get(sessionId) ?? '')
  if (ServerState.activeChats.has(sessionId) || ServerState.waitingQueue.includes(sessionId)) return
  if (!socket?.connected || !PoolManager.addToPool(sessionId, { priority: true })) return
  ServerState.activeChats.delete(sessionId)
  const match = PoolManager.findImmediateMatch(sessionId, io)
  if (match && MatchManager.create(sessionId, match, io)) {
    return
  }
  const poolStats = PoolManager.getPoolStats()
  socket.emit('queued-for-match', { position: ServerState.waitingQueue.indexOf(sessionId) + 1, estimatedWait: 5, totalInQueue: ServerState.waitingQueue.length, skipped: true, priority: true, poolInfo: { bufferSize: poolStats.bufferSize, nextBatchIn: Math.min(CONFIG.POOL.BATCH_MATCHING_INTERVAL / 1000, 3) } })
}

export const cleanupUser = (socketId: SocketId, io: Server): void => {
  const sessionId = [...ServerState.socketIdLookup.entries()].find(([, currentSocketId]) => currentSocketId === socketId)?.[0]
  if (!sessionId || ServerState.socketIdLookup.get(sessionId) !== socketId) return
  const partnerId = ServerState.activeChats.get(sessionId)
  ServerState.socketIdLookup.delete(sessionId)
  ServerState.waitingQueue = ServerState.waitingQueue.filter(id => id !== sessionId)
  ServerState.activeChats.delete(sessionId)
  if (partnerId && ServerState.activeChats.get(partnerId) === sessionId) ServerState.activeChats.delete(partnerId)
  ServerState.connectedUsers.delete(sessionId)
  if (partnerId) handlePartnerDisconnect(sessionId, partnerId, io)
  if (ServerState.waitingQueue.length >= 2) PoolManager.processBatchMatching(io)
}
