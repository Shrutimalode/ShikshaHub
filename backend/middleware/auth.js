const jwt = require('jsonwebtoken');

// Middleware to verify JWT token
module.exports = function (req, res, next) {
  let token = null;

  // 1. Check x-auth-token header
  if (req.header('x-auth-token')) {
    token = req.header('x-auth-token');
  }

  // 2. Check Authorization: Bearer <token>
  else if (req.header('authorization') && req.header('authorization').startsWith('Bearer ')) {
    token = req.header('authorization').split(' ')[1]; // Get token after "Bearer"
  }

  // 3. Fallback: check token in query string (optional)
  else if (req.query.token) {
    token = req.query.token;
  }

  // If no token found
  if (!token) {
    return res.status(401).json({ message: 'No token, authorization denied' });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'shikshahub_secret');
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Token is not valid' });
  }
};
