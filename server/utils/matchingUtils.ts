import type { Server } from 'socket.io'
import { MODERATION } from '../config/constants'
import ServerState from '../state/serverState'
import type { ConnectedUser, SessionId } from '../types'

const MatchingUtils = {
  calculateScore(user1: ConnectedUser, user2: ConnectedUser): number {
    const interests1 = user1.interests
    const interests2 = user2.interests
    if (interests1.length === 0 && interests2.length === 0) return Math.random()
    const totalInterests = Math.max(interests1.length, interests2.length)
    if (!totalInterests) return Math.random()
    let commonInterests = 0
    for (const interest1 of interests1) for (const interest2 of interests2) {
      if (interest1.toLowerCase() === interest2.toLowerCase()) commonInterests += 2
      else if (Object.values(MODERATION.interestCategories).some(keywords => (keywords as readonly string[]).includes(interest1.toLowerCase()) && (keywords as readonly string[]).includes(interest2.toLowerCase()))) commonInterests += 1
    }
    return Math.max(0, Math.min(1, commonInterests / totalInterests + (Math.random() - 0.5) * 0.3 + Math.sin(Date.now() / 100000) * 0.1))
  },

  isValidUser(sessionId: SessionId, io?: Server): boolean {
    if (!ServerState.connectedUsers.has(sessionId) || ServerState.activeChats.has(sessionId)) return false
    if (!io) return true
    const socket = io.sockets.sockets.get(ServerState.socketIdLookup.get(sessionId) ?? '')
    return Boolean(socket?.connected)
  },

  preventSelfMatch(sessionId1: SessionId, sessionId2: SessionId): boolean { return sessionId1 === sessionId2 },

  shuffleArray<T>(array: T[]): T[] {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[array[i], array[j]] = [array[j], array[i]]
    }
    return array
  },
}

export default MatchingUtils
