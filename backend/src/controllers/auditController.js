const AuditLog = require('../models/AuditLog');

exports.getAuditLogs = async (req, res) => {
  try {
    // Fetch the 500 most recent logs from the MongoDB Cloud Database
    const logs = await AuditLog.find().sort({ createdAt: -1 }).limit(500);
    res.status(200).json({ success: true, data: logs });
  } catch (error) {
    console.error("Audit Controller Error:", error);
    res.status(500).json({ success: false, message: 'Failed to retrieve audit logs.' });
  }
};