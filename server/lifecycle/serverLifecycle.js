const ServerState = require('../state/serverState')
const PoolManager = require('../managers/poolManager')
const { CONFIG } = require('../config/constants')
const { cleanupUser } = require('./cleanup')

const startLifecycle = ({ io, server }) => {
  const timers = []
  let shuttingDown = false

  timers.push(setInterval(() => {
    const now = new Date()
    const timeout = CONFIG.TIMEOUTS.SESSION_TIMEOUT

    for (const [socketId, user] of ServerState.connectedUsers.entries()) {
      if (now - user.lastActivity > timeout) {
        const socket = io.sockets.sockets.get(socketId)
        if (socket) {
          socket.emit('session-expired')
          socket.disconnect(true)
        } else {
          cleanupUser(socketId, io)
        }
      }
    }
  }, CONFIG.TIMEOUTS.CLEANUP_INTERVAL))

  timers.push(setInterval(() => {
    if (ServerState.waitingQueue.length >= 2) {
      PoolManager.processBatchMatching(io, ServerState, require('../managers/matchManager'))
    }
  }, CONFIG.POOL.BATCH_MATCHING_INTERVAL))

  timers.push(setInterval(() => {
    PoolManager.updatePoolPositions(io, ServerState)
  }, CONFIG.TIMEOUTS.POSITION_UPDATE_INTERVAL))

  const stopTimers = () => {
    while (timers.length > 0) {
      clearInterval(timers.pop())
    }
  }

  const shutdown = () => {
    if (shuttingDown) return
    shuttingDown = true

    stopTimers()

    for (const [socketId] of ServerState.connectedUsers.entries()) {
      const socket = io.sockets.sockets.get(socketId)
      if (socket) {
        socket.emit('server-shutdown')
        socket.disconnect(true)
      } else {
        cleanupUser(socketId, io)
      }
    }

    server.close(() => {
      process.exit(0)
    })
  }

  process.once('SIGINT', shutdown)
  process.once('SIGTERM', shutdown)

  return {
    shutdown,
    stopTimers
  }
}

module.exports = { startLifecycle }