// backend/src/models/Notification.js
const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipient: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  sender: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  },
  title: { 
    type: String, 
    required: true 
  },
  message: { 
    type: String, 
    required: true 
  },
  type: { 
    type: String, 
    // 🚨 THE FIX: Added 'SECURITY_ALERT' to the allowed Mongoose enum list!
    enum: ['APPRAISAL_SUBMITTED', 'APPRAISAL_FORWARDED', 'APPRAISAL_APPROVED', 'APPRAISAL_REJECTED', 'SYSTEM_ALERT', 'SECURITY_ALERT'],
    default: 'SYSTEM_ALERT'
  },
  actionUrl: { 
    type: String 
  },
  targetRole: {
    type: String,
    enum: ['EMPLOYEE', 'MANAGER', 'HR_ADMIN', 'CEO', 'ICT_ADMIN'],
    required: true
  },
  isRead: { 
    type: Boolean, 
    default: false 
  }
}, { timestamps: true });

module.exports = mongoose.model('Notification', notificationSchema);