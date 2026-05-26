const mongoose = require('mongoose');

const appraisalSchema = new mongoose.Schema({
  appraisalRef: { type: String, required: true, unique: true },
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  managerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  
  period: {
    year: { type: Number, required: true },
    quarter: { type: String, enum: ['Q1', 'Q2', 'Q3', 'Q4'], required: true }
  },
  
  workflow: {
    status: { 
      type: String, 
      enum: ['DRAFT', 'SUBMITTED', 'UNDER_HR_REVIEW', 'WITH_CEO', 'APPROVED', 'REOPENED', 'NOT_APPROVED'],
      default: 'DRAFT'
    }
  },
  
  scores: {
    deliveredResults: { rating: Number, weight: { type: Number, default: 0.30 } },
    behaviors: { rating: Number, weight: { type: Number, default: 0.20 } },
    safeWorking: { rating: Number, weight: { type: Number, default: 0.20 } },
    jobCompetence: { rating: Number, weight: { type: Number, default: 0.10 } },
    dependability: { rating: Number, weight: { type: Number, default: 0.10 } },
    adaptability: { rating: Number, weight: { type: Number, default: 0.10 } }
  },
  
  calculatedResults: {
    finalIprfScore: { type: Number, default: 0 },
    isExceedingPerformance: { type: Boolean, default: false }
  }
}, { timestamps: true });

module.exports = mongoose.model('Appraisal', appraisalSchema);