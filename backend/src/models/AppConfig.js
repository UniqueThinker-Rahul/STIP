const mongoose = require('mongoose');

const appConfigSchema = new mongoose.Schema({
  configType: { type: String, required: true, unique: true }, // e.g., 'SYSTEM_DROPDOWNS'
  companyCodes: [{ type: String }],
  officeLocations: [{ type: String }],
  jobTitles: [{ type: String }],
  rolesMatrix: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, { timestamps: true });



module.exports = mongoose.model('AppConfig', appConfigSchema);