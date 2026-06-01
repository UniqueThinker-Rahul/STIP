const mongoose = require('mongoose');

const appraisalQuarterSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true 
  }, // e.g., "Q1 - 2026"
  year: { 
    type: Number, 
    required: true 
  },
  startDate: { 
    type: Date, 
    required: true 
  },
  endDate: { 
    type: Date, 
    required: true 
  },
  isLocked: { 
    type: Boolean, 
    default: false 
  }, // HR can manually lock this early if needed
  forceUnlock: { 
    type: Boolean, 
    default: false 
  }, // ICT Admin toggle: Bypasses the endDate check if HR requests an extension
  createdBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  }
}, { timestamps: true });

module.exports = mongoose.model('AppraisalQuarter', appraisalQuarterSchema);