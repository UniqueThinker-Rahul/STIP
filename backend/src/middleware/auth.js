// backend/src/middleware/auth.js
const jwt = require('jsonwebtoken');
const User = require('../models/User'); 

const authGuard = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Access denied. No session token provided.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('security.currentSessionId');
    
    // 💡 UPGRADE: Added user.security?.currentSessionId to prevent fatal crashes
    // if the user exists but the security object was never initialized in the DB.
    if (!user || user.security?.currentSessionId !== decoded.sessionId) {
      return res.status(401).json({ 
        message: 'Session expired or logged in from another device. Please log in again.',
        code: 'SESSION_REVOKED' 
      });
    }

    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Session expired due to inactivity.' });
  }
};

const roleGuard = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Forbidden. You do not have permission.' });
    }
    next();
  }
};

module.exports = { authGuard, roleGuard };