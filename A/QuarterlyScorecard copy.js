const mongoose = require('mongoose');

const quarterlyScorecardSchema = new mongoose.Schema({
  year: { type: Number, required: true },
  quarter: { type: String, required: true },
  actuals: { type: mongoose.Schema.Types.Mixed, default: {} },
  notes: { type: mongoose.Schema.Types.Mixed, default: {} },
  important: { type: mongoose.Schema.Types.Mixed, default: {} },
  maxes: { type: mongoose.Schema.Types.Mixed, default: {} }, // 🚨 Added to safely support custom editable maximums
  locked: { type: Boolean, default: false },
  lockedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  lockedAt: { type: Date, default: null },
  lastSavedAt: { type: Date, default: null }
}, { timestamps: true });

quarterlyScorecardSchema.index({ year: 1, quarter: 1 }, { unique: true });
quarterlyScorecardSchema.index({ lastSavedAt: -1 });

// Safe export to prevent "find is not a function" crashes during server reloads
const QuarterlyScorecard = mongoose.models.QuarterlyScorecard || mongoose.model('QuarterlyScorecard', quarterlyScorecardSchema);

module.exports = QuarterlyScorecard;