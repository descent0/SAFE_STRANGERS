const ServerState = require('../state/serverState')
const PoolManager = require('../managers/poolManager')
const MatchManager = require('../managers/matchManager')
const { CONFIG } = require('../config/constants')
const { cleanupUser, requeueUserImmediate } = require('../lifecycle/cleanup')

module.exports = function registerConnectionHandlers({ io, socket }) {
  const getCurrentUser = () => ServerState.connectedUsers.get(socket.id)

  const assertSessionOwnership = (sessionId, eventName) => {
    const currentUser = getCurrentUser()

    if (!currentUser?.sessionId || !sessionId || currentUser.sessionId !== sessionId) {
      socket.emit('error', { message: `Invalid session for ${eventName}` })
      return false
    }

    return true
  }

  socket.on('join-anonymous-chat', ({ sessionId, interests = [], chatMode, safeMode = false }) => {
    const existingUser = ServerState.connectedUsers.get(socket.id);
    if (existingUser && (existingUser.isInQueue || existingUser.hasPartner)) return;
    
    const existingSocketId = ServerState.userSessions.get(sessionId);
    if (existingSocketId && existingSocketId !== socket.id) {
      cleanupUser(existingSocketId, io);
    }
    
    const user = {
      socketId: socket.id,
      sessionId,
      interests,
      chatMode,
      safeMode,
      joinedAt: new Date(),
      isInQueue: true,
      hasPartner: false
    };
    
    ServerState.connectedUsers.set(socket.id, user);
    ServerState.userSessions.set(sessionId, socket.id);
    
    if (PoolManager.shouldDoImmediateMatch(ServerState.waitingQueue.length)) {
      const match = PoolManager.findImmediateMatch(user, io, ServerState);
      if (match) {
        const matchIndex = ServerState.waitingQueue.findIndex(u => u.socketId === match.socketId);
        if (matchIndex !== -1) {
          ServerState.waitingQueue.splice(matchIndex, 1);
        }
        MatchManager.create(user, match, io, ServerState);
        return;
      }
    }
    
    PoolManager.addToPool(user, ServerState);
    const queuePosition = ServerState.waitingQueue.length;
    const poolStats = PoolManager.getPoolStats(ServerState);
    
    socket.emit('queued-for-match', {
      position: queuePosition,
      estimatedWait: Math.max(10, queuePosition * 15),
      totalInQueue: ServerState.waitingQueue.length,
      poolInfo: {
        bufferSize: poolStats.bufferSize,
        nextBatchIn: CONFIG.POOL.BATCH_MATCHING_INTERVAL / 1000
      }
    });
  });

  socket.on('skip-partner', ({ sessionId }) => {
    if (!assertSessionOwnership(sessionId, 'skip-partner')) {
      return
    }

    const partnerId = ServerState.activeChats.get(socket.id);
    if (!partnerId) {
      socket.emit('error', { message: 'No active partner to skip' });
      return;
    }
    
    const currentUser = ServerState.connectedUsers.get(socket.id);
    const partnerUser = ServerState.connectedUsers.get(partnerId);
    const partnerSocket = io.sockets.sockets.get(partnerId);
    
    ServerState.activeChats.delete(socket.id);
    ServerState.activeChats.delete(partnerId);
    
    if (currentUser) {
      currentUser.isInQueue = false;
      currentUser.hasPartner = false;
      delete currentUser.partnerId;
      currentUser.lastSkipped = partnerId;
    }
    if (partnerUser) {
      partnerUser.isInQueue = false;
      partnerUser.hasPartner = false;
      delete partnerUser.partnerId;
      partnerUser.lastSkipped = socket.id;
    }
    
    if (partnerSocket) {
      partnerSocket.emit('partner-disconnected');
    }
    
    setTimeout(() => {
      socket.emit('partner-disconnected');
      
      if (currentUser && ServerState.connectedUsers.has(socket.id)) {
        requeueUserImmediate(socket, currentUser, io)
      }
      if (partnerUser && ServerState.connectedUsers.has(partnerId) && partnerSocket) {
        requeueUserImmediate(partnerSocket, partnerUser, io)
      }
    }, 100);
  });

  socket.on('disconnect', (reason) => {
    console.log(`Socket left: ${socket.id}, reason: ${reason}`);
    cleanupUser(socket.id, io)
  });
};