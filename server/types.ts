import type { Server as HttpServer } from 'node:http'
import type { Server, Socket } from 'socket.io'

export type SocketId = string
export type SessionId = string

export interface ConnectedUser {
  interests: string[]
  chatMode?: string
  safeMode: boolean
  connectedAt: Date
  joinedAt: Date
  lastActivity: Date
  lastSkipped?: SessionId
  lastSkippedAt?: Date
}

export interface ServerStateShape {
  connectedUsers: Map<SessionId, ConnectedUser>
  waitingQueue: SessionId[]
  activeChats: Map<SessionId, SessionId>
  socketIdLookup: Map<SessionId, SocketId>
}

export interface SocketContext {
  io: Server
  socket: Socket
}

export interface LifecycleContext {
  io: Server
  server: HttpServer
}

export interface JoinAnonymousChatPayload {
  sessionId: string
  interests?: string[]
  chatMode?: string
  safeMode?: boolean
}

export interface SessionPayload { sessionId: string }
export interface ChatMessagePayload extends SessionPayload { message: unknown }
export interface TypingPayload extends SessionPayload { typing: boolean }
export interface WebRtcDescription { type: string; sdp: string }
export interface OfferPayload { offer: WebRtcDescription; to: SessionId }
export interface AnswerPayload { answer: WebRtcDescription; to: SessionId }
export interface IceCandidatePayload { candidate: { candidate: string }; to: SessionId }
