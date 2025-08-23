const { MODERATION } = require('../config/constants')

// Matching algorithm utilities
const MatchingUtils = {
  calculateScore: (user1, user2) => {
    const interests1 = user1.interests || []
    const interests2 = user2.interests || []
    
    if (interests1.length === 0 && interests2.length === 0) {
      return Math.random() // Random matching for users with no interests
    }
    
    let commonInterests = 0
    const totalInterests = Math.max(interests1.length, interests2.length)
    
    if (totalInterests === 0) return Math.random()
    
    for (const interest1 of interests1) {
      for (const interest2 of interests2) {
        if (interest1.toLowerCase() === interest2.toLowerCase()) {
          commonInterests += 2 // Exact match
        } else {
          // Check category matches
          for (const [category, keywords] of Object.entries(MODERATION.interestCategories)) {
            if (keywords.includes(interest1.toLowerCase()) && 
                keywords.includes(interest2.toLowerCase())) {
              commonInterests += 1 // Category match
              break
            }
          }
        }
      }
    }
    
    const baseScore = commonInterests / totalInterests
    
    // Add randomization factors to make matching less predictable
    const randomVariance = (Math.random() - 0.5) * 0.3 // ±15% random variance
    const timeVariance = Math.sin(Date.now() / 100000) * 0.1 // Time-based variance
    
    return Math.max(0, Math.min(1, baseScore + randomVariance + timeVariance))
  },

  isValidUser: (user, io, ServerState) => {
    const userData = ServerState.connectedUsers.get(user.socketId)
    
    if (!userData || userData.hasPartner) {
      console.log(`⚠️ Invalid user ${user.socketId?.slice(-4)}: data=${!!userData}, hasPartner=${userData?.hasPartner}`)
      return false
    }
    
    // Only check socket if io is provided (skip when called from cleanInvalid without io)
    if (io) {
      const userSocket = io.sockets.sockets.get(user.socketId)
      if (!userSocket) {
        console.log(`⚠️ Invalid user ${user.socketId?.slice(-4)}: socket=${!!userSocket}`)
        return false
      }
    }
    
    return true
  },

  preventSelfMatch: (user1, user2) => {
    return user1.socketId === user2.socketId || user1.sessionId === user2.sessionId
  },

  shuffleArray: (array) => {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[array[i], array[j]] = [array[j], array[i]]
    }
    return array
  }
}

module.exports = MatchingUtils
