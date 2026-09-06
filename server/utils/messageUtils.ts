import { MODERATION } from '../config/constants'

const MessageUtils = {
  sanitize(message: unknown): string | null {
    if (typeof message !== 'string') return null
    let sanitized = message.trim()
    if (!sanitized) return null
    if (MODERATION.bannedWords.some(word => sanitized.toLowerCase().includes(word))) return null
    if (sanitized.length > 500) sanitized = `${sanitized.substring(0, 500)}...`
    return sanitized
  },
}

export default MessageUtils
