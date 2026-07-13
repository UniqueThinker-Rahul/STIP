const mongoose = require('mongoose');

const quarterlyScorecardSchema = new mongoose.Schema({
  year: { type: Number, required: true },
  quarter: { type: String, required: true },
  actuals: { type: mongoose.Schema.Types.Mixed, default: {} },
  notes: { type: mongoose.Schema.Types.Mixed, default: {} },
  // 🚀 UPGRADED: Added Lock tracking fields
  locked: { type: Boolean, default: false },
  lockedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  lockedAt: { type: Date, default: null },
  lastSavedAt: { type: Date, default: null }
}, { timestamps: true });

quarterlyScorecardSchema.index({ year: 1, quarter: 1 }, { unique: true });
// 🚀 UPGRADED: Added index for sorting by save date quickly
quarterlyScorecardSchema.index({ lastSavedAt: -1 });

module.exports = mongoose.model('QuarterlyScorecard', quarterlyScorecardSchema);