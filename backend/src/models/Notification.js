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
    enum: ['APPRAISAL_SUBMITTED', 'APPRAISAL_FORWARDED', 'APPRAISAL_APPROVED', 'APPRAISAL_REJECTED', 'SYSTEM_ALERT'],
    default: 'SYSTEM_ALERT'
  },
  actionUrl: { 
    type: String 
  },
  // 🚨 UPGRADED: Added targetRole to segregate multi-role user alerts
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