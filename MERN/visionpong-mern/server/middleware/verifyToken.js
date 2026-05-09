import jwt from 'jsonwebtoken'

// Express middleware signature: (req, res, next)
// Call next() to pass control to the next handler
// Call res.status().json() to stop the chain and respond immediately
export function verifyToken(req, res, next) {
  // Tokens arrive in the Authorization header as: "Bearer <token>"
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1] // grab the part after "Bearer "

  if (!token) {
    return res.status(401).json({ message: 'No token — access denied' })
  }

  try {
    // jwt.verify throws if the token is expired or the signature is wrong
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET)

    // Attach the decoded payload to req so route handlers can use req.user
    // decoded looks like: { userId: '...', username: '...', iat: ..., exp: ... }
    req.user = decoded
    next()
  } catch (err) {
    return res.status(403).json({ message: 'Invalid or expired token' })
  }
}
