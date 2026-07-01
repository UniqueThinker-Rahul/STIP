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
  // Safely handles both Mongoose maps and standard objects
  const entries = obj instanceof Map ? Array.from(obj.entries()) : Object.entries(obj);
  entries.forEach(([key, val]) => {
    originalObj[key.replace(/_/g, '.')] = val;
  });
  return originalObj;
};

exports.getScorecardsByYear = async (req, res) => {
  try {
    const year = parseInt(req.params.year) || new Date().getFullYear();
    const scorecards = await QuarterlyScorecard.find({ year });

    const formattedData = scorecards.map(doc => {
      // Convert to standard object to guarantee frontend receives the values
      const docObj = doc.toObject();
      docObj.actuals = restoreKeys(docObj.actuals);
      docObj.notes = restoreKeys(docObj.notes);
      return docObj;
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
    const { actuals, notes } = req.body;

    const safeActuals = sanitizeKeys(actuals);
    const safeNotes = sanitizeKeys(notes);

    const scorecard = await QuarterlyScorecard.findOneAndUpdate(
      { year, quarter },
      { 
        $set: { actuals: safeActuals, notes: safeNotes, lastSavedAt: new Date() },
        $setOnInsert: { year, quarter }
      },
      { returnDocument: 'after', upsert: true, setDefaultsOnInsert: true }
    );

    const resultDoc = scorecard.toObject();
    resultDoc.actuals = restoreKeys(resultDoc.actuals);
    resultDoc.notes = restoreKeys(resultDoc.notes);

    res.status(200).json({ success: true, data: resultDoc });
  } catch (error) {
    console.error("Scorecard Save Error:", error);
    res.status(500).json({ success: false, message: 'Server Error saving scorecard' });
  }
};