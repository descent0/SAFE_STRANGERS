// Data structures for managing connections and matches
const ServerState = {
  connectedUsers: new Map(),      // socketId -> user info
  waitingQueue: [],               // Array of users waiting for match
  activeChats: new Map(),         // socketId -> partnerId mapping
  userSessions: new Map(),        // sessionId -> socketId mapping
}

module.exports = ServerState
