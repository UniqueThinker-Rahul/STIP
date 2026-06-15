// backend/src/utils/logger.js
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
          const fullUser = await User.findById(extractedUserId).select('personalDetails username employeeId');
          
          if (fullUser) {
            const fName = fullUser.personalDetails?.firstName || '';
            const lName = fullUser.personalDetails?.lastName || '';
            const fullName = `${fName} ${lName}`.trim();
            const empIdStr = fullUser.employeeId ? ` (ID: ${fullUser.employeeId})` : '';
            
            extractedUserStr = `${fullName || fullUser.username || 'Unnamed User'}${empIdStr}`;
          } else {
            extractedUserStr = 'Deleted/Former User';
          }
        } catch (dbErr) {
          console.error("Failed to fetch user details for log:", dbErr.message);
          extractedUserStr = 'Database Error';
        }
      } 
      // Otherwise, if the full user was already passed
      else {
        const fName = user.personalDetails?.firstName || '';
        const lName = user.personalDetails?.lastName || '';
        const fullName = `${fName} ${lName}`.trim();
        const empIdStr = user.employeeId ? ` (ID: ${user.employeeId})` : '';
        
        extractedUserStr = `${fullName || user.username || 'Unnamed User'}${empIdStr}`;
      }
    }

    // 🚨 UPGRADE: Format details strings safely to capture custom text fields without schema modification
    let formattedDetails = details || 'No details provided.';
    if (extractedUserStr) {
      formattedDetails = `[${extractedUserStr}] ${formattedDetails}`;
    }
    if (metadata) {
      formattedDetails = `${formattedDetails} | Meta: ${JSON.stringify(metadata)}`;
    }

    // 🚨 UPGRADE: Bulletproof IP Address Extraction for Cloud/Proxy Environments
    let clientIp = 'unknown';
    if (req) {
      clientIp = req.headers?.['x-forwarded-for']?.split(',')[0].trim() || 
                 req.ip || 
                 req.connection?.remoteAddress || 
                 'unknown';
    }

    const newLog = new AuditLog({
      user: extractedUserId, // Aligns with standard reference fields
      role: role || 'SYSTEM',
      action: action || 'UNKNOWN_ACTION',
      category: category || 'SYSTEM',
      severity: severity || 'LOW',
      details: formattedDetails, // Contains strings of user descriptions and metadata
      ipAddress: clientIp
    });
    
    await newLog.save();

  } catch (error) {
    console.error("🔥 CRITICAL Audit Logger Utility Error:", error.message);
  }
};

module.exports = { logAudit };