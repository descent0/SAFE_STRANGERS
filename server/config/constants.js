// Configuration constants for the server
const CONFIG = {
  PORT: process.env.PORT || 3001,
  NODE_ENV: process.env.NODE_ENV || 'development',
  CLIENT_URLS: process.env.CLIENT_URLS ? process.env.CLIENT_URLS.split(',') : (process.env.NODE_ENV === 'production' 
    ? ['https://yourdomain.com'] 
    : ['http://localhost:3000', 'http://127.0.0.1:3000']),
  TIMEOUTS: {
    SESSION_TIMEOUT: process.env.SESSION_TIMEOUT ? parseInt(process.env.SESSION_TIMEOUT) : 30 * 60 * 1000, // 30 minutes
    CLEANUP_INTERVAL: process.env.CLEANUP_INTERVAL ? parseInt(process.env.CLEANUP_INTERVAL) : 5 * 60 * 1000,  // 5 minutes
    MATCHING_INTERVAL: process.env.MATCHING_INTERVAL ? parseInt(process.env.MATCHING_INTERVAL) : 3000,          // 3 seconds
    POSITION_UPDATE_INTERVAL: process.env.POSITION_UPDATE_INTERVAL ? parseInt(process.env.POSITION_UPDATE_INTERVAL) : 10000,  // 10 seconds
  },
  QUEUE: {
    ESTIMATED_WAIT_PER_POSITION: process.env.ESTIMATED_WAIT_PER_POSITION ? parseInt(process.env.ESTIMATED_WAIT_PER_POSITION) : 15, // seconds
    MIN_ESTIMATED_WAIT: process.env.MIN_ESTIMATED_WAIT ? parseInt(process.env.MIN_ESTIMATED_WAIT) : 10,          // seconds
    SHUFFLE_PROBABILITY: process.env.SHUFFLE_PROBABILITY ? parseFloat(process.env.SHUFFLE_PROBABILITY) : 0.15,       // 15% chance to shuffle queue
  },
  POOL: {
    MIN_BUFFER_SIZE: process.env.MIN_BUFFER_SIZE ? parseInt(process.env.MIN_BUFFER_SIZE) : 3,              // Minimum users to keep in buffer
    BUFFER_PERCENTAGE: process.env.BUFFER_PERCENTAGE ? parseInt(process.env.BUFFER_PERCENTAGE) : 20,           // % of users to keep as buffer (20%)
    MAX_BUFFER_SIZE: process.env.MAX_BUFFER_SIZE ? parseInt(process.env.MAX_BUFFER_SIZE) : 15,             // Maximum buffer size regardless of percentage
    BATCH_MATCHING_INTERVAL: process.env.BATCH_MATCHING_INTERVAL ? parseInt(process.env.BATCH_MATCHING_INTERVAL) : 5000,   // 5 seconds - batch matching window
    IMMEDIATE_MATCH_THRESHOLD: process.env.IMMEDIATE_MATCH_THRESHOLD ? parseInt(process.env.IMMEDIATE_MATCH_THRESHOLD) : 8,    // If queue < 8, do immediate matching
  }
}

// Content moderation and safety
const MODERATION = {
  bannedWords: [
    'fuck', 'shit', 'damn', 'bitch', 'asshole', 'bastard', 'porn', 'sex',
    'nude', 'naked', 'dick', 'pussy', 'cock', 'tits', 'boobs', 'ass'
  ],
  
  interestCategories: {
    'gaming': ['gaming', 'games', 'xbox', 'playstation', 'pc', 'nintendo', 'steam'],
    'music': ['music', 'songs', 'bands', 'concerts', 'instruments', 'spotify'],
    'movies': ['movies', 'films', 'cinema', 'netflix', 'series', 'tv'],
    'sports': ['sports', 'football', 'basketball', 'soccer', 'tennis', 'hockey'],
    'technology': ['tech', 'programming', 'coding', 'computers', 'ai', 'software'],
    'art': ['art', 'drawing', 'painting', 'design', 'photography', 'creative'],
    'books': ['books', 'reading', 'novels', 'literature', 'writing', 'poetry'],
    'travel': ['travel', 'vacation', 'countries', 'culture', 'adventure', 'explore']
  }
}

module.exports = { CONFIG, MODERATION }
