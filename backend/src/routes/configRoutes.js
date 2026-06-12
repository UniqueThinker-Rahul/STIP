// backend/src/routes/configRoutes.js
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { authGuard, roleGuard } = require('../middleware/auth');
const nodemailer = require('nodemailer');

router.use(authGuard);

// 🚨 FIX 1: Dynamically generate the DB Schema inline so it doesn't crash looking for a missing file
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
// 🚨 FIX 2: Changed roleGuard to 'ICT_ADMIN' to match your actual system roles
router.get('/email', roleGuard('ICT_ADMIN'), async (req, res) => {
  try {
    const SystemConfig = getSystemConfigModel();
    const config = await SystemConfig.findOne({ key: 'smtp_settings' });
    
    res.json({ success: true, data: config?.value || {
      host: process.env.SMTP_HOST || 'smtp.titan.email',
      port: Number(process.env.SMTP_PORT) || 465,
      secure: process.env.SMTP_SECURE === 'true',
      user: process.env.SMTP_USER || '',
      pass: process.env.SMTP_PASS || '',
      fromName: 'STIP Portal',
      fromEmail: process.env.SMTP_USER || ''
    }});
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
      // 🚨 FIX 3: Replaced { new: true } with { returnDocument: 'after' } to clear Mongoose warnings
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
    const { host, port, secure, user, pass } = req.body;
    const testTransporter = nodemailer.createTransport({
      host, 
      port: Number(port), 
      secure: secure === true,
      auth: { user, pass },
      tls: { rejectUnauthorized: false }, 
      family: 4, 
      connectionTimeout: 5000
    });
    
    await testTransporter.verify();
    res.json({ success: true, message: 'Verified' });
  } catch (error) { 
    res.status(400).json({ success: false, message: error.message }); 
  }
});

module.exports = router;