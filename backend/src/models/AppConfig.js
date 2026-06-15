const mongoose = require('mongoose');

const appConfigSchema = new mongoose.Schema({
  configType: { type: String, required: true, unique: true }, // e.g., 'SYSTEM_DROPDOWNS', 'STIP_FORMULA'
  companyCodes: [{ type: String }],
  officeLocations: [{ type: String }],
  jobTitles: [{ type: String }],
  rolesMatrix: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  
  // 🚨 UPGRADE: Added for Dynamic Formula Configuration
  formula: { type: Object },
  history: [{
    id: String,
    effectiveFrom: Date,
    changedBy: String,
    reason: String,
    previous: Object,
    next: Object
  }]
}, { timestamps: true });

module.exports = mongoose.model('AppConfig', appConfigSchema);