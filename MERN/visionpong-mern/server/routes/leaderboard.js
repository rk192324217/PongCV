import express from 'express'
import { User } from '../models/User.js'

const router = express.Router()

// GET /api/leaderboard
// Returns top 20 players sorted by wins, with win rate computed server-side.
// This is a MongoDB aggregation pipeline — read it top to bottom like a pipe.
router.get('/', async (req, res) => {
  try {
    const leaderboard = await User.aggregate([
      // STAGE 1 — $match: filter out users with no games played
      // Like a WHERE clause in SQL
      { $match: { 'stats.totalMatches': { $gt: 0 } } },

      // STAGE 2 — $project: choose which fields to include and compute new ones
      // Like SELECT in SQL, but you can compute new fields here
      {
        $project: {
          username: 1,
          wins:          '$stats.wins',
          losses:        '$stats.losses',
          totalMatches:  '$stats.totalMatches',
          totalRallies:  '$stats.totalRallies',
          // Compute winRate as a percentage, rounded to 1 decimal place
          // $cond prevents division by zero
          winRate: {
            $round: [
              {
                $multiply: [
                  {
                    $cond: [
                      { $eq: ['$stats.totalMatches', 0] },
                      0,
                      { $divide: ['$stats.wins', '$stats.totalMatches'] },
                    ],
                  },
                  100,
                ],
              },
              1, // decimal places
            ],
          },
          avgRallies: {
            $round: [
              {
                $cond: [
                  { $eq: ['$stats.totalMatches', 0] },
                  0,
                  { $divide: ['$stats.totalRallies', '$stats.totalMatches'] },
                ],
              },
              1,
            ],
          },
        },
      },

      // STAGE 3 — $sort: sort by wins descending, break ties by winRate
      { $sort: { wins: -1, winRate: -1 } },

      // STAGE 4 — $limit: only return the top 20
      { $limit: 20 },
    ])

    res.json(leaderboard)
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Server error' })
  }
})

export default router
