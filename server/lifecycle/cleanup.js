const ServerState = require('../state/serverState')
const MatchManager = require('../managers/matchManager')
const PoolManager = require('../managers/poolManager')
const { CONFIG } = require('../config/constants')



const autoRequeuePartner = (partnerId, partnerUser, partnerSocket, io) => {
  if (ServerState.connectedUsers.has(partnerId) && partnerSocket.connected) {
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
      const matchIndex = ServerState.waitingQueue.findIndex(user => user.socketId === immediateMatch.socketId)
      if (matchIndex !== -1) {
        ServerState.waitingQueue.splice(matchIndex, 1)
      }
      MatchManager.create(partnerForQueue, immediateMatch, io, ServerState)
      return
    }

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

const handlePartnerDisconnect = (socketId, partnerId, io) => {
  const partnerSocket = io.sockets.sockets.get(partnerId)
  const partnerUser = ServerState.connectedUsers.get(partnerId)

  if (partnerSocket && partnerUser) {
    partnerSocket.emit('partner-disconnected')
    MatchManager.updateUserStatus(partnerId, null, false, ServerState)

    setTimeout(() => {
      autoRequeuePartner(partnerId, partnerUser, partnerSocket, io)
    }, 1000)
  }

  ServerState.activeChats.delete(socketId)
  ServerState.activeChats.delete(partnerId)
}

const requeueUserImmediate = (targetSocket, targetUser, io) => {
  if (targetUser.hasPartner || targetUser.isInQueue) return

  const userForQueue = {
    socketId: targetSocket.id,
    sessionId: targetUser.sessionId,
    interests: targetUser.interests || [],
    chatMode: targetUser.chatMode,
    safeMode: targetUser.safeMode || false,
    joinedAt: new Date(),
    isInQueue: true,
    hasPartner: false,
    lastSkipped: targetUser.lastSkipped,
    fromSkip: true
  }

  targetUser.isInQueue = true
  targetUser.hasPartner = false

  const immediateMatch = PoolManager.findImmediateMatch(userForQueue, io, ServerState)
  if (immediateMatch) {
    const matchIndex = ServerState.waitingQueue.findIndex(user => user.socketId === immediateMatch.socketId)
    if (matchIndex !== -1) {
      ServerState.waitingQueue.splice(matchIndex, 1)
    }
    MatchManager.create(userForQueue, immediateMatch, io, ServerState)
    return
  }

  PoolManager.addToPool(userForQueue, ServerState)
  const poolStats = PoolManager.getPoolStats(ServerState)
  targetSocket.emit('queued-for-match', {
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

const cleanupUser = (socketId, io) => {
  const user = ServerState.connectedUsers.get(socketId)

  const queueIndex = ServerState.waitingQueue.findIndex(queueUser => queueUser.socketId === socketId)
  if (queueIndex !== -1) {
    ServerState.waitingQueue.splice(queueIndex, 1)
  }

  const partnerId = ServerState.activeChats.get(socketId)
  if (partnerId) {
    handlePartnerDisconnect(socketId, partnerId, io)
  }


  if (user?.sessionId) {
    ServerState.userSessions.delete(user.sessionId)
  }

  ServerState.connectedUsers.delete(socketId)

  for (const [, otherUser] of ServerState.connectedUsers.entries()) {
    if (otherUser.partnerId === socketId) {
      otherUser.hasPartner = false
      otherUser.isInQueue = false
      delete otherUser.partnerId
    }
  }

  for (const [chatId, activePartnerId] of ServerState.activeChats.entries()) {
    if (activePartnerId === socketId) {
      ServerState.activeChats.delete(chatId)
    }
  }

  if (ServerState.waitingQueue.length >= 2) {
    PoolManager.processBatchMatching(io, ServerState, MatchManager)
  }
}

module.exports = {
  cleanupUser,
  handlePartnerDisconnect,
  autoRequeuePartner,
  requeueUserImmediate
}