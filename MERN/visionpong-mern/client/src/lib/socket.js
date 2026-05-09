import { io } from 'socket.io-client'

// Single shared socket instance for the whole app.
// autoConnect: false means it won't connect until you call socket.connect()
// This is important — you only want to connect when the user enters a game,
// not on every page load.
const socket = io({
  autoConnect: false,
  withCredentials: true, // sends cookies
})

// Debug logging in development — remove in production
if (import.meta.env.DEV) {
  socket.onAny((event, ...args) => {
    console.log(`[socket] ← ${event}`, args)
  })
  socket.onAnyOutgoing((event, ...args) => {
    console.log(`[socket] → ${event}`, args)
  })
}

export default socket
