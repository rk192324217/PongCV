import mongoose from 'mongoose'

const matchSchema = new mongoose.Schema(
  {
    // ObjectId references link to the User collection
    // populate() lets you fetch full user data from just this ID
    p1: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    p2: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // null = vs AI
    winner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    mode: { type: String, enum: ['ai', 'pvp'], default: 'ai' },
    aiLevel: { type: String, enum: ['easy', 'medium', 'hard', 'insane'] },

    score: {
      p1: { type: Number, default: 0 },
      p2: { type: Number, default: 0 },
    },

    durationSeconds: { type: Number },
    totalRallies: { type: Number, default: 0 },
    maxRally: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  }
)

// Index so queries like "get all matches for user X, newest first" are fast
matchSchema.index({ p1: 1, createdAt: -1 })
matchSchema.index({ p2: 1, createdAt: -1 })

export const Match = mongoose.model('Match', matchSchema)
