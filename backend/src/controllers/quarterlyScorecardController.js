const QuarterlyScorecard = require('../models/QuarterlyScorecard');

const sanitizeKeys = (obj) => {
  if (!obj || typeof obj !== 'object') return {};
  const safeObj = {};
  Object.keys(obj).forEach(key => {
    safeObj[key.replace(/\./g, '_')] = obj[key];
  });
  return safeObj;
};

const restoreKeys = (obj) => {
  if (!obj || typeof obj !== 'object') return {};
  const originalObj = {};
  const entries = obj instanceof Map ? Array.from(obj.entries()) : Object.entries(obj);
  entries.forEach(([key, val]) => {
    originalObj[key.replace(/_/g, '.')] = val;
  });
  return originalObj;
};

exports.getScorecardsByYear = async (req, res) => {
  try {
    const year = parseInt(req.params.year) || new Date().getFullYear();
    const scorecards = await QuarterlyScorecard.find({ year }).lean();

    const formattedData = scorecards.map(doc => {
      doc.actuals = restoreKeys(doc.actuals);
      doc.notes = restoreKeys(doc.notes);
      doc.important = restoreKeys(doc.important);
      return doc;
    });

    res.status(200).json({ success: true, data: formattedData });
  } catch (error) {
    console.error("Scorecard Fetch Error:", error);
    res.status(500).json({ success: false, message: 'Server Error fetching scorecards' });
  }
};

exports.saveScorecard = async (req, res) => {
  try {
    const year = parseInt(req.params.year) || new Date().getFullYear();
    const quarter = req.params.quarter;
    const { actuals, notes, important, locked } = req.body;

    const existing = await QuarterlyScorecard.findOne({ year, quarter }).lean();
    if (existing && existing.locked && (!req.user || !req.user.role.includes('ICT_ADMIN'))) {
       return res.status(403).json({ success: false, message: "Scorecard is permanently locked." });
    }

    const updateData = {
      actuals: sanitizeKeys(actuals),
      notes: sanitizeKeys(notes),
      important: sanitizeKeys(important),
      lastSavedAt: new Date()
    };

    if (locked !== undefined) {
       updateData.locked = locked;
       if (locked) {
           updateData.lockedBy = req.user ? req.user.id : null;
           updateData.lockedAt = new Date();
       }
    }

    const scorecard = await QuarterlyScorecard.findOneAndUpdate(
      { year, quarter },
      { $set: updateData, $setOnInsert: { year, quarter } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    ).lean();

    scorecard.actuals = restoreKeys(scorecard.actuals);
    scorecard.notes = restoreKeys(scorecard.notes);
    scorecard.important = restoreKeys(scorecard.important);

    res.status(200).json({ success: true, message: 'Scorecard saved successfully.', data: scorecard });
  } catch (error) {
    console.error("Scorecard Save Error:", error);
    res.status(500).json({ success: false, message: 'Database timeout or server error while saving.' });
  }
};