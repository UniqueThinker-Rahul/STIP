// backend/src/routes/ictResetRoutes.js
const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const User = require('../models/User');
const nodemailer = require('nodemailer');
const mongoose = require('mongoose');

// --- Helper: Dynamic Transporter ---
const getDynamicTransporter = async () => {
  try {
    const SystemConfig = mongoose.model('SystemConfig');
    const configDoc = await SystemConfig.findOne({ key: 'smtp_settings' });
    const dbConfig = configDoc ? configDoc.value : null;

    const host = dbConfig?.host || process.env.SMTP_HOST || 'smtp.gmail.com';
    const port = Number(dbConfig?.port) || Number(process.env.SMTP_PORT) || 465;
    const secure = dbConfig?.secure !== undefined ? dbConfig.secure : (port === 465);
    const user = dbConfig?.user || process.env.SMTP_USER;
    const pass = dbConfig?.pass || process.env.SMTP_PASS;
    const fromName = dbConfig?.fromName || 'STIP Portal Security';

    const transporter = nodemailer.createTransport({
      host, port, secure, auth: { user, pass }, tls: { rejectUnauthorized: false }
    });

    return { transporter, fromLine: `"${fromName}" <${user}>` };
  } catch (err) {
    console.error("Failed to create transporter:", err);
    throw new Error("SMTP Configuration failed.");
  }
};

// --- ROUTE 1: Request Password Reset Link ---
router.post('/request-link', async (req, res) => {
  try {
    const { emailOrUsername } = req.body;

    if (!emailOrUsername) {
      return res.status(400).json({ success: false, message: 'Email or Username is required.' });
    }

    // Find user
    const user = await User.findOne({
      $or: [{ username: emailOrUsername }, { email: emailOrUsername }]
    });

    if (!user) {
      return res.status(200).json({ success: true, message: 'If the account exists and has ICT Admin privileges, a reset link has been sent.' });
    }

    // Strictly enforce ICT_ADMIN role only
    const roles = [user.security?.role, ...(user.security?.secondaryRoles || [])].filter(Boolean);
    const isIctAdmin = roles.some(r => r.toUpperCase() === 'ICT_ADMIN' || r.toUpperCase() === 'ADMIN');

    if (!isIctAdmin) {
      return res.status(200).json({ success: true, message: 'If the account exists and has ICT Admin privileges, a reset link has been sent.' });
    }

    // Locate the best email to send to
    let targetEmail = user.email || user.username;
    if (user.personalDetails?.notificationEmails) {
      const emails = user.personalDetails.notificationEmails;
      targetEmail = (typeof emails.get === 'function' ? emails.get('ICT_ADMIN') : emails['ICT_ADMIN']) || targetEmail;
    }

    if (!targetEmail || !targetEmail.includes('@')) {
      return res.status(400).json({ success: false, message: 'No valid email address is associated with this ICT Admin account.' });
    }

    // Generate Secure Token
    const rawToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

    if (!user.security) user.security = {};
    user.security.resetPasswordToken = hashedToken;
    user.security.resetPasswordExpire = Date.now() + 15 * 60 * 1000; // 15 Minutes
    await user.save({ validateBeforeSave: false });

    // Send Email
    const { transporter, fromLine } = await getDynamicTransporter();
    
    // 🚨 FIX: Robustly handle undefined FRONTEND_URL to prevent broken email links
    let frontendUrl = process.env.FRONTEND_URL;
    if (!frontendUrl || frontendUrl === 'undefined' || frontendUrl === 'null') {
        frontendUrl = 'http://localhost:3000';
    }
    
    const resetUrl = `${frontendUrl}/ict-forgot-password?token=${rawToken}`;
    
    const timestamp = new Date().toLocaleTimeString();

    await transporter.sendMail({
      from: fromLine,
      to: targetEmail,
      subject: `⚠️ ICT Admin Password Reset Link [${timestamp}]`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">
          <div style="background-color: #0D2B55; padding: 20px; text-align: center;">
            <h2 style="color: #fff; margin: 0;">ICT Admin Recovery</h2>
          </div>
          <div style="padding: 30px;">
            <p>Hello <strong>${user.personalDetails?.firstName || 'Admin'}</strong>,</p>
            <p>You requested a password reset for your ICT Administrator account. Click the button below to set a new password.</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" style="background-color: #C9A84C; color: #0D2B55; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Reset Password</a>
            </div>
            <p style="color: #991B1B; font-size: 12px;">This link will expire in 15 minutes. If you did not request this, please ignore this email.</p>
          </div>
        </div>
      `
    });

    console.log(`[ICT RESET] Reset link sent successfully to ${targetEmail}`);
    return res.status(200).json({ success: true, message: `An automated recovery link has been dispatched to your secure email.` });

  } catch (error) {
    console.error('[ICT RESET] Error:', error);
    res.status(500).json({ success: false, message: 'Server error during password reset request.' });
  }
});

// --- ROUTE 2: Execute Password Reset ---
router.patch('/execute-reset/:token', async (req, res) => {
  try {
    const { newPassword } = req.body;
    const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');

    const user = await User.findOne({
      'security.resetPasswordToken': hashedToken,
      'security.resetPasswordExpire': { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid or expired reset token.' });
    }

    user.password = newPassword; // Mongoose pre-save hook will hash this
    user.security.resetPasswordToken = undefined;
    user.security.resetPasswordExpire = undefined;
    user.security.isFirstLogin = false;
    user.markModified('security');
    
    await user.save();

    res.status(200).json({ success: true, message: 'Password updated successfully. You can now log in.' });
  } catch (error) {
    console.error('[ICT RESET EXECUTE] Error:', error);
    res.status(500).json({ success: false, message: 'Server error updating password.' });
  }
});

module.exports = router;