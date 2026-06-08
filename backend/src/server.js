// backend/src/server.js

// 🚨 GLOBAL NETWORK FIX 1: Force Node.js to prefer IPv4 over IPv6 globally.
// This must be the very first thing in the file.
const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');

require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

// Import your route files
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes'); 
const appraisalRoutes = require('./routes/appraisalRoutes');
const reportRoutes = require('./routes/reportRoutes'); 
const settingsRoutes = require('./routes/settingsRoutes');
const companyMetricsRoutes = require('./routes/companyMetricsRoutes');
const AppConfig = require('./models/AppConfig');
const User = require('./models/User'); 
const { authGuard, roleGuard } = require('./middleware/auth'); 
const quarterRoutes = require('./routes/quarterRoutes');
const auditRoutes = require('./routes/auditRoutes');
const apiLogger = require('./middleware/apiLogger');

const app = express();

// 🚨 GLOBAL PROXY FIX: Must be declared BEFORE any other app.use() middleware.
// This permanently fixes the ERR_ERL_UNEXPECTED_X_FORWARDED_FOR Railway rate limit error.
app.set('trust proxy', 1);

// CORS Configuration
app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (origin.includes('localhost') || origin.includes('vercel.app') || origin.includes('railway.app')) {
      return callback(null, true);
    } else {
      return callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(apiLogger);

// Map the routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);          
app.use('/api/v1/appraisals', appraisalRoutes);
app.use('/api/v1/reports', reportRoutes);
app.use('/api/v1/settings', settingsRoutes);
app.use('/api/v1/company-metrics', companyMetricsRoutes);
app.use('/api/v1/audit', auditRoutes);
app.use('/api/v1/quarters', quarterRoutes);

// GET /api/v1/config/dropdowns
app.get('/api/v1/config/dropdowns', async (req, res) => {
  try {
    let config = await AppConfig.findOne({ configType: 'SYSTEM_DROPDOWNS' });
    if (!config) {
      config = {
        companyCodes: ["FSM", "CDU", "NAR", "GUM"],
        officeLocations: ["HR", "P3MO", "Communications", "ICT", "Finance", "ORCA", "Administration", "Pohnpei Terminal", "CDU", "NPP", "AMMO", "Chuuk Terminal", "Maritime", "Tonoas", "Guam", "Yap Terminal", "Kosrae Terminal", "Nauru Terminal"],
        jobTitles: [] 
      };
    }
    res.json({ success: true, data: config });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch dropdown configurations.' });
  }
});

// PUT /api/v1/config/dropdowns/:category
app.put(
  '/api/v1/config/dropdowns/:category', 
  authGuard, 
  roleGuard('HR_ADMIN', 'ICT_ADMIN', 'CEO'), 
  async (req, res) => {
    try {
      const { category } = req.params; 
      const { action, value, oldValue, newValue } = req.body;

      if (!['companyCodes', 'officeLocations', 'jobTitles'].includes(category)) {
        return res.status(400).json({ message: "Invalid configuration category." });
      }

      let config = await AppConfig.findOne({ configType: 'SYSTEM_DROPDOWNS' });
      
      if (!config) {
          config = new AppConfig({
              configType: 'SYSTEM_DROPDOWNS',
              companyCodes: ["FSM", "CDU", "NAR", "GUM"],
              officeLocations: ["HR", "P3MO", "Communications", "ICT", "Finance", "ORCA", "Administration", "Pohnpei Terminal", "CDU", "NPP", "AMMO", "Chuuk Terminal", "Maritime", "Tonoas", "Guam", "Yap Terminal", "Kosrae Terminal", "Nauru Terminal"],
              jobTitles: []
          });
      }

      if (action === 'DELETE') {
        let usageCount = 0;
        if (category === 'companyCodes') usageCount = await User.countDocuments({ companyCode: value });
        else if (category === 'officeLocations') usageCount = await User.countDocuments({ 'employmentDetails.officeLocation': value });
        else if (category === 'jobTitles') usageCount = await User.countDocuments({ 'employmentDetails.jobTitle': value });

        if (usageCount > 0) return res.status(409).json({ message: `Deletion Blocked: "${value}" is assigned to ${usageCount} employee(s).` });
        config[category] = config[category].filter(item => item !== value);
      }
      else if (action === 'EDIT') {
        if (!newValue || newValue.trim() === '') return res.status(400).json({ message: "Value cannot be empty." });
        if (config[category].includes(newValue)) return res.status(400).json({ message: "This value already exists." });

        const index = config[category].indexOf(oldValue);
        if (index !== -1) config[category][index] = newValue.trim();

        if (category === 'companyCodes') await User.updateMany({ companyCode: oldValue }, { $set: { companyCode: newValue.trim() } });
        else if (category === 'officeLocations') await User.updateMany({ 'employmentDetails.officeLocation': oldValue }, { $set: { 'employmentDetails.officeLocation': newValue.trim() } });
        else if (category === 'jobTitles') await User.updateMany({ 'employmentDetails.jobTitle': oldValue }, { $set: { 'employmentDetails.jobTitle': newValue.trim() } });
      }
      else if (action === 'ADD') {
        if (!value || value.trim() === '') return res.status(400).json({ message: "Value cannot be empty." });
        if (config[category].includes(value.trim())) return res.status(400).json({ message: "This value already exists." });
        config[category].push(value.trim());
      }
      else {
        return res.status(400).json({ message: "Invalid action." });
      }

      await config.save();
      res.json({ success: true, message: `Successfully updated ${category}.`, data: config });

    } catch (error) {
      console.error("Config Update Error:", error);
      res.status(500).json({ message: 'Server error processing configuration update.' });
    }
});

const PORT = process.env.PORT || 5000;
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅ Connected to MongoDB Atlas Cloud Production Ready.');
    app.listen(PORT, () => console.log(`🚀 API Engine online on port ${PORT}`));
  })
  .catch(err => console.error('❌ Database boot up failure:', err));