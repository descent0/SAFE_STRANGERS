const ServerState = require('../state/serverState');

module.exports = function registerSignalingHandlers({ io, socket, webrtcConnections }) {
  
  socket.on('offer', ({ offer, to }) => {
    const partnerId = ServerState.activeChats.get(socket.id);
    if (partnerId !== to) {
      socket.emit('webrtc-error', { error: 'Invalid partner for WebRTC offer', code: 'INVALID_PARTNER' });
      return;
    }
    
    if (!offer || !offer.type || !offer.sdp) {
      socket.emit('webrtc-error', { error: 'Invalid offer format', code: 'INVALID_OFFER' });
      return;
    }
    
    const targetSocket = io.sockets.sockets.get(to);
    if (targetSocket) {
      targetSocket.emit('offer', { offer, from: socket.id });
    } else {
      socket.emit('webrtc-error', { error: 'Partner not available', code: 'PARTNER_UNAVAILABLE' });
    }
  });

  socket.on('answer', ({ answer, to }) => {
    const partnerId = ServerState.activeChats.get(socket.id);
    if (partnerId !== to) {
      socket.emit('webrtc-error', { error: 'Invalid partner for WebRTC answer', code: 'INVALID_PARTNER' });
      return;
    }
    
    if (!answer || !answer.type || !answer.sdp) {
      socket.emit('webrtc-error', { error: 'Invalid answer format', code: 'INVALID_ANSWER' });
      return;
    }
    
    const targetSocket = io.sockets.sockets.get(to);
    if (targetSocket) {
      targetSocket.emit('answer', { answer, from: socket.id });
    } else {
      socket.emit('webrtc-error', { error: 'Partner not available', code: 'PARTNER_UNAVAILABLE' });
    }
  });

  socket.on('ice-candidate', ({ candidate, to }) => {
    const partnerId = ServerState.activeChats.get(socket.id);
    if (partnerId !== to) return; // Silently ignore legacy drops
    
    if (!candidate || typeof candidate.candidate !== 'string') return;
    
    const targetSocket = io.sockets.sockets.get(to);
    if (targetSocket) {
      targetSocket.emit('ice-candidate', { candidate, from: socket.id });
    }
  });

  socket.on('webrtc-connection-state', ({ partnerId, state }) => {
    const connectionKey = [socket.id, partnerId].sort().join('-');
    webrtcConnections.set(connectionKey, {
      initiator: socket.id,
      receiver: partnerId,
      state: state,
      timestamp: Date.now()
    });
    
    if (state === 'failed' || state === 'disconnected') {
      const partnerSocket = io.sockets.sockets.get(partnerId);
      if (partnerSocket) {
        partnerSocket.emit('webrtc-connection-failed', { from: socket.id });
      }
      socket.emit('webrtc-connection-failed', { from: partnerId });
    }
  });
};