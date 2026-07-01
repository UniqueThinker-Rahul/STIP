// backend/src/models/AuditLog.js
const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  role: { type: String },
  action: { type: String, required: true },
  category: { 
    type: String, 
    // 🚨 UPGRADE: Added 'API' to the allowed enum array to resolve the server crash
    enum: ['USER_MANAGEMENT', 'APPRAISAL_WORKFLOW', 'ADMIN_ACTION', 'SECURITY', 'SYSTEM_CONFIG', 'SYSTEM', 'AUTH', 'WORKFLOW', 'API'], 
    required: true 
  },
  severity: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], default: 'LOW' },
  details: { type: String },
  ipAddress: { type: String },
  createdAt: { 
    type: Date, 
    default: Date.now,
    expires: 15552000 
  }
});

module.exports = mongoose.model('AuditLog', auditLogSchema);