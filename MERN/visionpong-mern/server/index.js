import 'dotenv/config'                          // loads .env into process.env — must be first
import express from 'express'
import { createServer } from 'http'            // Node's built-in http module
import { Server as SocketIO } from 'socket.io'
import cors from 'cors'
import helmet from 'helmet'
import cookieParser from 'cookie-parser'

import { connectDB } from './config/db.js'
import authRoutes        from './routes/auth.js'
import userRoutes        from './routes/users.js'
import matchRoutes       from './routes/matches.js'
import leaderboardRoutes from './routes/leaderboard.js'
import { registerSocketHandlers } from './socket/handlers.js'

const app = express()

// ── MIDDLEWARE ────────────────────────────────────────────────────────────────
// helmet sets secure HTTP headers (prevents XSS, clickjacking, etc.)
app.use(helmet())

// cors tells the browser "it's OK for the React app to call this server"
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,  // needed so cookies (refresh token) are sent cross-origin
}))

app.use(express.json())       // parse JSON request bodies
app.use(cookieParser())       // parse cookies so we can read the refresh token

// ── REST ROUTES ───────────────────────────────────────────────────────────────
// All routes are prefixed with /api to separate them from the frontend
app.use('/api/auth',        authRoutes)
app.use('/api/users',       userRoutes)
app.use('/api/matches',     matchRoutes)
app.use('/api/leaderboard', leaderboardRoutes)

// Health check — useful for deployment monitoring
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() })
})

// ── SOCKET.IO SETUP ───────────────────────────────────────────────────────────
// Socket.io wraps the http server (not the express app directly)
// because WebSockets need the raw http server, not the Express layer
const httpServer = createServer(app)

const io = new SocketIO(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
  },
})

// Register event handlers for each new connection
io.on('connection', (socket) => {
  registerSocketHandlers(io, socket)
})

// ── START ─────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000

async function start() {
  await connectDB()
  httpServer.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`)
    console.log(`   WebSocket ready on ws://localhost:${PORT}`)
  })
}

start()
