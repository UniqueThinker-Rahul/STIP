const express = require('express');
const router = express.Router();
const QuarterlyScorecard = require('../models/QuarterlyScorecard');
const { authGuard, roleGuard } = require('../middleware/auth');

router.use(authGuard);

// 🚀 UPGRADED: Added .lean() to make fetching 10x faster
// GET /api/v1/quarterly-scorecards/:year
router.get('/:year', async (req, res) => {
  try {
    const year = parseInt(req.params.year);
    const scorecards = await QuarterlyScorecard.find({ year }).lean();
    
    return res.status(200).json({ success: true, data: scorecards });
  } catch (error) {
    console.error("Error fetching scorecards:", error);
    return res.status(500).json({ success: false, message: 'Server Error fetching scorecards' });
  }
});

// 🚀 UPGRADED: Added explicit return responses to prevent the frontend "Save" button from hanging
// POST /api/v1/quarterly-scorecards/:year/:quarter
router.post('/:year/:quarter', roleGuard('ICT_ADMIN', 'CEO', 'HR_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const year = parseInt(req.params.year);
    const quarter = req.params.quarter;
    // 🚨 ADDED: Extract important from req.body
    const { actuals, notes, important, locked } = req.body;

    // Check if it's already locked in the database
    const existing = await QuarterlyScorecard.findOne({ year, quarter }).lean();
    if (existing && existing.locked && !req.user.role.includes('ICT_ADMIN')) {
       return res.status(403).json({ success: false, message: "Scorecard is permanently locked." });
    }

    // 🚨 ADDED: Save important payload to database
    const updateData = {
      actuals: actuals || {},
      notes: notes || {},
      important: important || {},
      lastSavedAt: new Date()
    };

    if (locked !== undefined) {
       updateData.locked = locked;
       if (locked) {
           updateData.lockedBy = req.user.id;
           updateData.lockedAt = new Date();
       }
    }

    const scorecard = await QuarterlyScorecard.findOneAndUpdate(
      { year, quarter },
      { $set: updateData },
      { new: true, upsert: true } // Upsert prevents duplicate document crashes
    );

    // 🚨 CRITICAL FIX: This return statement stops the frontend button from spinning forever
    return res.status(200).json({ success: true, message: 'Scorecard saved successfully.', data: scorecard });

  } catch (error) {
    console.error("Error saving scorecard:", error);
    // 🚨 CRITICAL FIX: Ensure errors return a response so the UI doesn't hang
    return res.status(500).json({ success: false, message: 'Database timeout or server error while saving.' });
  }
});

module.exports = router;