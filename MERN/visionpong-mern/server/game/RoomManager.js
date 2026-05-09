import { GameRoom } from './GameRoom.js'

// RoomManager is a singleton that tracks every active GameRoom.
// Think of it as a Map<roomId, GameRoom> with helper methods.

class RoomManager {
  constructor() {
    this.rooms = new Map()  // roomId → GameRoom
  }

  createRoom(io, options = {}) {
    const roomId = `room_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
    const room = new GameRoom(roomId, io, options)
    this.rooms.set(roomId, room)
    return room
  }

  getRoom(roomId) {
    return this.rooms.get(roomId)
  }

  deleteRoom(roomId) {
    const room = this.rooms.get(roomId)
    if (room) {
      room.stop()
      this.rooms.delete(roomId)
    }
  }

  // Clean up empty rooms to prevent memory leaks
  cleanup() {
    for (const [id, room] of this.rooms) {
      if (room.getPlayerCount() === 0) {
        this.deleteRoom(id)
      }
    }
  }

  get activeCount() {
    return this.rooms.size
  }
}

// Export a single shared instance — every socket handler uses the same manager
export const roomManager = new RoomManager()
