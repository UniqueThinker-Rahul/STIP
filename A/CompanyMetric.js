// backend/src/models/CompanyMetric.js
const mongoose = require('mongoose');

const companyMetricSchema = new mongoose.Schema({
  reviewYear: { type: Number, required: true, unique: true },
  financialResilience: { type: Number, default: null },
  operationalEffectiveness: { type: Number, default: null },
  humanCapital: { type: Number, default: null },
  safetyEnvironment: { type: Number, default: null },
  reputationalCapital: { type: Number, default: null },
  bscRawScore: { type: Number, default: null },
  cpPct: { type: Number, default: null },
  locked: { type: Boolean, default: false },
  lockedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  lockedAt: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model('CompanyMetric', companyMetricSchema);