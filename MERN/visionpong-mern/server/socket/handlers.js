import { roomManager } from '../game/RoomManager.js'

// This function is called once per connected socket.
// "socket" represents ONE connected client.
// "io" is the server — used to broadcast to rooms.
export function registerSocketHandlers(io, socket) {
  console.log(`🔌 Client connected: ${socket.id}`)

  // ── CREATE ROOM (vs AI or local 2-player) ──────────────────────────────────
  socket.on('createRoom', ({ mode, aiLevel, winScore }) => {
    const room = roomManager.createRoom(io, { mode, aiLevel, winScore })
    room.p1SocketId = socket.id

    // socket.join puts this socket into a Socket.io "room"
    // io.to(roomId).emit(...) then sends to everyone in that room
    socket.join(room.roomId)
    socket.emit('roomCreated', { roomId: room.roomId })

    // Start the game immediately for AI/local modes
    if (mode !== 'pvp') {
      room.start()
      socket.emit('gameStarted', { side: 'p1' })
    }

    console.log(`🎮 Room ${room.roomId} created (mode: ${mode})`)
  })

  // ── JOIN ROOM (online PvP — P2 joins with a room code) ────────────────────
  socket.on('joinRoom', ({ roomId }) => {
    const room = roomManager.getRoom(roomId)
    if (!room) {
      socket.emit('error', { message: 'Room not found' })
      return
    }
    if (room.p2SocketId) {
      socket.emit('error', { message: 'Room is full' })
      return
    }

    room.p2SocketId = socket.id
    socket.join(roomId)

    // Tell both players the game is starting and which side they are
    io.to(room.p1SocketId).emit('gameStarted', { side: 'p1' })
    socket.emit('gameStarted', { side: 'p2' })

    room.start()
    console.log(`🤝 Room ${roomId} — P2 joined, starting PvP`)
  })

  // ── PADDLE INPUT — received 60x per second from each client ───────────────
  // This is the core of the online game: client sends wrist Y, server updates state
  socket.on('paddleMove', ({ roomId, y }) => {
    const room = roomManager.getRoom(roomId)
    if (room) room.setPaddleY(socket.id, y)
  })

  // ── DISCONNECT ────────────────────────────────────────────────────────────
  socket.on('disconnect', () => {
    console.log(`❌ Client disconnected: ${socket.id}`)
    // Notify opponent that the player left
    for (const [roomId, room] of roomManager.rooms) {
      if (room.p1SocketId === socket.id || room.p2SocketId === socket.id) {
        io.to(roomId).emit('playerLeft', { message: 'Opponent disconnected' })
        roomManager.deleteRoom(roomId)
        break
      }
    }
  })
}
