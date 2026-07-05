const socketIo = require('socket.io');
const { CONFIG } = require('../config/constants');
const ServerState = require('../state/serverState');

// Import your sub-feature handlers
const registerConnectionHandlers = require('./connectionHandlers');
const registerChatHandlers = require('./chatHandlers');
const registerSignalingHandlers = require('./signalingHandlers');

let ioInstance = null;
const webrtcConnections = new Map();

function initSocketServer(server) {
  if (ioInstance) {
    console.warn('Socket.IO server instance already exists. Returning current singleton.');
    return ioInstance;
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
    console.log(`New connection: ${socket.id}`);
    
    // Create base identity document in ServerState
    ServerState.connectedUsers.set(socket.id, {
      socketId: socket.id,
      connectedAt: new Date(),
      lastActivity: new Date(),
      isInQueue: false,
      hasPartner: false
    });

    // Share common scope contextual properties with feature sets
    const context = { io, socket, webrtcConnections };

    // Register handlers cleanly
    registerConnectionHandlers(context);
    registerChatHandlers(context);
    registerSignalingHandlers(context);
  });

  ioInstance = io;
  return io;
}

/**
 * Retrieves the global running instance of the Socket Server.
 * @returns {socketIo.Server}
 */
function getIO() {
  if (!ioInstance) {
    throw new Error('Socket.IO has not been initialized. Call initSocketServer(server) first.');
  }
  return ioInstance;
}

module.exports = {
  initSocketServer,
  getIO,
  webrtcConnections // Exported so background cleanups can clear WebRTC memory maps
};