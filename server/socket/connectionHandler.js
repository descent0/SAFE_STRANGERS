const ServerState = require('../state/serverState');
const PoolManager = require('../managers/poolManager');
const MatchManager = require('../managers/matchManager');
const { CONFIG } = require('../config/constants');

module.exports = function registerConnectionHandlers({ io, socket, webrtcConnections }) {
  
  // Local Orchestration: Clean out reference footprints when a user drops off
  const cleanupUser = (socketId) => {
    const user = ServerState.connectedUsers.get(socketId);
    
    const queueIndex = ServerState.waitingQueue.findIndex(u => u.socketId === socketId);
    if (queueIndex !== -1) {
      ServerState.waitingQueue.splice(queueIndex, 1);
      console.log(`Removed ${socketId.slice(-4)} from queue. Size: ${ServerState.waitingQueue.length}`);
    }
    
    const partnerId = ServerState.activeChats.get(socketId);
    if (partnerId) {
      handlePartnerDisconnect(socketId, partnerId);
    }
    
    for (const [connectionKey, connection] of webrtcConnections.entries()) {
      if (connection.initiator === socketId || connection.receiver === socketId) {
        webrtcConnections.delete(connectionKey);
      }
    }

    if (user?.sessionId) {
      ServerState.userSessions.delete(user.sessionId);
    }
   
    ServerState.connectedUsers.delete(socketId);

    // Structural cleanups for residual state anomalies
    for (const [otherId, otherUser] of ServerState.connectedUsers.entries()) {
      if (otherUser.partnerId === socketId) {
        otherUser.hasPartner = false;
        otherUser.isInQueue = false;
        delete otherUser.partnerId;
      }
    }
    for (const [chatId, partnerId] of ServerState.activeChats.entries()) {
      if (partnerId === socketId) {
        ServerState.activeChats.delete(chatId);
      }
    }

    console.log(`Cleaned user ${socketId.slice(-4)}. Active: ${ServerState.connectedUsers.size}, Queue: ${ServerState.waitingQueue.length}`);

    if (ServerState.waitingQueue.length >= 2) {
      PoolManager.processBatchMatching(io, ServerState, MatchManager);
    }
  };

  const handlePartnerDisconnect = (socketId, partnerId) => {
    const partnerSocket = io.sockets.sockets.get(partnerId);
    const partnerUser = ServerState.connectedUsers.get(partnerId);
    
    if (partnerSocket && partnerUser) {
      console.log(`Notifying ${partnerId.slice(-4)} that partner disconnected`);
      partnerSocket.emit('partner-disconnected');
      
      MatchManager.updateUserStatus(partnerId, null, false, ServerState);
      
      setTimeout(() => {
        autoRequeuePartner(partnerId, partnerUser, partnerSocket);
      }, 1000);
    }
    
    ServerState.activeChats.delete(socketId);
    ServerState.activeChats.delete(partnerId);
  };

  const autoRequeuePartner = (partnerId, partnerUser, partnerSocket) => {
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
      };
      
      const immediateMatch = PoolManager.findImmediateMatch(partnerForQueue, io, ServerState);
      if (immediateMatch) {
        const matchIndex = ServerState.waitingQueue.findIndex(u => u.socketId === immediateMatch.socketId);
        if (matchIndex !== -1) {
          ServerState.waitingQueue.splice(matchIndex, 1);
        }
        MatchManager.create(partnerForQueue, immediateMatch, io, ServerState);
      } else {
        PoolManager.addToPool(partnerForQueue, ServerState);
        const poolStats = PoolManager.getPoolStats(ServerState);
        partnerSocket.emit('queued-for-match', {
          position: ServerState.waitingQueue.length,
          estimatedWait: Math.max(CONFIG.QUEUE.MIN_ESTIMATED_WAIT, ServerState.waitingQueue.length * CONFIG.QUEUE.ESTIMATED_WAIT_PER_POSITION),
          totalInQueue: ServerState.waitingQueue.length,
          reconnected: true,
          poolInfo: {
            bufferSize: poolStats.bufferSize,
            nextBatchIn: CONFIG.POOL.BATCH_MATCHING_INTERVAL / 1000
          }
        });
      }
    }
  };

  const requeueUserImmediate = (targetSocket, targetUser) => {
    if (targetUser.hasPartner || targetUser.isInQueue) return;
    
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
    };
    
    targetUser.isInQueue = true;
    targetUser.hasPartner = false;
    
    const immediateMatch = PoolManager.findImmediateMatch(userForQueue, io, ServerState);
    if (immediateMatch) {
      const matchIndex = ServerState.waitingQueue.findIndex(u => u.socketId === immediateMatch.socketId);
      if (matchIndex !== -1) {
        ServerState.waitingQueue.splice(matchIndex, 1);
      }
      MatchManager.create(userForQueue, immediateMatch, io, ServerState);
    } else {
      PoolManager.addToPool(userForQueue, ServerState);
      const poolStats = PoolManager.getPoolStats(ServerState);
      targetSocket.emit('queued-for-match', {
        position: 1,
        estimatedWait: 5,
        totalInQueue: ServerState.waitingQueue.length,
        skipped: true,
        priority: true,
        poolInfo: {
          bufferSize: poolStats.bufferSize,
          nextBatchIn: 3
        }
      });
    }
  };

  // --- Socket Event Binding Hooks ---

  socket.on('join-anonymous-chat', ({ sessionId, interests = [], chatMode, safeMode = false }) => {
    const existingUser = ServerState.connectedUsers.get(socket.id);
    if (existingUser && (existingUser.isInQueue || existingUser.hasPartner)) return;
    
    const existingSocketId = ServerState.userSessions.get(sessionId);
    if (existingSocketId && existingSocketId !== socket.id) {
      cleanupUser(existingSocketId);
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

  socket.on('skip-partner', () => {
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
        requeueUserImmediate(socket, currentUser);
      }
      if (partnerUser && ServerState.connectedUsers.has(partnerId) && partnerSocket) {
        requeueUserImmediate(partnerSocket, partnerUser);
      }
    }, 100);
  });

  socket.on('heartbeat', () => {
    const user = ServerState.connectedUsers.get(socket.id);
    if (user) user.lastActivity = new Date();
  });

  socket.on('disconnect', (reason) => {
    console.log(`Socket left: ${socket.id}, reason: ${reason}`);
    cleanupUser(socket.id);
  });
};