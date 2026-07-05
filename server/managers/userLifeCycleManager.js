const ServerState = require('../state/ServerState')
const { QueueManager } = require('./QueueManager')

const cleanupUser = (
  socketId,
  io
) => {
  const user =
    ServerState.connectedUsers.get(
      socketId
    )

  if (!user) return

  handlePartnerDisconnect(
    socketId,
    io
  )

  ServerState.connectedUsers.delete(
    socketId
  )

  ServerState.userSessions.delete(
    user.sessionId
  )

  QueueManager.removeUser(
    socketId
  )
}

const handlePartnerDisconnect = (
  socketId,
  io
) => {
  const partnerId =
    ServerState.activeChats.get(
      socketId
    )

  if (!partnerId) return

  ServerState.activeChats.delete(
    socketId
  )

  ServerState.activeChats.delete(
    partnerId
  )

  const partnerSocket =
    io.sockets.sockets.get(
      partnerId
    )

  if (!partnerSocket) return

  partnerSocket.emit(
    'partner-disconnected'
  )

  autoRequeuePartner(
    partnerId,
    io
  )
}

const autoRequeuePartner = (
  socketId,
  io
) => {
  const user =
    ServerState.connectedUsers.get(
      socketId
    )

  if (
    !user ||
    !io.sockets.sockets.has(socketId)
  ) {
    return
  }

  QueueManager.addUser(
    user
  )

  const position =
    QueueManager.getPosition(
      socketId
    )

  io.to(socketId).emit(
    'queued-for-match',
    {
      position,
      reconnected: true
    }
  )
}

const requeueUser = (
  socketId,
  io,
  skipped = false
) => {
  const user =
    ServerState.connectedUsers.get(
      socketId
    )

  if (
    !user ||
    !io.sockets.sockets.has(socketId)
  ) {
    return
  }

  QueueManager.addUser(
    user
  )

  const position =
    QueueManager.getPosition(
      socketId
    )

  io.to(socketId).emit(
    'queued-for-match',
    {
      position,
      skipped
    }
  )
}

module.exports = {
  cleanupUser,
  handlePartnerDisconnect,
  autoRequeuePartner,
  requeueUser
}