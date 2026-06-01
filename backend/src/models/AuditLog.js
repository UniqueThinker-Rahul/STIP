const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }, 
  userStr: { type: String, required: true }, 
  role: { type: String, required: true },    
  action: { type: String, required: true },  
  category: { 
    type: String, 
    required: true,
    // 🚨 FIX: Added ALL required tracking categories so MongoDB stops rejecting logs
    enum: ['AUTH', 'USER_ACTIVITY', 'DATA_CHANGE', 'SYSTEM', 'API', 'SECURITY', 'ADMIN_ACTION', 'FILE', 'ACCESS', 'WORKFLOW']
  },
  severity: { 
    type: String, 
    required: true,
    enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']
  },
  details: { type: String, required: true }, 
  ipAddress: { type: String },               
  metadata: { type: mongoose.Schema.Types.Mixed } 
}, { timestamps: true }); 

module.exports = mongoose.model('AuditLog', auditLogSchema);