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
  isRead: { 
    type: Boolean, 
    default: false 
  },
  actionLink: { 
    type: String // Optional URL to direct the user when they click the notification
  }
}, { timestamps: true });

module.exports = mongoose.model('Notification', notificationSchema);