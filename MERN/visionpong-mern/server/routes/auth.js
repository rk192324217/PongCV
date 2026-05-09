import express from 'express'
import jwt from 'jsonwebtoken'
import { User } from '../models/User.js'

const router = express.Router()

// ── HELPERS ──────────────────────────────────────────────────────────────────

function signAccessToken(userId, username) {
  // Access token: expires in 15 minutes
  // The payload (first arg) is what gets decoded in verifyToken
  return jwt.sign(
    { userId, username },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: '15m' }
  )
}

function signRefreshToken(userId) {
  // Refresh token: expires in 7 days
  // Stored in an httpOnly cookie — JS in the browser cannot read it
  return jwt.sign(
    { userId },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: '7d' }
  )
}

function setRefreshCookie(res, token) {
  res.cookie('refreshToken', token, {
    httpOnly: true,    // not accessible to JS — prevents XSS theft
    secure: process.env.NODE_ENV === 'production', // HTTPS only in prod
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
  })
}

// ── POST /api/auth/register ───────────────────────────────────────────────────
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body

    // Basic validation
    if (!username || !email || !password) {
      return res.status(400).json({ message: 'All fields are required' })
    }
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' })
    }

    // Check if user already exists
    const exists = await User.findOne({ $or: [{ email }, { username }] })
    if (exists) {
      return res.status(409).json({ message: 'Email or username already taken' })
    }

    // Create user — passwordHash will be hashed by the pre('save') hook
    const user = new User({ username, email, passwordHash: password })
    await user.save()

    // Issue tokens immediately so user is logged in after registration
    const accessToken = signAccessToken(user._id, user.username)
    const refreshToken = signRefreshToken(user._id)
    setRefreshCookie(res, refreshToken)

    res.status(201).json({
      accessToken,
      user: { id: user._id, username: user.username, email: user.email },
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Server error' })
  }
})

// ── POST /api/auth/login ──────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body

    const user = await User.findOne({ email })
    if (!user) {
      // Don't reveal whether the email exists — keep the message vague
      return res.status(401).json({ message: 'Invalid credentials' })
    }

    const valid = await user.comparePassword(password)
    if (!valid) {
      return res.status(401).json({ message: 'Invalid credentials' })
    }

    const accessToken = signAccessToken(user._id, user.username)
    const refreshToken = signRefreshToken(user._id)
    setRefreshCookie(res, refreshToken)

    res.json({
      accessToken,
      user: { id: user._id, username: user.username, email: user.email, stats: user.stats },
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Server error' })
  }
})

// ── POST /api/auth/refresh ────────────────────────────────────────────────────
// Called automatically by the client when the 15-min access token expires.
// The refresh token is in the cookie — no body needed.
router.post('/refresh', (req, res) => {
  const token = req.cookies?.refreshToken
  if (!token) return res.status(401).json({ message: 'No refresh token' })

  try {
    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET)
    const newAccess = signAccessToken(decoded.userId, decoded.username)
    res.json({ accessToken: newAccess })
  } catch {
    res.status(403).json({ message: 'Invalid refresh token — please log in again' })
  }
})

// ── POST /api/auth/logout ─────────────────────────────────────────────────────
router.post('/logout', (_req, res) => {
  res.clearCookie('refreshToken')
  res.json({ message: 'Logged out' })
})

export default router
