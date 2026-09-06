import type { Server } from 'socket.io'
import { CONFIG } from '../config/constants'
import ServerState from '../state/serverState'
import type { ConnectedUser, SessionId } from '../types'
import MatchingUtils from '../utils/matchingUtils'
import MatchManager from './matchManager'

const PoolManager = {
  getBufferSize(queueLength: number): number {
    return queueLength < 8 ? 3 : Math.min(Math.ceil(queueLength * 0.2), 15)
  },
  findImmediateMatch(sessionId: SessionId, io: Server): SessionId | null {
    ServerState.waitingQueue = ServerState.waitingQueue.filter(candidateSessionId => MatchingUtils.isValidUser(candidateSessionId, io))
    const user = ServerState.connectedUsers.get(sessionId)
    if (!user) return null
    const candidates = ServerState.waitingQueue.flatMap(candidateSessionId => {
      const candidate = ServerState.connectedUsers.get(candidateSessionId)
      if (!candidate || !this.areCompatible(sessionId, candidateSessionId) || !MatchingUtils.isValidUser(candidateSessionId, io)) return []
      const score = this.calculateInterestScore(user, candidate)
      return score >= CONFIG.POOL.MIN_INTEREST_SCORE ? [{ sessionId: candidateSessionId, score }] : []
    })
    if (!candidates.length) return null
    candidates.sort((a, b) => b.score - a.score)
    const topCandidates = candidates.slice(0, 3)
    return topCandidates[Math.floor(Math.random() * topCandidates.length)].sessionId
  },
  areCompatible(sessionId1: SessionId, sessionId2: SessionId): boolean {
    if (sessionId1 === sessionId2) return false
    const user1 = ServerState.connectedUsers.get(sessionId1)
    const user2 = ServerState.connectedUsers.get(sessionId2)
    const skipCooldown = 30 * 1000
    const user1RecentlySkipped = user1?.lastSkipped === sessionId2 && user1.lastSkippedAt && Date.now() - user1.lastSkippedAt.getTime() < skipCooldown
    const user2RecentlySkipped = user2?.lastSkipped === sessionId1 && user2.lastSkippedAt && Date.now() - user2.lastSkippedAt.getTime() < skipCooldown
    return Boolean(user1 && user2 && !user1RecentlySkipped && !user2RecentlySkipped && user1.safeMode === user2.safeMode && user1.chatMode === user2.chatMode)
  },
  calculateInterestScore(user1: ConnectedUser, user2: ConnectedUser): number {
    if (!user1.interests.length && !user2.interests.length) return 0.5
    if (!user1.interests.length || !user2.interests.length) return 0.3
    let common = 0
    for (const first of user1.interests) for (const second of user2.interests) {
      if (first.toLowerCase() === second.toLowerCase()) common += 2
      else if (this.areSimilarInterests(first, second)) common += 1
    }
    return Math.min(1, common / Math.max(user1.interests.length, user2.interests.length))
  },
  areSimilarInterests(interest1: string, interest2: string): boolean {
    const categories = [['gaming', 'games', 'xbox', 'playstation', 'pc', 'nintendo', 'steam', 'esports'], ['music', 'songs', 'bands', 'concerts', 'instruments', 'spotify', 'singing'], ['movies', 'films', 'cinema', 'netflix', 'series', 'tv', 'shows'], ['sports', 'football', 'basketball', 'soccer', 'tennis', 'hockey', 'gym'], ['technology', 'tech', 'programming', 'coding', 'computers', 'ai', 'software'], ['art', 'drawing', 'painting', 'design', 'photography', 'creative'], ['books', 'reading', 'novels', 'literature', 'writing', 'poetry'], ['travel', 'vacation', 'countries', 'culture', 'adventure', 'explore']]
    return categories.some(keywords => keywords.includes(interest1.toLowerCase()) && keywords.includes(interest2.toLowerCase()))
  },
  addToPool(sessionId: SessionId, { priority = false }: { priority?: boolean } = {}): boolean {
    if (ServerState.waitingQueue.includes(sessionId) || ServerState.activeChats.has(sessionId) || !ServerState.connectedUsers.has(sessionId)) return false
    priority ? ServerState.waitingQueue.unshift(sessionId) : ServerState.waitingQueue.push(sessionId)
    return true
  },
  processBatchMatching(io: Server): number {
    ServerState.waitingQueue = ServerState.waitingQueue.filter(sessionId => MatchingUtils.isValidUser(sessionId, io))
    const matchableSessionIds = [...ServerState.waitingQueue]
    const matched = new Set<SessionId>()
    for (const sessionId1 of matchableSessionIds) {
      if (matched.has(sessionId1)) continue
      const user1 = ServerState.connectedUsers.get(sessionId1)
      if (!user1) continue
      let bestMatch: SessionId | null = null
      let bestScore = -1
      for (const sessionId2 of matchableSessionIds) {
        const user2 = ServerState.connectedUsers.get(sessionId2)
        if (!user2 || matched.has(sessionId2) || !this.areCompatible(sessionId1, sessionId2) || !MatchingUtils.isValidUser(sessionId2, io)) continue
        const score = this.calculateInterestScore(user1, user2)
        if (score < CONFIG.POOL.MIN_INTEREST_SCORE) continue
        if (score > bestScore) { bestScore = score; bestMatch = sessionId2 }
      }
      if (bestMatch && MatchManager.create(sessionId1, bestMatch, io)) { matched.add(sessionId1); matched.add(bestMatch) }
    }
    ServerState.waitingQueue = ServerState.waitingQueue.filter(sessionId => !matched.has(sessionId))
    return matched.size / 2
  },
  getPoolStats() {
    const totalInQueue = ServerState.waitingQueue.length
    return { totalInQueue, bufferSize: this.getBufferSize(totalInQueue), matchableUsers: totalInQueue, availableMatches: Math.floor(totalInQueue / 2), poolUtilization: totalInQueue ? '100.0' : 0 }
  },
}

export default PoolManager
