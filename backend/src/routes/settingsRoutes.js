const express = require('express');
const router = express.Router();
const SystemSettings = require('../models/SystemSettings');
const { authGuard, roleGuard } = require('../middleware/auth');

router.use(authGuard);

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

module.exports = router;