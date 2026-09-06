import type { Server as SocketServer } from 'socket.io'
import { CONFIG } from '../config/constants'
import PoolManager from '../managers/poolManager'
import ServerState from '../state/serverState'
import type { LifecycleContext } from '../types'

export const startLifecycle = ({ io, server }: LifecycleContext) => {
  const timers: NodeJS.Timeout[] = []
  let shuttingDown = false
  timers.push(setInterval(() => {
    const now = new Date()
    for (const [sessionId, user] of ServerState.connectedUsers) {
      if (now.getTime() - user.lastActivity.getTime() <= CONFIG.TIMEOUTS.SESSION_TIMEOUT) continue
      const socketId = ServerState.socketIdLookup.get(sessionId)
      const socket = io.sockets.sockets.get(socketId ?? '')
      if (socket) { socket.emit('session-expired'); socket.disconnect(true) } else ServerState.connectedUsers.delete(sessionId)
    }
  }, CONFIG.TIMEOUTS.CLEANUP_INTERVAL))
  timers.push(setInterval(() => { if (ServerState.waitingQueue.length >= 2) PoolManager.processBatchMatching(io) }, CONFIG.POOL.BATCH_MATCHING_INTERVAL))
  const stopTimers = () => { while (timers.length) clearInterval(timers.pop()) }
  const shutdown = () => {
    if (shuttingDown) return
    shuttingDown = true; stopTimers()
    for (const [sessionId] of ServerState.connectedUsers) {
      const socket = io.sockets.sockets.get(ServerState.socketIdLookup.get(sessionId) ?? '')
      if (socket) socket.disconnect(true); else {
        ServerState.connectedUsers.delete(sessionId)
        ServerState.socketIdLookup.delete(sessionId)
        ServerState.waitingQueue = ServerState.waitingQueue.filter(id => id !== sessionId)
      }
    }
    server.close(() => process.exit(0))
  }
  process.once('SIGINT', shutdown); process.once('SIGTERM', shutdown)
  return { shutdown, stopTimers }
}
