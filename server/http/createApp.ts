import cors from 'cors'
import express from 'express'
import { CONFIG } from '../config/constants'
import PoolManager from '../managers/poolManager'
import ServerState from '../state/serverState'

export const createApp = () => {
  const app = express()
  app.use(cors({ origin: CONFIG.CLIENT_URLS, credentials: true }))
  app.use(express.json())
  app.get('/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString(), connectedUsers: ServerState.connectedUsers.size, waitingInQueue: ServerState.waitingQueue.length, activeChats: ServerState.activeChats.size / 2, uptime: process.uptime() }))
  app.get('/stats', (_req, res) => {
    const poolStats = PoolManager.getPoolStats()
    res.json({ connected: ServerState.connectedUsers.size, queued: ServerState.waitingQueue.length, chatting: ServerState.activeChats.size, activeChatRooms: ServerState.activeChats.size / 2, totalSessions: ServerState.connectedUsers.size, averageWaitTime: ServerState.waitingQueue.length ? Math.max(10, ServerState.waitingQueue.length * 15) : 0, poolSystem: { ...poolStats, poolUtilization: `${poolStats.poolUtilization}%` } })
  })
  app.get('/debug', (_req, res) => {
    if (CONFIG.NODE_ENV === 'production') return res.status(404).json({ error: 'Not found' })
    res.json({ users: [...ServerState.connectedUsers].map(([id, user]) => ({ id, hasPartner: ServerState.activeChats.has(id), isInQueue: ServerState.waitingQueue.includes(id), partnerId: ServerState.activeChats.get(id), interests: user.interests })), queue: ServerState.waitingQueue.map(id => ({ id, interests: ServerState.connectedUsers.get(id)?.interests ?? [] })), chats: [...ServerState.activeChats] })
  })
  return app
}
