const { MODERATION } = require('../config/constants')

// Utility functions for message handling and validation
const MessageUtils = {
  sanitize: (message) => {
    if (!message || typeof message !== 'string') return null
    
    let sanitized = message.trim()
    if (sanitized.length === 0) return null
    
    // Check for banned words
    const lowerMessage = sanitized.toLowerCase()
    for (const word of MODERATION.bannedWords) {
      if (lowerMessage.includes(word)) {
        return null // Message blocked
      }
    }
    
    // Limit message length
    if (sanitized.length > 500) {
      sanitized = sanitized.substring(0, 500) + '...'
    }
    
    return sanitized
  }
}

module.exports = MessageUtils
