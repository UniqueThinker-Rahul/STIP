const mongoose = require('mongoose');

const quarterlyScorecardSchema = new mongoose.Schema({
  year: { type: Number, required: true },
  quarter: { type: String, required: true },
  // 🚨 UPGRADED: Changed from Map to Mixed to prevent data stripping on refresh
  actuals: { type: mongoose.Schema.Types.Mixed, default: {} },
  notes: { type: mongoose.Schema.Types.Mixed, default: {} },
  lastSavedAt: { type: Date, default: null }
}, { timestamps: true });

quarterlyScorecardSchema.index({ year: 1, quarter: 1 }, { unique: true });

module.exports = mongoose.model('QuarterlyScorecard', quarterlyScorecardSchema);