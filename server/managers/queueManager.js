const ServerState = require('../state/ServerState')

const addUser = user => {
  if (!user) return

  const exists =
    ServerState.waitingQueue.some(
      queuedUser =>
        queuedUser.socketId ===
        user.socketId
    )

  if (!exists) {
    ServerState.waitingQueue.push(user)
  }
}

const removeUser = socketId => {
  const index =
    ServerState.waitingQueue.findIndex(
      user =>
        user.socketId === socketId
    )

  if (index !== -1) {
    ServerState.waitingQueue.splice(
      index,
      1
    )
  }
}

const hasUser = socketId => {
  return ServerState.waitingQueue.some(
    user =>
      user.socketId === socketId
  )
}

const getPosition = socketId => {
  const index =
    ServerState.waitingQueue.findIndex(
      user =>
        user.socketId === socketId
    )

  return index === -1
    ? null
    : index + 1
}

const getNextUser = () => {
  return (
    ServerState.waitingQueue.shift() ||
    null
  )
}

const peek = () => {
  return (
    ServerState.waitingQueue[0] ||
    null
  )
}

const size = () => {
  return ServerState.waitingQueue.length
}

const isEmpty = () => {
  return (
    ServerState.waitingQueue.length ===
    0
  )
}

const clear = () => {
  ServerState.waitingQueue.length = 0
}

const getQueue = () => {
  return ServerState.waitingQueue
}

module.exports = {
  addUser,
  removeUser,
  hasUser,
  getPosition,
  getNextUser,
  peek,
  size,
  isEmpty,
  clear,
  getQueue
}