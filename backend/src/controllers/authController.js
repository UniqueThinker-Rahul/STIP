const bcrypt = require('bcryptjs');
const User = require('../models/User');

// 🚨 UPGRADED: Added support for handling the login mechanism and validating the new EXECUTIVE role
exports.login = async (req, res) => {
  try {
    const { username, password, requestedPortal } = req.body;

    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    // Role-based Security Clearance Check
    if (requestedPortal) {
      if (requestedPortal === 'HR_ADMIN' && user.role !== 'HR_ADMIN') {
        return res.status(403).json({ message: 'Access Denied. You do not have HR Admin clearance.' });
      }
      if (requestedPortal === 'CEO' && user.role !== 'CEO') {
        return res.status(403).json({ message: 'Access Denied. You do not have CEO clearance.' });
      }
      if (requestedPortal === 'ICT_ADMIN' && user.role !== 'ICT_ADMIN') {
        return res.status(403).json({ message: 'Access Denied. You do not have ICT Admin clearance.' });
      }
      // 👇 ADDED: Executive Role Clearance Verification
      if (requestedPortal === 'EXECUTIVE' && user.role !== 'EXECUTIVE') {
        return res.status(403).json({ message: 'Access Denied. You do not have Executive clearance.' });
      }
      if (requestedPortal === 'MANAGER' && user.role !== 'MANAGER' && user.role !== 'HR_ADMIN' && user.role !== 'CEO' && user.role !== 'EXECUTIVE') {
        return res.status(403).json({ message: 'Access Denied. You do not have Manager clearance.' });
      }
    }

    // Generate JWT (Assuming you have a generateToken function or similar in your original auth controller)
    const jwt = require('jsonwebtoken');
    const token = jwt.sign(
      { id: user._id, role: user.role, employeeId: user.employeeId },
      process.env.JWT_SECRET || 'fallback_secret_key_change_in_production',
      { expiresIn: '1d' }
    );

    res.status(200).json({
      success: true,
      token,
      user: {
        _id: user._id,
        username: user.username,
        role: user.role,
        isFirstLogin: user.isFirstLogin || user.security?.isFirstLogin,
        firstName: user.personalDetails?.firstName,
        lastName: user.personalDetails?.lastName
      }
    });

  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ message: 'Server error during login.' });
  }
};


exports.updatePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    // Find user (req.user is set by your JWT protect middleware)
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Check if current password matches
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    // Pass the raw new password! Do NOT use bcrypt here. 
    // The User model's pre('save') hook will hash it automatically.
    user.password = newPassword; 
    
    await user.save();

    res.status(200).json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error updating password' });
  }
};

// Public route to request a password reset ticket
exports.requestPasswordReset = async (req, res) => {
  try {
    const { employeeId, contactData } = req.body;
    
    // Find user by Employee ID and either username or email (if email exists in future)
    const user = await User.findOne({ 
      employeeId: employeeId.trim(),
      $or: [{ username: contactData.trim() }] // Expand this if you add email support later
    });

    if (!user) {
      // Return generic success to prevent hackers from guessing active employee IDs
      return res.status(200).json({ message: 'If those details match our records, a secure reset request has been forwarded to the ICT Administrator.' });
    }

    // Tag the user's security profile with a pending request
    await User.updateOne(
      { _id: user._id },
      { $set: { 'security.resetRequested': true, 'security.resetRequestDate': new Date() } }
    );

    res.status(200).json({ message: 'If those details match our records, a secure reset request has been forwarded to the ICT Administrator.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error processing request.' });
  }
};

// ICT Admin route to fetch all pending requests
exports.getPendingResetRequests = async (req, res) => {
  try {
    const pendingUsers = await User.find({ 'security.resetRequested': true })
      .select('employeeId personalDetails username employmentDetails security.resetRequestDate')
      .sort({ 'security.resetRequestDate': 1 }); // Oldest first
    res.status(200).json({ data: pendingUsers });
  } catch (error) {
    res.status(500).json({ message: 'Server error fetching requests.' });
  }
};

// ICT Admin route to dismiss an invalid request
exports.dismissResetRequest = async (req, res) => {
  try {
    await User.updateOne(
      { _id: req.params.id },
      { $unset: { 'security.resetRequested': 1, 'security.resetRequestDate': 1 } }
    );
    res.status(200).json({ message: 'Request successfully dismissed.' });
  } catch (error) {
    res.status(500).json({ message: 'Error dismissing request.' });
  }
};

// Administrative Force-Reset Password (clears the request queue)
exports.adminResetPassword = async (req, res) => {
  try {
    const { employeeId, username, newPassword } = req.body;

    if (!employeeId || !username || !newPassword) {
      return res.status(400).json({ message: 'Employee ID, Username, and New Password are required.' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ message: 'New password must be at least 8 characters long.' });
    }

    // Find the user verifying BOTH the employeeId and username match for safety
    const user = await User.findOne({ 
      employeeId: employeeId.trim(), 
      username: username.trim() 
    });

    if (!user) {
      return res.status(404).json({ message: 'No matching user found with that Employee ID and Username combination.' });
    }

    // Ensure ICT Admin cannot change CEO passwords (optional safety guard)
    if (user.security?.role === 'CEO' && req.user.role !== 'CEO') {
        return res.status(403).json({ message: 'Permission Denied: Cannot administratively reset a CEO password.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update password, force change on next login, AND clear the request flag from the queue
    await User.updateOne(
      { _id: user._id },
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

    res.status(200).json({ 
      success: true, 
      message: `Password successfully reset for ${user.personalDetails.firstName} ${user.personalDetails.lastName}. They will be prompted to change it upon their next login.` 
    });

  } catch (error) {
    console.error('Admin Reset Password Error:', error);
    res.status(500).json({ message: 'Server error during administrative password reset.' });
  }
};