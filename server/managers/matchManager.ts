import type { Server } from 'socket.io'
import ServerState from '../state/serverState'
import type { ConnectedUser, SessionId } from '../types'
import MatchingUtils from '../utils/matchingUtils'

const MatchManager = {
  create(sessionId1: SessionId, sessionId2: SessionId, io: Server): boolean {
    if (MatchingUtils.preventSelfMatch(sessionId1, sessionId2) || !MatchingUtils.isValidUser(sessionId1, io) || !MatchingUtils.isValidUser(sessionId2, io)) return false
    if (!ServerState.waitingQueue.includes(sessionId1) || !ServerState.waitingQueue.includes(sessionId2)) return false
    if (ServerState.activeChats.has(sessionId1) || ServerState.activeChats.has(sessionId2)) return false
    const user1 = ServerState.connectedUsers.get(sessionId1)
    const user2 = ServerState.connectedUsers.get(sessionId2)
    if (!user1 || !user2) return false
    ServerState.waitingQueue = ServerState.waitingQueue.filter(id => id !== sessionId1 && id !== sessionId2)
    ServerState.activeChats.set(sessionId1, sessionId2)
    ServerState.activeChats.set(sessionId2, sessionId1)
    this.notifyUsers(sessionId1, sessionId2, user1, user2, io, [sessionId1, sessionId2].sort()[0])
    return true
  },
  notifyUsers(sessionId1: SessionId, sessionId2: SessionId, user1: ConnectedUser, user2: ConnectedUser, io: Server, initiatorSessionId: SessionId): void {
    io.sockets.sockets.get(ServerState.socketIdLookup.get(sessionId1) ?? '')?.emit('anonymous-match-found', { partnerId: sessionId2, partnerInterests: user2.interests, isWebRTCInitator: sessionId1 === initiatorSessionId, matchScore: MatchingUtils.calculateScore(user1, user2) })
    io.sockets.sockets.get(ServerState.socketIdLookup.get(sessionId2) ?? '')?.emit('anonymous-match-found', { partnerId: sessionId1, partnerInterests: user1.interests, isWebRTCInitator: sessionId2 === initiatorSessionId, matchScore: MatchingUtils.calculateScore(user1, user2) })
  },
}

export default MatchManager
