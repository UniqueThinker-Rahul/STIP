const mongoose = require('mongoose');

const offenceSchema = new mongoose.Schema({
  offence: { type: String, required: true },
  action: { type: String, required: true },
  occurrence: { type: String, required: true }
});

const disciplinaryCaseSchema = new mongoose.Schema({
  employeeId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  raisedBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true // The manager who raised it
  },
  offences: [offenceSchema],
  dateRaised: { 
    type: Date, 
    required: true 
  },
  statement: { 
    type: String, 
    required: true 
  },
  isSerious: { 
    type: Boolean, 
    default: false 
  },
  status: { 
    type: String, 
    enum: ['DRAFT', 'SUBMITTED_TO_HR', 'UNDER_INVESTIGATION', 'CLOSED'],
    default: 'DRAFT' 
  },
  attachedFiles: [{ type: String }], // Array of file names (can be upgraded to S3 URLs later)
}, { timestamps: true });

module.exports = mongoose.model('DisciplinaryCase', disciplinaryCaseSchema);