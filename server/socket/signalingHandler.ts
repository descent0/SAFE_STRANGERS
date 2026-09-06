import ServerState from '../state/serverState'
import type { AnswerPayload, IceCandidatePayload, OfferPayload, SocketContext } from '../types'

const registerSignalingHandlers = ({ io, socket }: SocketContext): void => {
  const sessionIdForSocket = () => [...ServerState.socketIdLookup.entries()].find(([, socketId]) => socketId === socket.id)?.[0]
  const targetSocket = (sessionId: string) => io.sockets.sockets.get(ServerState.socketIdLookup.get(sessionId) ?? '')
  socket.on('offer', ({ offer, to }: OfferPayload) => {
    if (sessionIdForSocket() === undefined || ServerState.activeChats.get(sessionIdForSocket()!) !== to) return void socket.emit('error', { message: 'Invalid partner for WebRTC offer' })
    if (!offer?.type || !offer.sdp) return void socket.emit('error', { message: 'Invalid offer format' })
    targetSocket(to)?.emit('offer', { offer, from: sessionIdForSocket() }) ?? socket.emit('error', { message: 'Partner not available' })
  })
  socket.on('answer', ({ answer, to }: AnswerPayload) => {
    if (sessionIdForSocket() === undefined || ServerState.activeChats.get(sessionIdForSocket()!) !== to) return void socket.emit('error', { message: 'Invalid partner for WebRTC answer' })
    if (!answer?.type || !answer.sdp) return void socket.emit('error', { message: 'Invalid answer format' })
    targetSocket(to)?.emit('answer', { answer, from: sessionIdForSocket() }) ?? socket.emit('error', { message: 'Partner not available' })
  })
  socket.on('ice-candidate', ({ candidate, to }: IceCandidatePayload) => {
    if (sessionIdForSocket() === undefined || ServerState.activeChats.get(sessionIdForSocket()!) !== to) return
    if (typeof candidate?.candidate !== 'string') return
    targetSocket(to)?.emit('ice-candidate', { candidate, from: sessionIdForSocket() })
  })
}

export default registerSignalingHandlers
