const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto'); // Built into Node.js
const User = require('../models/User');
const { authGuard } = require('../middleware/auth');
const rateLimit = require('express-rate-limit');

// 💡 UPGRADE: Increased max to 100 to prevent React Fast Refresh from locking you out
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, 
  message: { message: 'Too many login attempts. Account temporarily locked.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// POST /api/v1/auth/login
// UPGRADE: Injected loginLimiter middleware to actively enforce brute-force protection
// POST /api/v1/auth/login
router.post('/login', loginLimiter, async (req, res) => {
  try {
    const { username, password, requestedPortal } = req.body;
    
    const safeUsername = username ? username.trim() : '';

    const user = await User.findOne({ username: safeUsername });
    
    if (!user) {
      return res.status(401).json({ message: 'Invalid Username or Password.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid Username or Password.' });
    }

    // 🚨 DYNAMIC PORTAL CLEARANCE CHECK 🚨
    const actualRole = user.security.role;
    let authorized = false;

    if (requestedPortal === actualRole) {
        // Direct Match: CEO logging into CEO, HR into HR
        authorized = true; 
    } else if (requestedPortal === 'MANAGER' && ['CEO', 'HR_ADMIN', 'ICT_ADMIN'].includes(actualRole)) {
        // Downward Access: Executives are allowed to log into the Line Manager portal
        authorized = true; 
    }

    if (!authorized && requestedPortal) {
        return res.status(403).json({ message: `Access Denied: Your Job Role does not have clearance for the ${requestedPortal} portal.` });
    }

    const sessionId = crypto.randomBytes(16).toString('hex');
    user.security.currentSessionId = sessionId;
    await user.save();

    // 💡 THE SANDBOX: Issue the token for the specific portal they requested!
    // If the CEO logs into the Manager portal, their session is restricted to 'MANAGER' capabilities.
    const tokenRole = requestedPortal || actualRole;

    const token = jwt.sign(
      { 
        id: user._id, 
        role: tokenRole,
        sessionId: sessionId 
      },
      process.env.JWT_SECRET,
      { expiresIn: '30m' }
    );

    res.json({
      token,
      user: {
        id: user._id,
        employeeId: user.employeeId,
        username: user.username,
        firstName: user.personalDetails.firstName,
        lastName: user.personalDetails.lastName,
        role: tokenRole, // Send back the sandboxed role so the frontend routes correctly
        isFirstLogin: user.security.isFirstLogin
      }
    });

  } catch (error) {
    console.error('Login Route Error:', error);
    res.status(500).json({ message: 'Server error during login processing.' });
  }
});

// POST /api/v1/auth/staff-login
// Dedicated route for the Staff Access Portal. Uses standard credentials but issues an EMPLOYEE token.
router.post('/staff-login', loginLimiter, async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // Sanitize input to prevent hidden space errors
    const safeUsername = username ? username.trim() : '';

    const user = await User.findOne({ username: safeUsername });

    if (!user) {
      return res.status(401).json({ message: 'Invalid Username or Password.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid Username or Password.' });
    }

    // SUCCESS! Generate Session ID
    const sessionId = crypto.randomBytes(16).toString('hex');
    user.security.currentSessionId = sessionId;
    await user.save();

    // THE CRITICAL TWIST: Force the token role to 'EMPLOYEE'
    // This sandboxes the user to the Employee Dashboard for this session, even if they are a Line Manager!
    const token = jwt.sign(
      { 
        id: user._id, 
        role: 'EMPLOYEE', // <-- Forced Downgrade for sandbox viewing!
        sessionId: sessionId 
      },
      process.env.JWT_SECRET,
      { expiresIn: '30m' }
    );

    res.json({
      token,
      user: {
        id: user._id,
        employeeId: user.employeeId,
        username: user.username,
        firstName: user.personalDetails.firstName,
        lastName: user.personalDetails.lastName,
        role: 'EMPLOYEE', // Send the downgraded role to the frontend
        isFirstLogin: user.security.isFirstLogin // Make sure to pass this along so the frontend can force password changes
      }
    });

  } catch (error) {
    console.error('Staff Login Route Error:', error);
    res.status(500).json({ message: 'Server error during staff verification.' });
  }
});
// POST /api/v1/auth/logout (Securely destroys the session)
router.post('/logout', authGuard, async (req, res) => {
  try {
    // Find the user and wipe out the session ID in the database
    await User.findByIdAndUpdate(req.user.id, {
      $set: { 'security.currentSessionId': null }
    });
    
    res.json({ message: 'Successfully logged out.' });
  } catch (error) {
    res.status(500).json({ message: 'Server error during logout.' });
  }
});

// PATCH /api/v1/auth/change-password (Forces password change and removes First Login flag)
router.patch('/change-password', authGuard, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    // 1. Enforce minimum password strength (e.g., 8 characters)
    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({ message: 'New password must be at least 8 characters long.' });
    }

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found.' });

    // 2. Verify they know their current password (security best practice)
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Incorrect current password.' });
    }

    // 3. Update the password. 
    // (Note: The userSchema.pre('save') hook we wrote earlier will automatically hash this before it hits the database!)
    user.password = newPassword;
    user.security.isFirstLogin = false;
    
    await user.save();

    res.json({ message: 'Password successfully updated. Your account is secure.' });
  } catch (error) {
    res.status(500).json({ message: 'Server error during password update.' });
  }
});

module.exports = router;