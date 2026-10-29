const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  employeeId: { type: String, required: true, unique: true },
  companyCode: { type: String, required: true },
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  
  personalDetails: {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    notificationEmails: { 
      type: Map, 
      of: String, 
      default: {} 
    } 
  },
  
  employmentDetails: {
    jobTitle: { type: String, required: true },
    officeLocation: { type: String, default: 'Unassigned' },
    salary: { type: Number, default: 0 }, 
    dateOfHire: { type: Date, required: true },
    prorateValue: { type: Number, default: 12 },
    rawManagerName: { type: String }, 
    reportingTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    executiveTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false } 
  },

  security: {
    role: {
      type: String,
      enum: ['EMPLOYEE', 'MANAGER', 'HR_ADMIN', 'CEO', 'ICT_ADMIN', 'EXECUTIVE'],
      default: 'EMPLOYEE'
    },
    secondaryRoles: [{
      type: String,
      enum: ['EMPLOYEE', 'MANAGER', 'HR_ADMIN', 'CEO', 'ICT_ADMIN', 'EXECUTIVE']
    }],
    isFirstLogin: {
      type: Boolean,
      default: true
    },
    currentSessionId: {
      type: String,
      default: null
    },
    // Used for standard employee manual reset requests
    resetRequested: { 
      type: Boolean, 
      default: false 
    },
    resetRequestDate: { 
      type: Date 
    },
    // 🚨 UPGRADE: Added secure token tracking for ICT Admin automated email recovery
    resetPasswordToken: { 
      type: String 
    },
    resetPasswordExpire: { 
      type: Date 
    }
  }
  
}, { timestamps: true });

// Pre-save hook to hash passwords automatically
userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Automatically update managerId on active/draft/pending appraisals when reportingTo changes
userSchema.post('save', async function () {
  if (this.isModified('employmentDetails.reportingTo')) {
    try {
      const Appraisal = mongoose.model('Appraisal');
      await Appraisal.updateMany(
        {
          employeeId: this._id,
          'workflow.status': { $nin: ['APPROVED', 'ACKNOWLEDGED'] }
        },
        {
          $set: { managerId: this.employmentDetails.reportingTo }
        }
      );
    } catch (err) {
      console.error('Error updating appraisals on manager change:', err);
    }
  }
});

userSchema.post(['findOneAndUpdate', 'findByIdAndUpdate'], async function (doc) {
  if (!doc) return;
  const update = this.getUpdate();
  const reportingTo = update.$set 
    ? (update.$set['employmentDetails.reportingTo'] !== undefined ? update.$set['employmentDetails.reportingTo'] : update.$set.employmentDetails?.reportingTo) 
    : (update['employmentDetails.reportingTo'] !== undefined ? update['employmentDetails.reportingTo'] : update.employmentDetails?.reportingTo);

  if (reportingTo !== undefined) {
    try {
      const Appraisal = mongoose.model('Appraisal');
      await Appraisal.updateMany(
        {
          employeeId: doc._id,
          'workflow.status': { $nin: ['APPROVED', 'ACKNOWLEDGED'] }
        },
        {
          $set: { managerId: reportingTo }
        }
      );
    } catch (err) {
      console.error('Error updating appraisals on query manager change:', err);
    }
  }
});

// 🚀 UPGRADE: Added indexes to fix the hanging Staff Directory load times
userSchema.index({ 'security.role': 1, 'employmentDetails.isDeleted': 1 });
userSchema.index({ 'employmentDetails.reportingTo': 1 });
userSchema.index({ 'employmentDetails.executiveTo': 1 });

module.exports = mongoose.model('User', userSchema);