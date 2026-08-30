const socketIo = require('socket.io')
const { CONFIG } = require('../config/constants')
const ServerState = require('../state/serverState')
const registerConnectionHandlers = require('./connectionHandler')
const registerChatHandlers = require('./chatHandler')
const registerSignalingHandlers = require('./signalingHandler')

let ioInstance = null;

function initSocketServer(server) {
  if (ioInstance) {
    console.warn('Socket.IO server instance already exists. Returning current singleton.')
    return ioInstance
  }

  const io = socketIo(server, {
    cors: {
      origin: CONFIG.CLIENT_URLS,
      methods: ['GET', 'POST'],
      credentials: true
    },
    transports: ['websocket', 'polling']
  });

  io.on('connection', (socket) => {
    ServerState.connectedUsers.set(socket.id, {
      socketId: socket.id,
      connectedAt: new Date(),
      lastActivity: new Date(),
    })

    const context = { io, socket }

    registerConnectionHandlers(context)
    registerChatHandlers(context)
    registerSignalingHandlers(context)
  })

  ioInstance = io
  return io
}

/**
 * Retrieves the global running instance of the Socket Server.
 * @returns {socketIo.Server}
 */
function getIO() {
  if (!ioInstance) {
    throw new Error('Socket.IO has not been initialized. Call initSocketServer(server) first.')
  }
  return ioInstance
}

module.exports = {
  initSocketServer,
  getIO,
}