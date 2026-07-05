const { CONFIG } = require('../config/constants')
const ServerState = require('../state/serverState')
const MatchManager = require('../managers/matchManager')
const PoolManager = require('../managers/poolManager')
const webrtcConnections = require('../state/webrtcConnections')

module.exports = (io) => {
  const cleanupUser = (socketId) => {
    const user = ServerState.connectedUsers.get(socketId)

    const queueIndex = ServerState.waitingQueue.findIndex(u => u.socketId === socketId)
    if (queueIndex !== -1) {
      ServerState.waitingQueue.splice(queueIndex, 1)
      console.log(`Removed ${socketId.slice(-4)} from queue. Size: ${ServerState.waitingQueue.length}`)
    }

    const partnerId = ServerState.activeChats.get(socketId)
    if (partnerId) {
      handlePartnerDisconnect(socketId, partnerId)
    }

    for (const [connectionKey, connection] of webrtcConnections.entries()) {
      if (connection.initiator === socketId || connection.receiver === socketId) {
        webrtcConnections.delete(connectionKey)
      }
    }

    if (user?.sessionId) {
      ServerState.userSessions.delete(user.sessionId)
    }

    ServerState.connectedUsers.delete(socketId)

    for (const [otherId, otherUser] of ServerState.connectedUsers.entries()) {
      if (otherUser.partnerId === socketId) {
        otherUser.hasPartner = false
        otherUser.isInQueue = false
        delete otherUser.partnerId
      }
    }
    for (const [chatId, partnerId] of ServerState.activeChats.entries()) {
      if (partnerId === socketId) {
        ServerState.activeChats.delete(chatId)
      }
    }

    console.log(`Cleaned up user ${socketId.slice(-4)}. Active: ${ServerState.connectedUsers.size}, Queue: ${ServerState.waitingQueue.length}, Chats: ${ServerState.activeChats.size}`)

    if (ServerState.waitingQueue.length >= 2) {
      PoolManager.processBatchMatching(io, ServerState, MatchManager)
    }
  }

  const handlePartnerDisconnect = (socketId, partnerId) => {
    const partnerSocket = io.sockets.sockets.get(partnerId)
    const partnerUser = ServerState.connectedUsers.get(partnerId)

    if (partnerSocket && partnerUser) {
      console.log(`Notifying ${partnerId.slice(-4)} that ${socketId.slice(-4)} disconnected`)
      partnerSocket.emit('partner-disconnected')

      MatchManager.updateUserStatus(partnerId, null, false, ServerState)

      setTimeout(() => {
        autoRequeuePartner(partnerId, partnerUser, partnerSocket)
      }, 1000)
    }

    ServerState.activeChats.delete(socketId)
    ServerState.activeChats.delete(partnerId)

    console.log(`Chat ended due to ${socketId.slice(-4)} disconnect. Partner ${partnerId.slice(-4)} will be auto-requeued`)
  }

  const autoRequeuePartner = (partnerId, partnerUser, partnerSocket) => {
    if (ServerState.connectedUsers.has(partnerId) && partnerSocket.connected) {
      console.log(`Auto-requeuing partner ${partnerId.slice(-4)} after disconnect`)

      const partnerForQueue = {
        socketId: partnerId,
        sessionId: partnerUser.sessionId,
        interests: partnerUser.interests || [],
        chatMode: partnerUser.chatMode,
        safeMode: partnerUser.safeMode || false,
        joinedAt: new Date(),
        isInQueue: true,
        hasPartner: false,
        fromDisconnect: true
      }

      const immediateMatch = PoolManager.findImmediateMatch(partnerForQueue, io, ServerState)
      if (immediateMatch) {
        const matchIndex = ServerState.waitingQueue.findIndex(u => u.socketId === immediateMatch.socketId)
        if (matchIndex !== -1) {
          ServerState.waitingQueue.splice(matchIndex, 1)
        }
        console.log(`Immediate disconnect match: ${partnerId.slice(-4)} <-> ${immediateMatch.socketId.slice(-4)}`)
        MatchManager.create(partnerForQueue, immediateMatch, io, ServerState)
      } else {
        PoolManager.addToPool(partnerForQueue, ServerState)
        const poolStats = PoolManager.getPoolStats(ServerState)
        partnerSocket.emit('queued-for-match', {
          position: ServerState.waitingQueue.length,
          estimatedWait: Math.max(CONFIG.QUEUE.MIN_ESTIMATED_WAIT, ServerState.waitingQueue.length * CONFIG.QUEUE.ESTIMATED_WAIT_PER_POSITION),
          totalInQueue: ServerState.waitingQueue.length,
          reconnected: true,
          poolInfo: {
            bufferSize: poolStats.bufferSize,
            nextBatchIn: CONFIG.POOL.BATCH_MATCHING_INTERVAL / 1000
          }
        })
      }
    }
  }

  // Used after a skip — both sides need to go back into matching immediately.
  const requeueUserImmediate = (socket, user) => {
    console.log(`Immediate requeue for skip: ${socket.id}`)

    if (user.hasPartner || user.isInQueue) {
      console.log(`User ${socket.id} already has partner or in queue, skipping requeue`)
      return
    }

    const userForQueue = {
      socketId: socket.id,
      sessionId: user.sessionId,
      interests: user.interests || [],
      chatMode: user.chatMode,
      safeMode: user.safeMode || false,
      joinedAt: new Date(),
      isInQueue: true,
      hasPartner: false,
      lastSkipped: user.lastSkipped,
      fromSkip: true
    }

    user.isInQueue = true
    user.hasPartner = false

    const immediateMatch = PoolManager.findImmediateMatch(userForQueue, io, ServerState)
    if (immediateMatch) {
      const matchIndex = ServerState.waitingQueue.findIndex(u => u.socketId === immediateMatch.socketId)
      if (matchIndex !== -1) {
        ServerState.waitingQueue.splice(matchIndex, 1)
      }
      console.log(`Immediate skip match: ${socket.id} <-> ${immediateMatch.socketId}`)
      MatchManager.create(userForQueue, immediateMatch, io, ServerState)
    } else {
      PoolManager.addToPool(userForQueue, ServerState)

      const poolStats = PoolManager.getPoolStats(ServerState)
      socket.emit('queued-for-match', {
        position: 1,
        estimatedWait: 5,
        totalInQueue: ServerState.waitingQueue.length,
        skipped: true,
        priority: true,
        poolInfo: {
          bufferSize: poolStats.bufferSize,
          nextBatchIn: Math.min(CONFIG.POOL.BATCH_MATCHING_INTERVAL / 1000, 3)
        }
      })
    }
  }

  return {
    cleanupUser,
    handlePartnerDisconnect,
    autoRequeuePartner,
    requeueUserImmediate
  }
}