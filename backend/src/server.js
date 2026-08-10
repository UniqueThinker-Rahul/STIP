// 🚨 GLOBAL NETWORK FIX: Forces Node.js to use IPv4 for all outbound connections.
// This permanently prevents the Railway ENETUNREACH IPv6 timeout error.
// const dns = require('dns');
// dns.setDefaultResultOrder('ipv4first');

require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

// 🚨 UPGRADE: INITIALIZE EVENT LISTENERS FOR BACKGROUND TASKS (EMAILS)
// This must be required early so it starts listening before routes are hit
require('./events/emailListeners'); 

// 1. Import your route files
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes'); 
const appraisalRoutes = require('./routes/appraisalRoutes');
const reportRoutes = require('./routes/reportRoutes'); 
const settingsRoutes = require('./routes/settingsRoutes');
const companyMetricsRoutes = require('./routes/companyMetricsRoutes');
const AppConfig = require('./models/AppConfig');
const User = require('./models/User'); // Required for dependency checks
const { authGuard, roleGuard } = require('./middleware/auth'); // Required for securing config routes
const quarterRoutes = require('./routes/quarterRoutes');
const auditRoutes = require('./routes/auditRoutes');
// 🚨 UPGRADE: Import the global API logger middleware
const apiLogger = require('./middleware/apiLogger');
const notificationRoutes = require('./routes/notificationRoutes');
const configRoutes = require('./routes/configRoutes');
const backupRoutes = require('./routes/backupRoutes');

const app = express();

// 🚨 UPGRADED CORS CONFIGURATION: Dynamic domain support to fix Vercel preview blocks
app.set('trust proxy', 1);

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like Postman or mobile apps)
    if (!origin) return callback(null, true);
    
    // Dynamically allow any Vercel domain, local dev, Railway, AND Network IPs
    if (
        origin.includes('localhost') || 
        origin.includes('vercel.app') || 
        origin.includes('railway.app') ||
        origin.includes('192.168.') || 
        origin.includes('10.') || 
        origin.includes('172.')
    ) {
      return callback(null, true);
    } else {
      return callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true, // Required for cookies/sessions to cross domains
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// 🚨 UPGRADE: Activate the global logger to watch all incoming requests
app.use(apiLogger);

// 2. Map the routes to the URL paths
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);          
app.use('/api/v1/appraisals', appraisalRoutes);
app.use('/api/v1/reports', reportRoutes);
app.use('/api/v1/settings', settingsRoutes);
app.use('/api/v1/company-metrics', companyMetricsRoutes);
app.use('/api/v1/audit', require('./routes/auditRoutes'));
app.use('/api/v1/quarters', quarterRoutes);
app.use('/api/v1/audit', auditRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/config', configRoutes);
app.use('/api/v1/backup', backupRoutes);
app.use('/api/v1/quarterly-scorecards', require('./routes/quarterlyScorecardRoutes'));
app.use('/api/v1/executive', require('./routes/executiveRoutes'));
app.use('/api/v1/reports', require('./routes/boardReportRoutes'));

// GET /api/v1/config/dropdowns
app.get('/api/v1/config/dropdowns', async (req, res) => {
  try {
    let config = await AppConfig.findOne({ configType: 'SYSTEM_DROPDOWNS' });
    
    // Fallback failsafe if the database isn't populated yet
    if (!config) {
      config = {
        companyCodes: ["FSM", "CDU", "NAR", "GUM"],
        officeLocations: ["HR", "P3MO", "Communications", "ICT", "Finance", "ORCA", "Administration", "Pohnpei Terminal", "CDU", "NPP", "AMMO", "Chuuk Terminal", "Maritime", "Tonoas", "Guam", "Yap Terminal", "Kosrae Terminal", "Nauru Terminal"],
        jobTitles: [] // Left empty for brevity, but you can populate it
      };
    }
    
    res.json({ success: true, data: config });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch dropdown configurations.' });
  }
});

// PUT /api/v1/config/dropdowns/:category
// Handles ADD, EDIT, and DELETE with strict Database Dependency Checks
app.put(
  '/api/v1/config/dropdowns/:category', 
  authGuard, 
  roleGuard('HR_ADMIN', 'ICT_ADMIN', 'CEO'), // 🚨 Managers are explicitly blocked
  async (req, res) => {
    try {
      const { category } = req.params; // 'companyCodes', 'officeLocations', or 'jobTitles'
      const { action, value, oldValue, newValue } = req.body;

      // Validate category
      if (!['companyCodes', 'officeLocations', 'jobTitles'].includes(category)) {
        return res.status(400).json({ message: "Invalid configuration category." });
      }

      let config = await AppConfig.findOne({ configType: 'SYSTEM_DROPDOWNS' });
      
      // Auto-create config if it doesn't exist during the first update
      if (!config) {
          config = new AppConfig({
              configType: 'SYSTEM_DROPDOWNS',
              companyCodes: ["FSM", "CDU", "NAR", "GUM"],
              officeLocations: ["HR", "P3MO", "Communications", "ICT", "Finance", "ORCA", "Administration", "Pohnpei Terminal", "CDU", "NPP", "AMMO", "Chuuk Terminal", "Maritime", "Tonoas", "Guam", "Yap Terminal", "Kosrae Terminal", "Nauru Terminal"],
              jobTitles: []
          });
      }

      // ---------------------------------------------------------
      // ACTION: DELETE (Strict Dependency Check)
      // ---------------------------------------------------------
      if (action === 'DELETE') {
        let usageCount = 0;

        // 1. Check if the value is currently assigned to any user
        if (category === 'companyCodes') {
          usageCount = await User.countDocuments({ companyCode: value });
        } else if (category === 'officeLocations') {
          usageCount = await User.countDocuments({ 'employmentDetails.officeLocation': value });
        } else if (category === 'jobTitles') {
          usageCount = await User.countDocuments({ 'employmentDetails.jobTitle': value });
        }

        // 2. Block deletion if in use
        if (usageCount > 0) {
          return res.status(409).json({ 
            message: `Deletion Blocked: "${value}" is currently assigned to ${usageCount} employee(s). You must reassign them before deleting this value.` 
          });
        }

        // 3. Safe to delete
        config[category] = config[category].filter(item => item !== value);
      }

      // ---------------------------------------------------------
      // ACTION: EDIT (Cascade Updates to Users)
      // ---------------------------------------------------------
      else if (action === 'EDIT') {
        if (!newValue || newValue.trim() === '') return res.status(400).json({ message: "Value cannot be empty." });
        if (config[category].includes(newValue)) return res.status(400).json({ message: "This value already exists." });

        // 1. Update the Config Array
        const index = config[category].indexOf(oldValue);
        if (index !== -1) config[category][index] = newValue.trim();

        // 2. CASCADE UPDATE: Automatically update all users using the old value
        if (category === 'companyCodes') {
          await User.updateMany({ companyCode: oldValue }, { $set: { companyCode: newValue.trim() } });
        } else if (category === 'officeLocations') {
          await User.updateMany({ 'employmentDetails.officeLocation': oldValue }, { $set: { 'employmentDetails.officeLocation': newValue.trim() } });
        } else if (category === 'jobTitles') {
          await User.updateMany({ 'employmentDetails.jobTitle': oldValue }, { $set: { 'employmentDetails.jobTitle': newValue.trim() } });
        }
      }

      // ---------------------------------------------------------
      // ACTION: ADD
      // ---------------------------------------------------------
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

// 🚀 UPGRADED: Added Connection Pooling to prevent database timeouts
mongoose.connect(process.env.MONGO_URI, {
  maxPoolSize: 50, // Allows 50 concurrent database operations instead of the default 5
  serverSelectionTimeoutMS: 30000
})
  .then(() => {
    console.log('✅ Connected to MongoDB Atlas Cloud Production Ready.');
    app.listen(PORT, () => console.log(`🚀 API Engine online on port ${PORT}`));
  })
  .catch(err => console.error('❌ Database boot up failure:', err));