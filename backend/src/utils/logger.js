const AuditLog = require('../models/AuditLog');
const User = require('../models/User'); 

const logAudit = async ({ user, role, action, category, severity, details, req = null, metadata = null }) => {
  try {
    const extractedUserId = user?._id || user?.id || null;
    let extractedUserStr = 'System Automated';

    if (extractedUserId) {
      // 🧠 SMART CHECK: If the user object is just a lightweight JWT token, fetch their real name from the DB!
      if (!user.personalDetails && !user.username) {
        try {
          // 🚨 UPGRADE: Added 'employeeId' to the database fetch query
          const fullUser = await User.findById(extractedUserId).select('personalDetails username employeeId');
          
          if (fullUser) {
            // User exists in DB - safely extract names and ID
            const fName = fullUser.personalDetails?.firstName || '';
            const lName = fullUser.personalDetails?.lastName || '';
            const fullName = `${fName} ${lName}`.trim();
            const empIdStr = fullUser.employeeId ? ` (ID: ${fullUser.employeeId})` : '';
            
            extractedUserStr = `${fullName || fullUser.username || 'Unnamed User'}${empIdStr}`;
          } else {
            // 🚨 ROOT CAUSE HANDLED: The token is valid, but the user was DELETED from the database!
            extractedUserStr = 'Deleted/Former User';
          }
        } catch (dbErr) {
          console.error("Failed to fetch user details for log:", dbErr.message);
          extractedUserStr = 'Database Error';
        }
      } 
      // Otherwise, if the full user was already passed (like during login)
      else {
        const fName = user.personalDetails?.firstName || '';
        const lName = user.personalDetails?.lastName || '';
        const fullName = `${fName} ${lName}`.trim();
        const empIdStr = user.employeeId ? ` (ID: ${user.employeeId})` : '';
        
        extractedUserStr = `${fullName || user.username || 'Unnamed User'}${empIdStr}`;
      }
    }

    const newLog = new AuditLog({
      userId: extractedUserId,
      userStr: extractedUserStr || 'System Automated',
      role: role || 'SYSTEM',
      action: action || 'UNKNOWN_ACTION',
      category: category || 'SYSTEM',
      severity: severity || 'LOW',
      details: details || 'No details provided.',
      ipAddress: req ? (req.ip || req.connection?.remoteAddress || 'unknown') : 'unknown',
      metadata
    });
    
    await newLog.save();

  } catch (error) {
    console.error("🔥 CRITICAL Audit Logger Utility Error:", error.message);
  }
};

module.exports = { logAudit };