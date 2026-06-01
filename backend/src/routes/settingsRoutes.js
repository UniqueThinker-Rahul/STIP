const express = require('express');
const router = express.Router();

// Import both Database Models
const SystemSettings = require('../models/SystemSettings');
const AppConfig = require('../models/AppConfig'); 

const { authGuard, roleGuard } = require('../middleware/auth');
const { logAudit } = require('../utils/logger'); // Needed for Matrix Audit Logging

router.use(authGuard);

// ----------------------------------------------------
// SECTION 1: SYSTEM SETTINGS (CP Factor & Overrides)
// ----------------------------------------------------

// POST /api/v1/settings/cp-factor (Strictly CEO Only)
router.post('/cp-factor', roleGuard('CEO'), async (req, res) => {
  try {
    const { year, cpFactor } = req.body;

    if (cpFactor < 0 || cpFactor > 0.15) {
      return res.status(400).json({ message: 'CP Factor must be a decimal between 0.0 and 0.15 (Max 15%)' });
    }

    // Upsert: Create it if it doesn't exist for the year, update it if it does
    const settings = await SystemSettings.findOneAndUpdate(
      { year },
      { year, cpFactor, updatedBy: req.user.id },
      { new: true, upsert: true }
    );

    res.json({ message: `Company Performance (CP) factor for ${year} securely set to ${(cpFactor * 100).toFixed(2)}%`, data: settings });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update CP Factor.' });
  }
});

// PATCH /api/v1/settings/toggle-override (HR Only)
router.patch('/toggle-override', roleGuard('HR_ADMIN'), async (req, res) => {
  try {
    const { year, hrOverride } = req.body;
    
    const settings = await SystemSettings.findOneAndUpdate(
      { year },
      { year, hrOverride, updatedBy: req.user.id },
      { new: true, upsert: true }
    );

    const status = hrOverride ? 'UNLOCKED' : 'LOCKED';
    res.json({ message: `System submissions for ${year} are now ${status}.`, data: settings });
  } catch (error) {
    res.status(500).json({ message: 'Failed to toggle system override.' });
  }
});

// ----------------------------------------------------
// SECTION 2: ICT ADMIN ROLE MATRIX CONTROL
// ----------------------------------------------------

// GET /api/v1/settings/roles-matrix
// Fetches the live permission matrix from MongoDB
router.get('/roles-matrix', async (req, res) => {
  try {
    let config = await AppConfig.findOne();
    if (!config) config = await AppConfig.create({});
    res.json({ data: config.rolesMatrix || {} });
  } catch (error) {
    console.error('Error fetching roles matrix:', error);
    res.status(500).json({ message: 'Server error while fetching matrix.' });
  }
});

// PUT /api/v1/settings/roles-matrix
// Saves the updated permission matrix to MongoDB (Only ICT Admins allowed)
router.put('/roles-matrix', roleGuard('ICT_ADMIN', 'ICT Admin', 'admin', 'ADMIN', 'ict_admin'), async (req, res) => {
  try {
    const { matrix } = req.body;
    
    if (!matrix) {
      return res.status(400).json({ message: 'Matrix data is required.' });
    }

    let config = await AppConfig.findOne();
    if (!config) config = new AppConfig();

    config.rolesMatrix = matrix;
    config.markModified('rolesMatrix'); // Tells MongoDB the mixed object changed
    await config.save();

    // Log the security change to the Audit Trail
    await logAudit({
      user: req.user, 
      role: req.user.role, 
      action: 'MATRIX_UPDATED', 
      category: 'SECURITY', 
      severity: 'CRITICAL',
      details: `ICT Admin globally updated the Role Access Permission Matrix.`, 
      req
    });

    res.json({ message: 'Roles matrix saved successfully.', data: config.rolesMatrix });
  } catch (error) {
    console.error('Error saving roles matrix:', error);
    res.status(500).json({ message: 'Server error while saving matrix.' });
  }
});

module.exports = router;