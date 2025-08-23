const { CONFIG } = require('../config/constants')
const MatchingUtils = require('../utils/matchingUtils')

// Simplified Pool-based matching system - keep only essential buffer logic
const PoolManager = {
  // Simple buffer calculation
  getBufferSize(queueLength) {
    if (queueLength < 8) return 3
    return Math.min(Math.ceil(queueLength * 0.2), 15)
  },

  // Quick check for immediate matching
  shouldDoImmediateMatch(queueLength) {
    return queueLength < 8
  },

  // Find immediate match for priority scenarios with interest consideration
  findImmediateMatch(user, io, ServerState) {
    const candidates = []
    
    for (const waitingUser of ServerState.waitingQueue) {
      if (this.areCompatible(user, waitingUser) && 
          MatchingUtils.isValidUser(waitingUser, io, ServerState)) {
        const score = this.calculateInterestScore(user, waitingUser)
        candidates.push({ user: waitingUser, score })
      }
    }
    
    if (candidates.length === 0) return null
    
    // Sort by interest score and pick the best match
    candidates.sort((a, b) => b.score - a.score)
    
    // Add some randomness to prevent always picking the same "best" match
    const topCandidates = candidates.slice(0, Math.min(3, candidates.length))
    const randomIndex = Math.floor(Math.random() * topCandidates.length)
    
    return topCandidates[randomIndex].user
  },

  // Compatibility check with interest matching
  areCompatible(user1, user2) {
    // Prevent self-matching
    if (user1.socketId === user2.socketId || user1.sessionId === user2.sessionId) {
      return false
    }

    // Check recently skipped
    if (user1.lastSkipped === user2.socketId || user2.lastSkipped === user1.socketId) {
      return false
    }

    // Safe mode compatibility
    if (user1.safeMode !== user2.safeMode) {
      return false
    }

    // Chat mode compatibility (e.g., video vs text)
    if (user1.chatMode !== user2.chatMode) {
      return false
    }

    return true
  },

  // Calculate interest compatibility score
  calculateInterestScore(user1, user2) {
    const interests1 = user1.interests || []
    const interests2 = user2.interests || []
    
    if (interests1.length === 0 && interests2.length === 0) {
      return 0.5 // Neutral score for users with no interests
    }
    
    if (interests1.length === 0 || interests2.length === 0) {
      return 0.3 // Lower score when one user has no interests
    }
    
    let commonInterests = 0
    const totalInterests = Math.max(interests1.length, interests2.length)
    
    // Count exact matches and similar interests
    for (const interest1 of interests1) {
      for (const interest2 of interests2) {
        if (interest1.toLowerCase() === interest2.toLowerCase()) {
          commonInterests += 2 // Exact match bonus
        } else if (this.areSimilarInterests(interest1, interest2)) {
          commonInterests += 1 // Similar interest
        }
      }
    }
    
    return Math.min(1, commonInterests / totalInterests)
  },

  // Check if interests are in similar categories
  areSimilarInterests(interest1, interest2) {
    const categories = {
      'gaming': ['gaming', 'games', 'xbox', 'playstation', 'pc', 'nintendo', 'steam', 'esports'],
      'music': ['music', 'songs', 'bands', 'concerts', 'instruments', 'spotify', 'singing'],
      'movies': ['movies', 'films', 'cinema', 'netflix', 'series', 'tv', 'shows'],
      'sports': ['sports', 'football', 'basketball', 'soccer', 'tennis', 'hockey', 'gym'],
      'technology': ['tech', 'programming', 'coding', 'computers', 'ai', 'software'],
      'art': ['art', 'drawing', 'painting', 'design', 'photography', 'creative'],
      'books': ['books', 'reading', 'novels', 'literature', 'writing', 'poetry'],
      'travel': ['travel', 'vacation', 'countries', 'culture', 'adventure', 'explore']
    }
    
    const i1 = interest1.toLowerCase()
    const i2 = interest2.toLowerCase()
    
    for (const keywords of Object.values(categories)) {
      if (keywords.includes(i1) && keywords.includes(i2)) {
        return true
      }
    }
    
    return false
  },

  // Add user to queue with priority handling
  addToPool(user, ServerState) {
    if (user.fromSkip || user.fromDisconnect) {
      ServerState.waitingQueue.unshift(user) // Priority to front
    } else {
      ServerState.waitingQueue.push(user) // Normal to back
    }
  },

  // Improved batch matching with interest-based pairing
  processBatchMatching(io, ServerState, matchManager) {
    const queueLength = ServerState.waitingQueue.length
    const bufferSize = this.getBufferSize(queueLength)
    const matchableCount = Math.max(0, queueLength - bufferSize)
    
    if (matchableCount < 2) return 0

    const matchableUsers = ServerState.waitingQueue.slice(0, matchableCount)
    const matched = new Set()
    let matchCount = 0

    // Create interest-based pairs
    for (let i = 0; i < matchableUsers.length; i++) {
      const user1 = matchableUsers[i]
      if (matched.has(user1.socketId)) continue
      
      let bestMatch = null
      let bestScore = -1
      
      // Find best match for this user
      for (let j = i + 1; j < matchableUsers.length; j++) {
        const user2 = matchableUsers[j]
        if (matched.has(user2.socketId)) continue
        
        if (this.areCompatible(user1, user2) && 
            MatchingUtils.isValidUser(user1, io, ServerState) && 
            MatchingUtils.isValidUser(user2, io, ServerState)) {
          
          const score = this.calculateInterestScore(user1, user2)
          if (score > bestScore) {
            bestScore = score
            bestMatch = user2
          }
        }
      }
      
      // Create the match if we found a compatible partner
      if (bestMatch) {
        matched.add(user1.socketId)
        matched.add(bestMatch.socketId)
        matchManager.create(user1, bestMatch, io, ServerState)
        matchCount++
        
        console.log(`🎯 Interest match: ${user1.socketId.slice(-4)} ↔ ${bestMatch.socketId.slice(-4)} (score: ${bestScore.toFixed(2)})`)
      }
    }

    // Remove matched users
    for (let i = ServerState.waitingQueue.length - 1; i >= 0; i--) {
      if (matched.has(ServerState.waitingQueue[i].socketId)) {
        ServerState.waitingQueue.splice(i, 1)
      }
    }

    return matchCount
  },

  // Simple stats
  getPoolStats(ServerState) {
    const queueLength = ServerState.waitingQueue.length
    const bufferSize = this.getBufferSize(queueLength)
    const matchable = Math.max(0, queueLength - bufferSize)
    
    return {
      totalInQueue: queueLength,
      bufferSize: bufferSize,
      matchableUsers: matchable,
      availableMatches: Math.floor(matchable / 2),
      poolUtilization: queueLength > 0 ? ((matchable / queueLength) * 100).toFixed(1) : 0
    }
  },

  // Simple position updates
  updatePoolPositions(io, ServerState) {
    ServerState.waitingQueue.forEach((user, index) => {
      const socket = io.sockets.sockets.get(user.socketId)
      if (socket) {
        const estimatedWait = user.fromSkip ? 5 : Math.max(10, (index + 1) * 15)
        
        socket.emit('queue-position-updated', {
          position: index + 1,
          totalInQueue: ServerState.waitingQueue.length,
          estimatedWait: estimatedWait,
          poolInfo: {
            bufferSize: this.getBufferSize(ServerState.waitingQueue.length),
            nextBatchIn: 5,
            priority: user.fromSkip ? 'high' : 'normal'
          }
        })
      }
    })
  }
}

module.exports = PoolManager
