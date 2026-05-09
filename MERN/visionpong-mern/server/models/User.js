import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'

// Schema = the shape of every User document in MongoDB
const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, 'Username is required'],
      unique: true,
      trim: true,
      minlength: 3,
      maxlength: 20,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    // Stats — updated after every match
    stats: {
      wins:        { type: Number, default: 0 },
      losses:      { type: Number, default: 0 },
      totalMatches:{ type: Number, default: 0 },
      totalRallies:{ type: Number, default: 0 },
    },
    // Settings synced from client
    settings: {
      ballSkin:    { type: String, default: 'classic' },
      sensitivity: { type: Number, default: 0.75 },
      theme:       { type: String, default: 'dark' },
    },
  },
  {
    timestamps: true, // adds createdAt and updatedAt automatically
  }
)

// MIDDLEWARE — runs before every .save()
// "this" refers to the document being saved
userSchema.pre('save', async function (next) {
  // Only re-hash if the password field was actually changed
  // (we don't want to double-hash on profile updates)
  if (!this.isModified('passwordHash')) return next()
  this.passwordHash = await bcrypt.hash(this.passwordHash, 10)
  next()
})

// INSTANCE METHOD — call user.comparePassword(plaintext) anywhere
userSchema.methods.comparePassword = function (plaintext) {
  return bcrypt.compare(plaintext, this.passwordHash)
}

// Virtual — winRate is computed, not stored
userSchema.virtual('winRate').get(function () {
  if (this.stats.totalMatches === 0) return 0
  return ((this.stats.wins / this.stats.totalMatches) * 100).toFixed(1)
})

export const User = mongoose.model('User', userSchema)
