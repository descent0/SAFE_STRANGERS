import 'dotenv/config'
import http from 'node:http'
import { CONFIG } from './config/constants'
import { createApp } from './http/createApp'
import { startLifecycle } from './lifecycle/serverLifecycle'
import { initSocketServer } from './socket/socketServer'

const app = createApp()
const server = http.createServer(app)
const io = initSocketServer(server)
startLifecycle({ io, server })

server.listen(CONFIG.PORT, () => {
  console.log(`Omegle-like Socket Server running on port ${CONFIG.PORT}`)
  console.log(`Environment: ${CONFIG.NODE_ENV}`)
})

export { app, server, io }
