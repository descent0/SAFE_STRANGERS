const express = require('express')
const cors = require('cors')

const { CONFIG } = require('../config/constants')
const ServerState = require('../state/serverState')
const PoolManager = require('../managers/poolManager')

const createApp = () => {
  const app = express()

  app.use(
    cors({
      origin: CONFIG.CLIENT_URLS,
      credentials: true
    })
  )
  app.use(express.json())

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
        poolUtilization: `${poolStats.poolUtilization}%`
      }
    })
  })

  app.get('/debug', (req, res) => {
    if (CONFIG.NODE_ENV === 'production') {
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
      queue: ServerState.waitingQueue.map(user => ({ id: user.socketId, interests: user.interests })),
      chats: Array.from(ServerState.activeChats.entries()),
    })
  })

  return app
}

module.exports = { createApp }