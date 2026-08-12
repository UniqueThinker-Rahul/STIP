// backend/src/routes/configRoutes.js
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { authGuard, roleGuard } = require('../middleware/auth');
const nodemailer = require('nodemailer');

router.use(authGuard);

// Dynamically generate the DB Schema inline if not previously registered
const getSystemConfigModel = () => {
  try { 
    return mongoose.model('SystemConfig'); 
  } catch (e) {
    const SystemConfigSchema = new mongoose.Schema({
      key: { type: String, required: true, unique: true },
      value: { type: Object, required: true }
    }, { timestamps: true });
    return mongoose.model('SystemConfig', SystemConfigSchema);
  }
};

// GET /api/v1/config/email - Fetch current live configuration
router.get('/email', roleGuard('ICT_ADMIN'), async (req, res) => {
  try {
    const SystemConfig = getSystemConfigModel();
    const config = await SystemConfig.findOne({ key: 'smtp_settings' });
    
    res.json({ 
      success: true, 
      data: config?.value || {
        host: process.env.SMTP_HOST || 'smtp.titan.email',
        port: Number(process.env.SMTP_PORT) || 465,
        secure: process.env.SMTP_SECURE === 'true',
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || '',
        fromName: 'STIP Portal',
        fromEmail: process.env.SMTP_USER || ''
      }
    });
  } catch (error) { 
    res.status(500).json({ success: false, message: 'Fetch failed' }); 
  }
});

// POST /api/v1/config/email - Update live configuration
router.post('/email', roleGuard('ICT_ADMIN'), async (req, res) => {
  try {
    const SystemConfig = getSystemConfigModel();
    const updated = await SystemConfig.findOneAndUpdate(
      { key: 'smtp_settings' },
      { value: req.body },
      { returnDocument: 'after', upsert: true } 
    );
    res.json({ success: true, message: 'Settings saved', data: updated.value });
  } catch (error) { 
    res.status(500).json({ success: false, message: 'Save failed' }); 
  }
});

// POST /api/v1/config/email/verify - Verification probe test
router.post('/email/verify', roleGuard('ICT_ADMIN'), async (req, res) => {
  try {
    const { host, port, secure, user, pass, fromName, fromEmail } = req.body;
    const testTransporter = nodemailer.createTransport({
      host, 
      port: Number(port), 
      secure: secure === true,
      auth: { user, pass },
      tls: { rejectUnauthorized: false }, 
      family: 4, 
      connectionTimeout: 5000
    });
    
    // 1. Verify Handshake
    await testTransporter.verify();

    // 2. 🚨 UPGRADE: Actually dispatch a test email to the Admin's login email
    const recipientEmail = req.user.email || req.user.username || fromEmail || user;
    
    if (recipientEmail && recipientEmail.includes('@')) {
      await testTransporter.sendMail({
        from: `"${fromName || 'STIP Portal'}" <${fromEmail || user}>`,
        to: recipientEmail,
        subject: '✅ STIP Portal - SMTP Configuration Success',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #E2DDD4; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
            <div style="background-color: #0D2B55; padding: 20px; text-align: center;">
              <h2 style="color: #ffffff; margin: 0; font-size: 20px;">SMTP Connection Successful!</h2>
            </div>
            <div style="padding: 24px; color: #333333; line-height: 1.6; font-size: 14px;">
              <p style="margin-top: 0; font-size: 15px; color: #059669; font-weight: bold;">
                ✅ Your Outgoing Mail Gateway is Operational!
              </p>
              <p>This automated test message confirms that your SMTP credentials and server connection parameters are properly configured on the STIP Portal.</p>
              <table style="width: 100%; border-collapse: collapse; margin: 20px 0; background-color: #FAF8F4; border-radius: 6px;">
                <tr>
                  <td style="padding: 10px 15px; border-bottom: 1px solid #E2DDD4; font-weight: bold; width: 120px; color: #6b7280; font-size: 12px; text-transform: uppercase;">Host</td>
                  <td style="padding: 10px 15px; border-bottom: 1px solid #E2DDD4; font-weight: bold;">${host}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 15px; border-bottom: 1px solid #E2DDD4; font-weight: bold; color: #6b7280; font-size: 12px; text-transform: uppercase;">Port</td>
                  <td style="padding: 10px 15px; border-bottom: 1px solid #E2DDD4;">${port} (Secure: ${secure ? 'Yes' : 'No'})</td>
                </tr>
              </table>
            </div>
          </div>
        `
      });
    }

    res.json({ success: true, message: 'Verified and test email successfully sent!' });
  } catch (error) { 
    res.status(400).json({ success: false, message: error.message }); 
  }
});
module.exports = router;