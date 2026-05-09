import express from 'express'
import { User } from '../models/User.js'
import { verifyToken } from '../middleware/verifyToken.js'

const router = express.Router()

// GET /api/users/:username — public profile
router.get('/:username', async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username })
      .select('-passwordHash -__v') // exclude sensitive fields
    if (!user) return res.status(404).json({ message: 'User not found' })
    res.json(user)
  } catch (err) {
    res.status(500).json({ message: 'Server error' })
  }
})

// PATCH /api/users/settings — sync settings to DB (protected)
router.patch('/settings', verifyToken, async (req, res) => {
  try {
    const { ballSkin, sensitivity, theme } = req.body
    const user = await User.findByIdAndUpdate(
      req.user.userId,
      { $set: { settings: { ballSkin, sensitivity, theme } } },
      { new: true, select: 'settings' } // return the updated doc, only settings field
    )
    res.json(user.settings)
  } catch (err) {
    res.status(500).json({ message: 'Server error' })
  }
})

export default router
