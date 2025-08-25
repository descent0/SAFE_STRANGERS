require('dotenv').config();
const express = require('express')
const http = require('http')
const socketIo = require('socket.io')
const cors = require('cors')

// Import configuration and state
const { CONFIG } = require('./config/constants')
const ServerState = require('./state/serverState')

// Import utilities
const MatchManager = require('./managers/matchManager')
const PoolManager = require('./managers/poolManager')
const MessageUtils = require('./utils/messageUtils')

// Initialize Express app and server
const app = express()
const server = http.createServer(app)

// CORS configuration
const corsOptions = {
  origin: CONFIG.CLIENT_URLS,
  credentials: true
}

app.use(cors(corsOptions))
app.use(express.json())

// Initialize Socket.IO
const io = socketIo(server, {
  cors: {
    origin: CONFIG.CLIENT_URLS,
    methods: ['GET', 'POST'],
    credentials: true
  },
  transports: ['websocket', 'polling']
})

// WebRTC connection tracking
const webrtcConnections = new Map()

// Cleanup utility functions
const cleanupUser = (socketId) => {
  const user = ServerState.connectedUsers.get(socketId)
  
  // Remove from queue - using PoolManager for consistency
  const queueIndex = ServerState.waitingQueue.findIndex(u => u.socketId === socketId)
  if (queueIndex !== -1) {
    ServerState.waitingQueue.splice(queueIndex, 1)
    console.log(`Removed ${socketId.slice(-4)} from queue. Size: ${ServerState.waitingQueue.length}`)
  }
  
  // Handle active chat cleanup
  const partnerId = ServerState.activeChats.get(socketId)
  if (partnerId) {
    handlePartnerDisconnect(socketId, partnerId)
  }
  
  // Clean up WebRTC connection tracking
  for (const [connectionKey, connection] of webrtcConnections.entries()) {
    if (connection.initiator === socketId || connection.receiver === socketId) {
      webrtcConnections.delete(connectionKey)
    }
  }
  
  // Remove from session mapping
  if (user?.sessionId) {
    ServerState.userSessions.delete(user.sessionId)
  }
  
  // Remove from connected users
  ServerState.connectedUsers.delete(socketId)

  // Extra cleanup: Remove any references to this user as a partner
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

  console.log(`Cleaned up user ${socketId.slice(-4)}. Active: ${ServerState.connectedUsers.size}, Queue: ${ServerState.waitingQueue.length}, Chats: ${ServerState.activeChats.size}`)

  // Trigger pool-based matching after cleanup (no delay needed)
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
    
    // Reset partner's status and auto-requeue
    MatchManager.updateUserStatus(partnerId, null, false, ServerState)
    
    setTimeout(() => {
      autoRequeuePartner(partnerId, partnerUser, partnerSocket)
    }, 1000)
  }
  
  // Clean up both sides of chat
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
      fromDisconnect: true  // Mark as disconnect scenario for priority
    }
    
    // Try immediate match first (disconnect gets priority)
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

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log(`New connection: ${socket.id}`)
  
  // Store basic connection info
  ServerState.connectedUsers.set(socket.id, {
    socketId: socket.id,
    connectedAt: new Date(),
    lastActivity: new Date(),
    isInQueue: false,
    hasPartner: false
  })

  // Join anonymous chat
  socket.on('join-anonymous-chat', ({ sessionId, interests = [], chatMode, safeMode = false }) => {
    console.log(`${socket.id} joining anonymous chat:`, { sessionId, interests, safeMode })
    
    // Check if user is already in queue or has a partner
    const existingUser = ServerState.connectedUsers.get(socket.id)
    if (existingUser && (existingUser.isInQueue || existingUser.hasPartner)) {
      console.log(`${socket.id} already in queue or has partner, ignoring duplicate join request`)
      return
    }
    
    // Check if this session is already connected from another socket
    const existingSocketId = ServerState.userSessions.get(sessionId)
    if (existingSocketId && existingSocketId !== socket.id) {
      console.log(`Session ${sessionId} already connected from ${existingSocketId}, removing old connection`)
      cleanupUser(existingSocketId)
    }
    
    // Update user info
    const user = {
      socketId: socket.id,
      sessionId,
      interests,
      chatMode,
      safeMode,
      joinedAt: new Date(),
      isInQueue: true,
      hasPartner: false
    }
    
    ServerState.connectedUsers.set(socket.id, user)
    ServerState.userSessions.set(sessionId, socket.id)
    
    // Try immediate match only if queue is small enough
    if (PoolManager.shouldDoImmediateMatch(ServerState.waitingQueue.length)) {
      const match = PoolManager.findImmediateMatch(user, io, ServerState)
      
      if (match) {
        // Remove matched user from queue
        const matchIndex = ServerState.waitingQueue.findIndex(u => u.socketId === match.socketId)
        if (matchIndex !== -1) {
          ServerState.waitingQueue.splice(matchIndex, 1)
        }
        
        console.log(`Immediate match found! ${socket.id} <-> ${match.socketId}`)
        
        // Create the chat connection
        MatchManager.create(user, match, io, ServerState)
        return
      }
    }
    
    // Add to pool-based queue
    PoolManager.addToPool(user, ServerState)
    const queuePosition = ServerState.waitingQueue.length
    
    console.log(`${socket.id} added to pool. Position: ${queuePosition}/${ServerState.waitingQueue.length}`)
    
    const poolStats = PoolManager.getPoolStats(ServerState)
    socket.emit('queued-for-match', {
      position: queuePosition,
      estimatedWait: Math.max(10, queuePosition * 15),
      totalInQueue: ServerState.waitingQueue.length,
      poolInfo: {
        bufferSize: poolStats.bufferSize,
        nextBatchIn: CONFIG.POOL.BATCH_MATCHING_INTERVAL / 1000
      }
    })
  })

  // Handle chat messages
  socket.on('anonymous-chat-message', ({ sessionId, message }) => {
    const partnerId = ServerState.activeChats.get(socket.id)
    
    if (!partnerId) {
      socket.emit('error', { message: 'No active chat partner' })
      return
    }
    
    const sanitizedMessage = MessageUtils.sanitize(message)
    if (sanitizedMessage === null) {
      socket.emit('message-blocked', { 
        reason: 'Message contains inappropriate content' 
      })
      return
    }
    
    if (!sanitizedMessage || sanitizedMessage.length === 0) {
      return
    }
    
    const messageData = {
      message: sanitizedMessage,
      timestamp: new Date().toISOString(),
      from: socket.id
    }
    
    console.log(`Message: ${socket.id} -> ${partnerId}: "${sanitizedMessage}"`)
    
    // Send to partner
    const partnerSocket = io.sockets.sockets.get(partnerId)
    if (partnerSocket) {
      partnerSocket.emit('anonymous-chat-message', messageData)
    }
    
    // Update last activity
    const user = ServerState.connectedUsers.get(socket.id)
    if (user) {
      user.lastActivity = new Date()
    }
  })

  // Handle typing indicators
  socket.on('typing', ({ sessionId, typing }) => {
    const partnerId = ServerState.activeChats.get(socket.id)
    if (partnerId) {
      const partnerSocket = io.sockets.sockets.get(partnerId)
      if (partnerSocket) {
        partnerSocket.emit('partner-typing', typing)
      }
    }
  })

  // Handle reactions
  socket.on('anonymous-reaction', ({ sessionId, emoji }) => {
    const partnerId = ServerState.activeChats.get(socket.id)
    if (partnerId) {
      console.log(`Reaction: ${socket.id} -> ${partnerId}: ${emoji}`)
      const partnerSocket = io.sockets.sockets.get(partnerId)
      if (partnerSocket) {
        partnerSocket.emit('partner-reaction', { emoji })
      }
    }
  })

  // FIXED: Better partner skip handling
  socket.on('skip-partner', ({ sessionId }) => {
    const partnerId = ServerState.activeChats.get(socket.id)
    
    if (!partnerId) {
      console.log(`${socket.id} tried to skip but has no partner`)
      socket.emit('error', { message: 'No active partner to skip' })
      return
    }
    
    console.log(`${socket.id} skipping partner ${partnerId}`)
    
    // Get both users' data
    const currentUser = ServerState.connectedUsers.get(socket.id)
    const partnerUser = ServerState.connectedUsers.get(partnerId)
    const partnerSocket = io.sockets.sockets.get(partnerId)
    
    // Clean up the active chat FIRST to prevent race conditions
    ServerState.activeChats.delete(socket.id)
    ServerState.activeChats.delete(partnerId)
    
    // Reset both users' status
    if (currentUser) {
      currentUser.isInQueue = false
      currentUser.hasPartner = false
      delete currentUser.partnerId
      currentUser.lastSkipped = partnerId
    }
    
    if (partnerUser) {
      partnerUser.isInQueue = false
      partnerUser.hasPartner = false
      delete partnerUser.partnerId
      partnerUser.lastSkipped = socket.id
    }
    
    // Notify partner FIRST, then skipper to prevent race condition
    if (partnerSocket) {
      partnerSocket.emit('partner-disconnected')
      console.log(`Notified ${partnerId.slice(-4)} of skip by ${socket.id.slice(-4)}`)
    }
    
    // Small delay before notifying skipper to prevent race condition
    setTimeout(() => {
      socket.emit('partner-disconnected')
      console.log(`Notified ${socket.id.slice(-4)} that skip is complete`)
      
      // Then requeue both users
      if (currentUser && ServerState.connectedUsers.has(socket.id)) {
        requeueUserImmediate(socket, currentUser, true)
      }
      
      if (partnerUser && ServerState.connectedUsers.has(partnerId) && partnerSocket) {
        requeueUserImmediate(partnerSocket, partnerUser, true)
      }
    }, 100)
  })

  // FIXED: Better WebRTC signaling with validation
  socket.on('offer', ({ offer, to }) => {
    console.log(`WebRTC offer: ${socket.id} -> ${to}`)
    
    // Validate the connection
    const partnerId = ServerState.activeChats.get(socket.id)
    if (partnerId !== to) {
      console.log(`Offer rejected: ${to} is not the current partner of ${socket.id}`)
      socket.emit('webrtc-error', { 
        error: 'Invalid partner for WebRTC offer',
        code: 'INVALID_PARTNER' 
      })
      return
    }
    
    // Validate offer structure
    if (!offer || !offer.type || !offer.sdp) {
      console.log(`Invalid offer structure from ${socket.id}`)
      socket.emit('webrtc-error', { 
        error: 'Invalid offer format',
        code: 'INVALID_OFFER' 
      })
      return
    }
    
    const targetSocket = io.sockets.sockets.get(to)
    if (targetSocket) {
      targetSocket.emit('offer', { offer, from: socket.id })
      console.log(`Successfully forwarded offer from ${socket.id} to ${to}`)
    } else {
      console.log(`Target socket ${to} not found for offer`)
      socket.emit('webrtc-error', { 
        error: 'Partner not available',
        code: 'PARTNER_UNAVAILABLE' 
      })
    }
  })

  socket.on('answer', ({ answer, to }) => {
    console.log(`WebRTC answer: ${socket.id} -> ${to}`)
    
    const partnerId = ServerState.activeChats.get(socket.id)
    if (partnerId !== to) {
      console.log(`Answer rejected: ${to} is not the current partner of ${socket.id}`)
      socket.emit('webrtc-error', { 
        error: 'Invalid partner for WebRTC answer',
        code: 'INVALID_PARTNER' 
      })
      return
    }
    
    // Validate answer structure
    if (!answer || !answer.type || !answer.sdp) {
      console.log(`Invalid answer structure from ${socket.id}`)
      socket.emit('webrtc-error', { 
        error: 'Invalid answer format',
        code: 'INVALID_ANSWER' 
      })
      return
    }
    
    const targetSocket = io.sockets.sockets.get(to)
    if (targetSocket) {
      targetSocket.emit('answer', { answer, from: socket.id })
      console.log(`Successfully forwarded answer from ${socket.id} to ${to}`)
    } else {
      console.log(`Target socket ${to} not found for answer`)
      socket.emit('webrtc-error', { 
        error: 'Partner not available',
        code: 'PARTNER_UNAVAILABLE' 
      })
    }
  })

  socket.on('ice-candidate', ({ candidate, to }) => {
    console.log(`ICE candidate: ${socket.id} -> ${to}`)
    
    const partnerId = ServerState.activeChats.get(socket.id)
    if (partnerId !== to) {
      console.log(`ICE candidate rejected: ${to} is not the current partner of ${socket.id}`)
      return // Silently ignore invalid ICE candidates as they're frequent
    }
    
    // Validate candidate structure
    if (!candidate || typeof candidate.candidate !== 'string') {
      console.log(`Invalid ICE candidate structure from ${socket.id}`)
      return // Silently ignore invalid candidates
    }
    
    const targetSocket = io.sockets.sockets.get(to)
    if (targetSocket) {
      targetSocket.emit('ice-candidate', { candidate, from: socket.id })
    } else {
      console.log(`Target socket ${to} not found for ICE candidate`)
    }
  })

  // WebRTC connection state tracking
  socket.on('webrtc-connection-state', ({ partnerId, state }) => {
    console.log(`WebRTC state update: ${socket.id} -> ${partnerId}: ${state}`)
    
    const connectionKey = [socket.id, partnerId].sort().join('-')
    webrtcConnections.set(connectionKey, {
      initiator: socket.id,
      receiver: partnerId,
      state: state,
      timestamp: Date.now()
    })
    
    // If connection failed, notify both parties
    if (state === 'failed' || state === 'disconnected') {
      const partnerSocket = io.sockets.sockets.get(partnerId)
      if (partnerSocket) {
        partnerSocket.emit('webrtc-connection-failed', { from: socket.id })
      }
      socket.emit('webrtc-connection-failed', { from: partnerId })
    }
  })

  // Handle disconnect
  socket.on('disconnect', (reason) => {
    console.log(`User disconnected: ${socket.id}, reason: ${reason}`)
    cleanupUser(socket.id)
  })

  // Heartbeat
  socket.on('heartbeat', () => {
    const user = ServerState.connectedUsers.get(socket.id)
    if (user) {
      user.lastActivity = new Date()
    }
  })
})

// Helper function for immediate requeue (skip scenarios) - Pool-based
const requeueUserImmediate = (socket, user, skipped = false) => {
  console.log(`Immediate requeue for skip: ${socket.id}`)
  
  // Validate user state before requeuing
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
    fromSkip: true  // Mark as skip scenario for priority
  }
  
  // Update user status
  user.isInQueue = true
  user.hasPartner = false
  
  // Try immediate match first (high priority for skip scenarios)
  const immediateMatch = PoolManager.findImmediateMatch(userForQueue, io, ServerState)
  if (immediateMatch) {
    // Remove matched user from queue
    const matchIndex = ServerState.waitingQueue.findIndex(u => u.socketId === immediateMatch.socketId)
    if (matchIndex !== -1) {
      ServerState.waitingQueue.splice(matchIndex, 1)
    }
    
    console.log(`Immediate skip match: ${socket.id} <-> ${immediateMatch.socketId}`)
    MatchManager.create(userForQueue, immediateMatch, io, ServerState)
  } else {
    // Add to priority pool
    PoolManager.addToPool(userForQueue, ServerState)
    
    const poolStats = PoolManager.getPoolStats(ServerState)
    socket.emit('queued-for-match', {
      position: 1, // Priority position for skip users
      estimatedWait: 5, // Lower wait time for skip scenarios
      totalInQueue: ServerState.waitingQueue.length,
      skipped: true,
      priority: true,
      poolInfo: {
        bufferSize: poolStats.bufferSize,
        nextBatchIn: Math.min(CONFIG.POOL.BATCH_MATCHING_INTERVAL / 1000, 3) // Faster for skips
      }
    })
  }
}

// HTTP Routes
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    connectedUsers: ServerState.connectedUsers.size,
    waitingInQueue: ServerState.waitingQueue.length,
    activeChats: ServerState.activeChats.size / 2,
    uptime: process.uptime()
  })
})

app.get('/stats', (req, res) => {
  const queuedUsers = ServerState.waitingQueue.length
  const chattingUsers = ServerState.activeChats.size
  const connectedCount = ServerState.connectedUsers.size
  const poolStats = PoolManager.getPoolStats(ServerState)
  
  res.json({
    connected: connectedCount,
    queued: queuedUsers,
    chatting: chattingUsers,
    activeChatRooms: chattingUsers / 2,
    totalSessions: connectedCount,
    averageWaitTime: queuedUsers > 0 ? Math.max(10, queuedUsers * 15) : 0,
    poolSystem: {
      bufferSize: poolStats.bufferSize,
      matchableUsers: poolStats.matchableUsers,
      availableMatches: poolStats.availableMatches,
      poolUtilization: poolStats.poolUtilization + '%'
    }
  })
})

app.get('/debug', (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ error: 'Not found' })
  }
  
  const users = Array.from(ServerState.connectedUsers.entries()).map(([id, user]) => ({
    id,
    hasPartner: user.hasPartner,
    isInQueue: user.isInQueue,
    partnerId: user.partnerId,
    interests: user.interests
  }))
  
  res.json({
    users,
    queue: ServerState.waitingQueue.map(u => ({ id: u.socketId, interests: u.interests })),
    chats: Array.from(ServerState.activeChats.entries()),
    webrtcConnections: Array.from(webrtcConnections.entries())
  })
})

// Periodic cleanup of inactive sessions
setInterval(() => {
  const now = new Date()
  const timeout = CONFIG.TIMEOUTS.SESSION_TIMEOUT
  
  for (const [socketId, user] of ServerState.connectedUsers) {
    if (now - user.lastActivity > timeout) {
      console.log(`Cleaning up inactive user: ${socketId}`)
      
      const socket = io.sockets.sockets.get(socketId)
      if (socket) {
        socket.emit('session-expired')
        socket.disconnect(true)
      }
      
      cleanupUser(socketId)
    }
  }
  
  console.log(`Cleanup complete. Active: ${ServerState.connectedUsers.size}, Queue: ${ServerState.waitingQueue.length}, Chats: ${ServerState.activeChats.size}`)
}, CONFIG.TIMEOUTS.CLEANUP_INTERVAL)

// Pool-based batch matching process
setInterval(() => {
  if (ServerState.waitingQueue.length >= 2) {
    const poolStats = PoolManager.getPoolStats(ServerState)
    console.log(`Pool batch matching: ${ServerState.waitingQueue.length} users, ${poolStats.availableMatches} potential matches`)
    
    // Process batch matching with pool strategy
    const matchesMade = PoolManager.processBatchMatching(io, ServerState, MatchManager)
    
    if (matchesMade > 0) {
      console.log(`Pool batch complete: ${matchesMade} matches made`)
    }
  } else if (ServerState.waitingQueue.length === 1) {
    console.log(`One user waiting in pool: ${ServerState.waitingQueue[0].socketId.slice(-4)}`)
  }
}, CONFIG.POOL.BATCH_MATCHING_INTERVAL)

// Update pool positions every 10 seconds
setInterval(() => {
  PoolManager.updatePoolPositions(io, ServerState)
}, CONFIG.TIMEOUTS.POSITION_UPDATE_INTERVAL)

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down server...')
  
  // Notify all connected users
  for (const [socketId] of ServerState.connectedUsers) {
    const socket = io.sockets.sockets.get(socketId)
    if (socket) {
      socket.emit('server-shutdown')
      socket.disconnect(true)
    }
  }
  
  server.close(() => {
    console.log('Server closed')
    process.exit(0)
  })
})

// Start the server
server.listen(CONFIG.PORT, () => {
  console.log(`Omegle-like Socket Server running on port ${CONFIG.PORT}`)
  console.log(`Environment: ${CONFIG.NODE_ENV}`)
  console.log(`Health check: http://localhost:${CONFIG.PORT}/health`)
  console.log(`Stats: http://localhost:${CONFIG.PORT}/stats`)
  if (CONFIG.NODE_ENV !== 'production') {
    console.log(`Debug: http://localhost:${CONFIG.PORT}/debug`)
  }
})

module.exports = { app, server, io }