import type { ServerStateShape } from '../types'

const ServerState: ServerStateShape = {
  connectedUsers: new Map(),
  waitingQueue: [],
  activeChats: new Map(),
  socketIdLookup: new Map(),
}

export default ServerState
