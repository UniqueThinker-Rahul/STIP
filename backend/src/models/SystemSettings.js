const mongoose = require('mongoose');

const systemSettingsSchema = new mongoose.Schema({
  year: { type: Number, required: true, unique: true },
  cpFactor: { 
    type: Number, 
    default: 0.0, 
    min: 0.0, 
    max: 0.15 // Hardcapped at 15%
  }, 
  hrOverride: { type: Boolean, default: false }, // The HR switch to unlock past deadlines
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('SystemSettings', systemSettingsSchema);