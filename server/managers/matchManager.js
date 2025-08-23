const MatchingUtils = require('../utils/matchingUtils')

// Match management utilities - functional approach
const MatchManager = {
  create(user1, user2, io, ServerState) {
    // Prevent self-matching at final step
    if (MatchingUtils.preventSelfMatch(user1, user2)) {
      console.log(`❌ CRITICAL: Prevented self-match in createMatch`)
      return false
    }
    
    // Validate both users
    if (!MatchingUtils.isValidUser(user1, io, ServerState) || 
        !MatchingUtils.isValidUser(user2, io, ServerState)) {
      console.log(`❌ Cannot create match - invalid user states`)
      return false
    }
    
    // Set up chat connection
    ServerState.activeChats.set(user1.socketId, user2.socketId)
    ServerState.activeChats.set(user2.socketId, user1.socketId)
    // Ensure user objects have correct partnerId for signaling
    const userObj1 = ServerState.connectedUsers.get(user1.socketId)
    const userObj2 = ServerState.connectedUsers.get(user2.socketId)
    if (userObj1) userObj1.partnerId = user2.socketId
    if (userObj2) userObj2.partnerId = user1.socketId
    
    // Update user status
    this.updateUserStatus(user1.socketId, user2.socketId, true, ServerState)
    this.updateUserStatus(user2.socketId, user1.socketId, true, ServerState)
    
    // Notify both users
    this.notifyUsers(user1, user2, io)
    
    console.log(`💑 Match created: ${user1.socketId.slice(-4)} ↔ ${user2.socketId.slice(-4)}`)
    return true
  },

  updateUserStatus(socketId, partnerId, hasPartner, ServerState) {
    const user = ServerState.connectedUsers.get(socketId)
    if (user) {
      user.hasPartner = hasPartner
      user.isInQueue = !hasPartner
      if (hasPartner) {
        user.partnerId = partnerId
        // Clear skip history when new match is created
        delete user.lastSkipped
        delete user.skipCooldown
      } else {
        delete user.partnerId
      }
    }
  },

  notifyUsers(user1, user2, io) {
    const socket1 = io.sockets.sockets.get(user1.socketId)
    const socket2 = io.sockets.sockets.get(user2.socketId)

    if (socket1) {
      console.log(`[MATCH_NOTIFY] Emitting match to user1: ${user1.socketId}`)
      socket1.emit('anonymous-match-found', {
        partnerId: user2.socketId,
        partnerInterests: user2.interests || [],
        matchScore: MatchingUtils.calculateScore(user1, user2)
      })
    } else {
      console.warn(`[MATCH_NOTIFY] Could not find socket for user1: ${user1.socketId}`)
    }

    if (socket2) {
      console.log(`[MATCH_NOTIFY] Emitting match to user2: ${user2.socketId}`)
      socket2.emit('anonymous-match-found', {
        partnerId: user1.socketId,
        partnerInterests: user1.interests || [],
        matchScore: MatchingUtils.calculateScore(user1, user2)
      })
    } else {
      console.warn(`[MATCH_NOTIFY] Could not find socket for user2: ${user2.socketId}`)
    }
  }
}

module.exports = MatchManager
