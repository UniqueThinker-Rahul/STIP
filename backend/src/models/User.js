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
    // 🚨 REPLACE the old notificationEmail string with this MAP:
    notificationEmails: { 
      type: Map, 
      of: String, 
      default: {} 
    } 
  },
  
  employmentDetails: {
    jobTitle: { type: String, required: true },
    officeLocation: { type: String, default: 'Unassigned' },
    salary: { type: Number, default: 0 }, // 🚨 ADDED: Salary Field
    dateOfHire: { type: Date, required: true },
    prorateValue: { type: Number, default: 12 },
    rawManagerName: { type: String }, // Temporary field for importing
    reportingTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false } // 🚨 Account Status Field
  },

  security: {
    role: {
      type: String,
      enum: ['EMPLOYEE', 'MANAGER', 'HR_ADMIN', 'CEO', 'ICT_ADMIN'],
      default: 'EMPLOYEE'
    },
    // 🚨 ADD THIS EXACT BLOCK SO MONGODB STOPS DELETING YOUR MULTI-ROLES
    secondaryRoles: [{
      type: String,
      enum: ['EMPLOYEE', 'MANAGER', 'HR_ADMIN', 'CEO', 'ICT_ADMIN']
    }],
    isFirstLogin: {
      type: Boolean,
      default: true
    },
    currentSessionId: {
      type: String,
      default: null
    }
  }
  
}, { timestamps: true });

userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

module.exports = mongoose.model('User', userSchema);