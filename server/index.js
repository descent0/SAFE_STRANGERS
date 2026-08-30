require('dotenv').config()
const http = require('http')

const { CONFIG } = require('./config/constants')
const { createApp } = require('./http/createApp')
const { initSocketServer } = require('./socket/socketServer')
const { startLifecycle } = require('./lifecycle/serverLifecycle')

const app = createApp()
const server = http.createServer(app)
const io = initSocketServer(server)

startLifecycle({ io, server })

server.listen(CONFIG.PORT, () => {
  console.log(`Omegle-like Socket Server running on port ${CONFIG.PORT}`)
  console.log(`Environment: ${CONFIG.NODE_ENV}`)
  console.log(`Health check: http://localhost:${CONFIG.PORT}/health`)
  console.log(`Stats: http://localhost:${CONFIG.PORT}/stats`)
  if (CONFIG.NODE_ENV !== 'production') {
    console.log(`Debug: http://localhost:${CONFIG.PORT}/debug`)
  }
})

module.exports = { app, server, io }