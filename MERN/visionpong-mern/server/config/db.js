import mongoose from 'mongoose'

// connectDB is called once when the server starts.
// Mongoose maintains a connection pool internally — you never call this again.
export async function connectDB() {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI)
    console.log(`✅ MongoDB connected: ${conn.connection.host}`)
  } catch (err) {
    console.error('❌ MongoDB connection failed:', err.message)
    // Exit the process — no point running a server with no database
    process.exit(1)
  }
}
