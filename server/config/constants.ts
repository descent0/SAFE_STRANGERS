const numberFromEnv = (value: string | undefined, fallback: number): number => value ? Number.parseInt(value, 10) : fallback

export const CONFIG = {
  PORT: numberFromEnv(process.env.PORT, 3001),
  NODE_ENV: process.env.NODE_ENV || 'development',
  CLIENT_URLS: process.env.CLIENT_URLS?.split(',') ?? (process.env.NODE_ENV === 'production' ? ['https://yourdomain.com'] : ['http://localhost:3000', 'http://127.0.0.1:3000']),
  TIMEOUTS: {
    SESSION_TIMEOUT: numberFromEnv(process.env.SESSION_TIMEOUT, 30 * 60 * 1000),
    CLEANUP_INTERVAL: numberFromEnv(process.env.CLEANUP_INTERVAL, 5 * 60 * 1000),
    MATCHING_INTERVAL: numberFromEnv(process.env.MATCHING_INTERVAL, 3000),
    POSITION_UPDATE_INTERVAL: numberFromEnv(process.env.POSITION_UPDATE_INTERVAL, 10000),
  },
  QUEUE: {
    ESTIMATED_WAIT_PER_POSITION: numberFromEnv(process.env.ESTIMATED_WAIT_PER_POSITION, 15),
    MIN_ESTIMATED_WAIT: numberFromEnv(process.env.MIN_ESTIMATED_WAIT, 10),
    SHUFFLE_PROBABILITY: process.env.SHUFFLE_PROBABILITY ? Number.parseFloat(process.env.SHUFFLE_PROBABILITY) : 0.15,
  },
  POOL: {
    MIN_BUFFER_SIZE: numberFromEnv(process.env.MIN_BUFFER_SIZE, 3),
    BUFFER_PERCENTAGE: numberFromEnv(process.env.BUFFER_PERCENTAGE, 20),
    MAX_BUFFER_SIZE: numberFromEnv(process.env.MAX_BUFFER_SIZE, 15),
    BATCH_MATCHING_INTERVAL: numberFromEnv(process.env.BATCH_MATCHING_INTERVAL, 5000),
    IMMEDIATE_MATCH_THRESHOLD: numberFromEnv(process.env.IMMEDIATE_MATCH_THRESHOLD, 8),
    MIN_INTEREST_SCORE: process.env.MIN_INTEREST_SCORE ? Number.parseFloat(process.env.MIN_INTEREST_SCORE) : 0.4,
  },
} as const

export const MODERATION = {
  bannedWords: ['fuck', 'shit', 'damn', 'bitch', 'asshole', 'bastard', 'porn', 'sex', 'nude', 'naked', 'dick', 'pussy', 'cock', 'tits', 'boobs', 'ass'],
  interestCategories: {
    gaming: ['gaming', 'games', 'xbox', 'playstation', 'pc', 'nintendo', 'steam'],
    music: ['music', 'songs', 'bands', 'concerts', 'instruments', 'spotify'],
    movies: ['movies', 'films', 'cinema', 'netflix', 'series', 'tv'],
    sports: ['sports', 'football', 'basketball', 'soccer', 'tennis', 'hockey'],
    technology: ['tech', 'programming', 'coding', 'computers', 'ai', 'software'],
    art: ['art', 'drawing', 'painting', 'design', 'photography', 'creative'],
    books: ['books', 'reading', 'novels', 'literature', 'writing', 'poetry'],
    travel: ['travel', 'vacation', 'countries', 'culture', 'adventure', 'explore'],
  },
} as const
