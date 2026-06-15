const express = require('express');
const router = express.Router();

// Import both Database Models
const SystemSettings = require('../models/SystemSettings');
const AppConfig = require('../models/AppConfig'); 

const { authGuard, roleGuard } = require('../middleware/auth');
const { logAudit } = require('../utils/logger'); // Needed for Matrix & Formula Audit Logging

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
    let config = await AppConfig.findOne({ configType: 'SYSTEM_DROPDOWNS' }); // Explicit type to prevent collision
    if (!config) config = await AppConfig.create({ configType: 'SYSTEM_DROPDOWNS' });
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

    let config = await AppConfig.findOne({ configType: 'SYSTEM_DROPDOWNS' });
    if (!config) config = new AppConfig({ configType: 'SYSTEM_DROPDOWNS' });

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

// ----------------------------------------------------
// 🚨 SECTION 3: FORMULA CONFIGURATION ENGINE (NEW)
// ----------------------------------------------------

// GET /api/v1/settings/formula - Fetch the live formula configuration
router.get('/formula', async (req, res) => {
  try {
    let config = await AppConfig.findOne({ configType: 'STIP_FORMULA' });
    
    // If no config exists in DB yet, return a null payload so frontend uses defaults
    if (!config) {
      return res.status(200).json({ success: true, data: null });
    }

    res.status(200).json({ success: true, data: config });
  } catch (error) {
    console.error("Formula Fetch Error:", error);
    res.status(500).json({ success: false, message: 'Server error fetching formula configuration.' });
  }
});

// PATCH /api/v1/settings/formula - Update the formula configuration
// Restricted to ICT Admin
router.patch('/formula', roleGuard('ICT_ADMIN'), async (req, res) => {
  try {
    const { formula, reason } = req.body;

    if (!formula || !reason) {
      return res.status(400).json({ success: false, message: 'Formula data and a reason for change are required.' });
    }

    let config = await AppConfig.findOne({ configType: 'STIP_FORMULA' });

    const changedByName = req.user.personalDetails 
      ? `${req.user.personalDetails.firstName} ${req.user.personalDetails.lastName} (ICT)`
      : 'ICT Administrator';

    if (!config) {
      // Create new config if it doesn't exist
      config = new AppConfig({
        configType: 'STIP_FORMULA',
        formula: formula,
        history: [{
          id: Date.now().toString(),
          effectiveFrom: new Date(),
          changedBy: changedByName,
          reason: reason,
          previous: null,
          next: formula
        }]
      });
    } else {
      // Update existing config and push to history array
      const previousFormula = config.formula;
      
      config.history.unshift({
        id: Date.now().toString(),
        effectiveFrom: new Date(),
        changedBy: changedByName,
        reason: reason,
        previous: previousFormula,
        next: formula
      });

      config.formula = formula;
    }

    await config.save();

    // Log to system audit trail
    await logAudit({
      user: req.user, role: req.user.role, action: 'FORMULA_UPDATED', category: 'SYSTEM_CONFIG', severity: 'CRITICAL',
      details: `ICT Admin updated STIP calculation formula. Reason: ${reason}`, req
    });

    res.status(200).json({ success: true, message: 'Formula updated successfully.', data: config });
  } catch (error) {
    console.error("Formula Update Error:", error);
    res.status(500).json({ success: false, message: 'Server error updating formula.' });
  }
});

module.exports = router;