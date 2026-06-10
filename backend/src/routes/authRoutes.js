// backend/src/routes/authRoutes.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');

const { authGuard, roleGuard } = require('../middleware/auth');
const rateLimit = require('express-rate-limit');

// 🚨 FIX: Ensure all controller functions are imported correctly
const { 
  updatePassword, 
  adminResetPassword, 
  requestPasswordReset, 
  getPendingResetRequests, 
  dismissResetRequest 
} = require('../controllers/authController');

// 🚀 IMPORT THE AUDIT LOGGER
const { logAudit } = require('../utils/logger');

// Public Forgot Password Route (No authGuard!)
router.post('/forgot-password', rateLimit({ windowMs: 15 * 60 * 1000, max: 10 }), requestPasswordReset);

// 🚨 FIX: Registered queue tracking routes under /api/v1/auth
router.get('/password-requests', authGuard, roleGuard('ICT_ADMIN', 'ICT Admin', 'admin', 'ADMIN', 'ict_admin'), getPendingResetRequests);
router.patch('/password-requests/:id/dismiss', authGuard, roleGuard('ICT_ADMIN', 'ICT Admin', 'admin', 'ADMIN', 'ict_admin'), dismissResetRequest);

router.patch('/update-password', authGuard, updatePassword);

// ICT Admin Password Reset Route
router.patch(
  '/admin-reset-password', 
  authGuard, 
  roleGuard('ICT_ADMIN', 'ICT Admin', 'admin', 'ADMIN', 'ict_admin'), 
  async (req, res, next) => {
    await logAudit({
      user: req.user, role: req.user.role, action: 'ADMIN_PASSWORD_RESET_ATTEMPT', category: 'SECURITY', severity: 'HIGH',
      details: `ICT Admin initiated a password reset override for Employee ID: ${req.body.employeeId}`, req
    });
    next();
  },
  adminResetPassword
);

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 100, 
  message: { message: 'Too many login attempts. Account temporarily locked.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// POST /api/v1/auth/login
router.post('/login', loginLimiter, async (req, res) => {
  try {
    const { username, password, requestedPortal } = req.body;
    const safeUsername = username ? username.trim() : '';

    const user = await User.findOne({ username: safeUsername });
    
    if (!user) {
      await logAudit({
        user: null, role: 'SYSTEM', action: 'LOGIN_FAILED', category: 'SECURITY', severity: 'MEDIUM',
        details: `Failed login attempt for unknown username: ${safeUsername}`, req
      });
      return res.status(401).json({ message: 'Invalid Username or Password.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    
    if (!isMatch) {
      await logAudit({
        user, role: user.security.role, action: 'LOGIN_FAILED', category: 'AUTH', severity: 'HIGH',
        details: `Invalid password provided during login`, req
      });
      return res.status(401).json({ message: 'Invalid Username or Password.' });
    }

    const actualRole = user.security.role;
    const secondaryRoles = user.security.secondaryRoles || [];
    const allUserRoles = [actualRole, ...secondaryRoles];
    
    let authorized = false;

    if (requestedPortal && allUserRoles.includes(requestedPortal)) {
        authorized = true; 
    } 
    else if (requestedPortal === 'MANAGER' && allUserRoles.some(role => ['CEO', 'HR_ADMIN', 'ICT_ADMIN'].includes(role))) {
        authorized = true; 
    }

    if (!authorized && requestedPortal) {
      await logAudit({
        user, role: actualRole, action: 'UNAUTHORIZED_ACCESS', category: 'SECURITY', severity: 'CRITICAL',
        details: `Attempted to access ${requestedPortal} portal without proper clearance.`, req
      });
      return res.status(403).json({ message: `Access Denied: Your Job Role does not have clearance for the ${requestedPortal} portal.` });
    }

    const sessionId = crypto.randomBytes(16).toString('hex');
    
    await User.updateOne(
      { _id: user._id },
      { $set: { 'security.currentSessionId': sessionId } }
    );

    const tokenRole = requestedPortal || actualRole;

    const token = jwt.sign(
      { id: user._id, role: tokenRole, sessionId: sessionId },
      process.env.JWT_SECRET,
      { expiresIn: '30m' }
    );

    await logAudit({
      user, role: actualRole, action: 'LOGIN_SUCCESS', category: 'AUTH', severity: 'LOW',
      details: `Successfully logged into the ${tokenRole} portal.`, req
    });

    res.json({
      token,
      user: {
        id: user._id, employeeId: user.employeeId, username: user.username,
        firstName: user.personalDetails.firstName, lastName: user.personalDetails.lastName,
        role: tokenRole, isFirstLogin: user.security.isFirstLogin
      }
    });

  } catch (error) {
    console.error('Login Route Error:', error);
    res.status(500).json({ message: 'Server error during login processing.' });
  }
});

// POST /api/v1/auth/staff-login
router.post('/staff-login', loginLimiter, async (req, res) => {
  try {
    const { username, password } = req.body;
    const safeUsername = username ? username.trim() : '';

    const user = await User.findOne({ username: safeUsername });

    if (!user) {
      await logAudit({
        user: null, role: 'SYSTEM', action: 'LOGIN_FAILED', category: 'SECURITY', severity: 'MEDIUM',
        details: `Failed staff login attempt for unknown username: ${safeUsername}`, req
      });
      return res.status(401).json({ message: 'Invalid Username or Password.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      await logAudit({
        user, role: user.security.role, action: 'LOGIN_FAILED', category: 'AUTH', severity: 'HIGH',
        details: `Invalid password provided during staff login`, req
      });
      return res.status(401).json({ message: 'Invalid Username or Password.' });
    }

    const sessionId = crypto.randomBytes(16).toString('hex');
    
    await User.updateOne(
      { _id: user._id },
      { $set: { 'security.currentSessionId': sessionId } }
    );

    const token = jwt.sign(
      { id: user._id, role: 'EMPLOYEE', sessionId: sessionId },
      process.env.JWT_SECRET,
      { expiresIn: '30m' }
    );

    await logAudit({
      user, role: user.security.role, action: 'LOGIN_SUCCESS', category: 'AUTH', severity: 'LOW',
      details: `Successfully logged into the STAFF portal.`, req
    });

    res.json({
      token,
      user: {
        id: user._id, employeeId: user.employeeId, username: user.username,
        firstName: user.personalDetails.firstName, lastName: user.personalDetails.lastName,
        role: 'EMPLOYEE', isFirstLogin: user.security.isFirstLogin 
      }
    });

  } catch (error) {
    console.error('Staff Login Route Error:', error);
    res.status(500).json({ message: 'Server error during staff verification.' });
  }
});

// POST /api/v1/auth/logout
router.post('/logout', authGuard, async (req, res) => {
  try {
    const fullUser = await User.findById(req.user.id);

    await User.updateOne(
      { _id: req.user.id },
      { $set: { 'security.currentSessionId': null } }
    );
    
    await logAudit({
      user: fullUser || { _id: req.user.id, personalDetails: { firstName: 'User', lastName: req.user.id } },
      role: req.user.role, action: 'LOGOUT', category: 'AUTH', severity: 'LOW',
      details: `User manually logged out and terminated session.`, req
    });

    res.json({ message: 'Successfully logged out.' });
  } catch (error) {
    console.error('Logout Route Error:', error);
    res.status(500).json({ message: 'Server error during logout.' });
  }
});

// PATCH /api/v1/auth/change-password
router.patch('/change-password', authGuard, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({ message: 'New password must be at least 8 characters long.' });
    }

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found.' });

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Incorrect current password.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    
    await User.updateOne(
      { _id: user._id },
      { $set: { password: hashedPassword, 'security.isFirstLogin': false } }
    );

    await logAudit({
      user, role: user.security.role, action: 'PASSWORD_UPDATE', category: 'SECURITY', severity: 'MEDIUM',
      details: `User successfully updated their account password.`, req
    });

    res.json({ message: 'Password successfully updated. Your account is secure.' });
  } catch (error) {
    console.error('Change Password Error:', error);
    res.status(500).json({ message: 'Server error during password update.' });
  }
});

// GET /api/v1/auth/me
router.get('/me', authGuard, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) return res.status(404).json({ message: 'User profile not found.' });
    res.json({ data: user });
  } catch (error) {
    console.error("Error fetching current user:", error);
    res.status(500).json({ message: 'Server error fetching user profile.' });
  }
});

module.exports = router;