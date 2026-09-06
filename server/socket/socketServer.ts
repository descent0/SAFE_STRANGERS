import type { Server as HttpServer } from 'node:http'
import { Server } from 'socket.io'
import { CONFIG } from '../config/constants'
import registerChatHandlers from './chatHandler'
import registerConnectionHandlers from './connectionHandler'
import registerSignalingHandlers from './signalingHandler'

let ioInstance: Server | null = null

export const initSocketServer = (server: HttpServer): Server => {
  if (ioInstance) return ioInstance
  const io = new Server(server, { cors: { origin: CONFIG.CLIENT_URLS, methods: ['GET', 'POST'], credentials: true }, transports: ['websocket', 'polling'] })
  io.on('connection', socket => {
    const context = { io, socket }
    registerConnectionHandlers(context);
    registerChatHandlers(context);
    registerSignalingHandlers(context)
  })
  ioInstance = io
  return io
}

export const getIO = (): Server => {
  if (!ioInstance) throw new Error('Socket.IO has not been initialized. Call initSocketServer first.')
  return ioInstance
}
