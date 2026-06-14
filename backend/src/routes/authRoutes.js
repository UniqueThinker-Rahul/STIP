// backend/src/routes/authRoutes.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const Notification = require('../models/Notification'); 

// 🚨 UPGRADE: Import the Event Bus for decoupled background tasks
const eventBus = require('../events/eventBus');

const { authGuard, roleGuard } = require('../middleware/auth');
const rateLimit = require('express-rate-limit');
const { updatePassword } = require('../controllers/authController');
const { logAudit } = require('../utils/logger');

// ============================================================================
// 🚨 CORRECTED FORGOT PASSWORD LOGIC (Matching exact schema fields)
// ============================================================================

// 1. PUBLIC ROUTE: Handle incoming forgot password requests
router.post('/forgot-password', rateLimit({ windowMs: 15 * 60 * 1000, max: 10 }), async (req, res) => {
  try {
    const { employeeId, contactData } = req.body;

    if (!employeeId || !contactData) {
      return res.status(400).json({ message: 'Employee ID and Username/Email are required.' });
    }

    const user = await User.findOne({
      employeeId: employeeId,
      $or: [ { username: contactData } ]
    });

    if (user) {
      if (!user.security) user.security = {};
      
      user.security.resetRequested = true; 
      user.security.resetRequestDate = new Date();
      user.markModified('security'); 
      
      await user.save();
      
      await logAudit({
        user, role: 'SYSTEM', action: 'PASSWORD_RESET_REQUESTED', category: 'SECURITY', severity: 'MEDIUM',
        details: `User requested a password reset via public portal.`, req
      });

      // 🚨 UPGRADE: Decoupled Email & Notification Logic
      // We just emit the event and let the background listener handle finding 
      // the ICT Admins, formatting emails, and saving notifications.
      const formattedDateTime = new Date().toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
      
      eventBus.emit('PASSWORD_RESET_REQUESTED', { 
         user: user, 
         contactDataProvided: contactData,
         formattedDateTime: formattedDateTime
      });
    }

    // Instantly return success to the user so they aren't waiting on the SMTP server
    res.status(200).json({ success: true, message: 'If the details match, a request has been sent to ICT Admin.' });
  } catch (error) {
    console.error("Forgot Password Error:", error);
    res.status(200).json({ success: true, message: 'If the details match, a request has been sent to ICT Admin.' });
  }
});

// 2. PROTECTED ROUTE: Fetch all pending password reset requests
router.get('/password-requests', authGuard, roleGuard('ICT_ADMIN'), async (req, res) => {
  try {
    const requests = await User.find({ 
      'security.resetRequested': true 
    }).select('employeeId username personalDetails.firstName personalDetails.lastName security.resetRequestDate');

    res.status(200).json({ success: true, data: requests });
  } catch (error) {
    console.error("Fetch Password Requests Error:", error);
    res.status(500).json({ success: false, message: 'Failed to fetch password reset requests.' });
  }
});

// 3. PROTECTED ROUTE: Dismiss an invalid password reset request
router.patch('/password-requests/:id/dismiss', authGuard, roleGuard('ICT_ADMIN'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found.' });

    if (user.security) {
      user.security.resetRequested = false;
      user.markModified('security');
      await user.save();
    }

    res.status(200).json({ success: true, message: 'Request dismissed successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to dismiss request.' });
  }
});

// 4. PROTECTED ROUTE: Admin manual password reset (Execution)
router.patch('/admin-reset-password', authGuard, roleGuard('ICT_ADMIN'), async (req, res) => {
  try {
    const { employeeId, username, newPassword } = req.body;

    const user = await User.findOne({ employeeId, username });

    if (!user) {
      return res.status(404).json({ message: 'User not found. Verify Employee ID and Username.' });
    }

    user.password = newPassword;
    
    if (!user.security) user.security = {};
    
    user.security.resetRequested = false;
    user.security.isFirstLogin = true; 
    user.markModified('security');

    await user.save();

    res.status(200).json({ success: true, message: 'Password successfully overridden and request cleared.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal server error during password reset.' });
  }
});

// ============================================================================
// 🚨 NEW: 5. PROTECTED ROUTE: GLOBAL MASS PASSWORD RESET
// ============================================================================
router.patch('/admin-mass-reset', authGuard, roleGuard('ICT_ADMIN'), async (req, res) => {
  try {
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({ message: 'New password must be at least 8 characters long.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update ALL users except the current ICT Admin
    const result = await User.updateMany(
      { _id: { $ne: req.user.id } }, 
      { 
        $set: { 
          password: hashedPassword, 
          'security.isFirstLogin': true, 
          'security.currentSessionId': null 
        },
        $unset: {
          'security.resetRequested': 1,
          'security.resetRequestDate': 1
        }
      }
    );

    await logAudit({
      user: req.user, role: req.user.role, action: 'ADMIN_MASS_PASSWORD_RESET', category: 'SECURITY', severity: 'CRITICAL',
      details: `ICT Admin initiated a global mass password reset for ${result.modifiedCount} employee accounts.`, req
    });

    res.status(200).json({ success: true, message: `Successfully reset passwords for ${result.modifiedCount} employees.` });
  } catch (error) {
    console.error("Admin Mass Reset Error:", error);
    res.status(500).json({ success: false, message: 'Internal server error during mass reset.' });
  }
});

// ============================================================================

router.patch('/update-password', authGuard, updatePassword);

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

    user.password = newPassword;
    user.security.isFirstLogin = false;
    user.markModified('security');
    
    await user.save();

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