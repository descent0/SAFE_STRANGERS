const ServerState = require('../state/serverState')
const MessageUtils = require('../utils/messageUtils')

module.exports = function registerChatHandlers({ io, socket }) {
  const getCurrentUser = () => ServerState.connectedUsers.get(socket.id)

  const assertSessionOwnership = (sessionId, eventName) => {
    const currentUser = getCurrentUser()

    if (!currentUser?.sessionId || !sessionId || currentUser.sessionId !== sessionId) {
      socket.emit('error', { message: `Invalid session for ${eventName}` })
      return false
    }

    return true
  }

  socket.on('anonymous-chat-message', ({ sessionId, message }) => {
    if (!assertSessionOwnership(sessionId, 'anonymous-chat-message')) {
      return
    }

    const partnerId = ServerState.activeChats.get(socket.id);
    if (!partnerId) {
      socket.emit('error', { message: 'No active chat partner' });
      return;
    }
    
    const currentUser = getCurrentUser()
    const sanitizedMessage = currentUser?.safeMode ? MessageUtils.sanitize(message) : message;
    if (sanitizedMessage === null) {
      socket.emit('message-blocked', { reason: 'Message contains inappropriate content' });
      return;
    }
    
    if (!sanitizedMessage || sanitizedMessage.length === 0) return;
    
    const messageData = {
      message: sanitizedMessage,
      timestamp: new Date().toISOString(),
      from: socket.id
    };
    
    const partnerSocket = io.sockets.sockets.get(partnerId);
    if (partnerSocket) {
      partnerSocket.emit('anonymous-chat-message', messageData);
    }
    
    const user = ServerState.connectedUsers.get(socket.id);
    if (user) user.lastActivity = new Date();
  });

  socket.on('typing', ({ sessionId, typing }) => {
    if (!assertSessionOwnership(sessionId, 'typing')) {
      return
    }

    const partnerId = ServerState.activeChats.get(socket.id);
    if (partnerId) {
      const partnerSocket = io.sockets.sockets.get(partnerId);
      if (partnerSocket) {
        partnerSocket.emit('partner-typing', typing);
      }
    }
  });
};