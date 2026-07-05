const ServerState = require('../state/serverState');
const MessageUtils = require('../utils/messageUtils');

module.exports = function registerChatHandlers({ io, socket }) {
  
  socket.on('anonymous-chat-message', ({ safeMode, message }) => {
    const partnerId = ServerState.activeChats.get(socket.id);
    if (!partnerId) {
      socket.emit('error', { message: 'No active chat partner' });
      return;
    }
    
    const sanitizedMessage = safeMode ? MessageUtils.sanitize(message) : message;
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

  socket.on('typing', ({ typing }) => {
    const partnerId = ServerState.activeChats.get(socket.id);
    if (partnerId) {
      const partnerSocket = io.sockets.sockets.get(partnerId);
      if (partnerSocket) {
        partnerSocket.emit('partner-typing', typing);
      }
    }
  });

  const handleReaction = ({ emoji, to }) => {
    const partnerId = ServerState.activeChats.get(socket.id);
    if (!partnerId) {
      socket.emit('error', { message: 'No active chat partner' });
      return;
    }

    if (to && to !== partnerId) {
      socket.emit('error', { message: 'Invalid reaction target' });
      return;
    }

    const partnerSocket = io.sockets.sockets.get(partnerId);
    if (partnerSocket) {
      partnerSocket.emit('partner-reaction', { emoji });
    }
  };

  socket.on('anonymous-reaction', ({ emoji, to }) => {
    handleReaction({ emoji, to });
  });

  socket.on('send-reaction', ({ emoji, to }) => {
    handleReaction({ emoji, to });
  });
};