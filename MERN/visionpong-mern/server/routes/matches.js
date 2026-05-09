import express from 'express'
import { Match } from '../models/Match.js'
import { User } from '../models/User.js'
import { verifyToken } from '../middleware/verifyToken.js'

const router = express.Router()

// POST /api/matches — save a completed match result
// Protected: must be logged in
router.post('/', verifyToken, async (req, res) => {
  try {
    const { mode, aiLevel, score, durationSeconds, totalRallies, maxRally, p2Id, winnerId } = req.body
    const p1Id = req.user.userId // from the JWT payload

    const match = await Match.create({
      p1: p1Id,
      p2: p2Id || null,
      winner: winnerId || null,
      mode,
      aiLevel,
      score,
      durationSeconds,
      totalRallies,
      maxRally,
    })

    // Update player stats atomically using $inc
    // $inc adds to a field without reading it first — safe for concurrent updates
    const p1Won = winnerId === p1Id
    await User.findByIdAndUpdate(p1Id, {
      $inc: {
        'stats.wins':         p1Won ? 1 : 0,
        'stats.losses':       p1Won ? 0 : 1,
        'stats.totalMatches': 1,
        'stats.totalRallies': totalRallies || 0,
      },
    })

    res.status(201).json(match)
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Server error' })
  }
})

// GET /api/matches/me — get current user's match history
router.get('/me', verifyToken, async (req, res) => {
  try {
    const matches = await Match.find({
      $or: [{ p1: req.user.userId }, { p2: req.user.userId }],
    })
      .sort({ createdAt: -1 })  // newest first
      .limit(20)
      .populate('p1', 'username')   // replace p1 ObjectId with { _id, username }
      .populate('p2', 'username')
      .populate('winner', 'username')

    res.json(matches)
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Server error' })
  }
})

export default router
