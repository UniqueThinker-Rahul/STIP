const dns = require('node:dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);

// 🚨 GLOBAL NETWORK FIX: Forces Node.js to use IPv4 for all outbound connections.
// This permanently prevents the Railway ENETUNREACH IPv6 timeout error.
// dns.setDefaultResultOrder('ipv4first');

require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

// 🚨 UPGRADE: INITIALIZE EVENT LISTENERS FOR BACKGROUND TASKS (EMAILS)
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
const apiLogger = require('./middleware/apiLogger');
const notificationRoutes = require('./routes/notificationRoutes');
const configRoutes = require('./routes/configRoutes');
const backupRoutes = require('./routes/backupRoutes');
const path = require('path');

const app = express();

app.set('trust proxy', 1);

// 🚨 BULLETPROOF CORS CONFIGURATION
const getAllowedOrigins = () => {
  const configured = [
    'https://stipdash.vercel.app',
    process.env.FRONTEND_URL,
    process.env.ALLOWED_ORIGINS
  ].filter(Boolean);

  return configured
    .flatMap(item => item.split(','))
    .map(o => o.trim().replace(/\/$/, ''));
};

const corsOptions = {
  origin: function (origin, callback) {
    // Allow non-browser requests (Postman, mobile apps, server-to-server)
    if (!origin) return callback(null, true);

    const cleanOrigin = origin.trim().replace(/\/$/, '');
    const allowed = getAllowedOrigins();

    const isAllowed = 
      allowed.includes(cleanOrigin) ||
      allowed.some(domain => cleanOrigin.startsWith(domain)) ||
      cleanOrigin.endsWith('.vercel.app') ||
      cleanOrigin.endsWith('.railway.app') ||
      cleanOrigin.includes('fsmpc.com') ||
      cleanOrigin.includes('localhost') ||
      cleanOrigin.includes('127.0.0.1') ||
      cleanOrigin.includes('192.168.') ||
      cleanOrigin.includes('10.') ||
      cleanOrigin.includes('172.');

    if (isAllowed) {
      return callback(null, true);
    } else {
      // FIX: Pass false instead of throwing an Error object to prevent Express from crashing during OPTIONS preflight
      console.warn(`[CORS Blocked]: Origin ${origin} not matched.`);
      return callback(null, false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  optionsSuccessStatus: 200 // Ensures legacy browsers and proxies handle preflight 200 OK cleanly
};

// Apply CORS globally
app.use(cors(corsOptions));

// FIX: Handle explicit preflight OPTIONS requests across all endpoints
app.options('*', cors(corsOptions));

app.use(express.json());

// Activate the global logger
app.use(apiLogger);

// 2. Map the routes to the URL paths
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);          
app.use('/api/v1/appraisals', appraisalRoutes);
app.use('/api/v1/reports', reportRoutes);
app.use('/api/v1/settings', settingsRoutes);
app.use('/api/v1/company-metrics', companyMetricsRoutes);
app.use('/api/v1/quarters', quarterRoutes);
app.use('/api/v1/audit', auditRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/config', configRoutes);
app.use('/api/v1/backup', backupRoutes);
app.use('/api/v1/quarterly-scorecards', require('./routes/quarterlyScorecardRoutes'));
app.use('/api/v1/executive', require('./routes/executiveRoutes'));
app.use('/api/v1/reports', require('./routes/boardReportRoutes'));
app.use('/api/v1/disciplinary', require('./routes/disciplinaryRoutes'));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

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

        if (category === 'companyCodes') {
          usageCount = await User.countDocuments({ companyCode: value });
        } else if (category === 'officeLocations') {
          usageCount = await User.countDocuments({ 'employmentDetails.officeLocation': value });
        } else if (category === 'jobTitles') {
          usageCount = await User.countDocuments({ 'employmentDetails.jobTitle': value });
        }

        if (usageCount > 0) {
          return res.status(409).json({ 
            message: `Deletion Blocked: "${value}" is currently assigned to ${usageCount} employee(s). You must reassign them before deleting this value.` 
          });
        }

        config[category] = config[category].filter(item => item !== value);
      }

      else if (action === 'EDIT') {
        if (!newValue || newValue.trim() === '') return res.status(400).json({ message: "Value cannot be empty." });
        if (config[category].includes(newValue)) return res.status(400).json({ message: "This value already exists." });

        const index = config[category].indexOf(oldValue);
        if (index !== -1) config[category][index] = newValue.trim();

        if (category === 'companyCodes') {
          await User.updateMany({ companyCode: oldValue }, { $set: { companyCode: newValue.trim() } });
        } else if (category === 'officeLocations') {
          await User.updateMany({ 'employmentDetails.officeLocation': oldValue }, { $set: { 'employmentDetails.officeLocation': newValue.trim() } });
        } else if (category === 'jobTitles') {
          await User.updateMany({ 'employmentDetails.jobTitle': oldValue }, { $set: { 'employmentDetails.jobTitle': newValue.trim() } });
        }
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

mongoose.connect(process.env.MONGO_URI, {
  maxPoolSize: 50,
  serverSelectionTimeoutMS: 30000
})
  .then(() => {
    console.log('✅ Connected to MongoDB Atlas Cloud Production Ready.');
    app.listen(PORT, () => console.log(`🚀 API Engine online on port ${PORT}`));
  })
  .catch(err => console.error('❌ Database boot up failure:', err));