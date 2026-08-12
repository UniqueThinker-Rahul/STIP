// backend/src/events/emailListeners.js
const eventBus = require('./eventBus');
const User = require('../models/User');
// 🚨 THE FIX: Import the Notification model so the background worker can create bell alerts
const Notification = require('../models/Notification'); 
const { 
  sendAdminPasswordAlertEmail,
  sendManagerSubmitEmail,
  sendHRForwardEmail,
  sendCEOApproveEmail,
  sendCEORejectEmail
} = require('../utils/emailService');

// --- HELPER FUNCTION: Bulletproof Email Extraction ---
const extractEmailSafe = (user, roleContext) => {
  let email = null;
  if (user.personalDetails && user.personalDetails.notificationEmails) {
    if (typeof user.personalDetails.notificationEmails.get === 'function') {
      email = user.personalDetails.notificationEmails.get(roleContext);
    } else {
      email = user.personalDetails.notificationEmails[roleContext];
    }
  }
  return email || user.username; 
};


// ============================================================================
// EVENT 1: ICT ADMIN - PASSWORD RESET REQUEST
// ============================================================================
eventBus.on('PASSWORD_RESET_REQUESTED', async (data) => {
  try {
    const { user, contactDataProvided, formattedDateTime } = data;
    
    console.log(`\n📧 [EVENT SYSTEM] Processing PASSWORD_RESET_REQUESTED...`);
    const ictAdmins = await User.find({
      'employmentDetails.isActive': true,
      'employmentDetails.isDeleted': { $ne: true },
      $or: [ { 'security.role': 'ICT_ADMIN' }, { 'security.secondaryRoles': 'ICT_ADMIN' } ]
    });

    const empFullName = `${user.personalDetails?.firstName} ${user.personalDetails?.lastName}`;

    for (const admin of ictAdmins) {
      
      // 🚨 THE FIX: Re-added the in-app Bell Notification creation!
      await Notification.create({
        recipient: admin._id,
        sender: user._id,
        title: 'Secure Reset Request',
        message: `A password reset override was requested by ${empFullName} (${user.employeeId}).`,
        type: 'SECURITY_ALERT',
        actionUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard/ict/reset-password`,
        targetRole: 'ICT_ADMIN'
      });
      console.log(`   -> 🔔 SUCCESS: Bell Notification saved for ${admin.personalDetails?.firstName}`);

      // Dispatch the Email
      const adminEmail = extractEmailSafe(admin, 'ICT_ADMIN');
      
      if (adminEmail && adminEmail.includes('@')) {
         await sendAdminPasswordAlertEmail({
           toEmail: adminEmail,
           adminName: admin.personalDetails?.firstName || 'Admin',
           empName: empFullName,
           empId: user.employeeId,
           empTitle: user.employmentDetails?.jobTitle || 'Staff Member',
           empCompany: user.companyCode || 'FSM',
           empOffice: user.employmentDetails?.officeLocation || 'Unassigned',
           requestDate: formattedDateTime,
           contactDataProvided: contactDataProvided
         });
         console.log(`   -> ✅ SUCCESS: Password Reset Alert sent to ${adminEmail}`);
      } else {
         console.log(`   -> 🔴 SKIPPED: Invalid email format for ICT Admin (${adminEmail}).`);
      }
    }
  } catch (error) {
    console.error("📧 [EVENT ERROR] Failed processing PASSWORD_RESET_REQUESTED:", error);
  }
});


// ============================================================================
// EVENT 2: HR ADMIN - APPRAISAL SUBMITTED
// ============================================================================
eventBus.on('APPRAISAL_SUBMITTED', async (data) => {
  try {
    const { employeeData, mgrName, quarter, iprfScore, iprfLabel, submitDate } = data;
    
    console.log(`\n📧 [EVENT SYSTEM] Processing APPRAISAL_SUBMITTED...`);
    const empName = `${employeeData?.personalDetails?.firstName} ${employeeData?.personalDetails?.lastName}`;
    
    const hrTargets = await User.find({
      'employmentDetails.isActive': true,
      'employmentDetails.isDeleted': { $ne: true },
      $or: [ { 'security.role': 'HR_ADMIN' }, { 'security.secondaryRoles': 'HR_ADMIN' } ]
    });

    for (const hr of hrTargets) {
      const adminEmail = extractEmailSafe(hr, 'HR_ADMIN');
      
      if (adminEmail && adminEmail.includes('@')) {
         await sendManagerSubmitEmail({
           toEmail: adminEmail,
           hrName: hr.personalDetails?.firstName || 'HR Manager',
           empName: empName,
           empId: employeeData?.employeeId || 'N/A',
           empTitle: employeeData?.employmentDetails?.jobTitle || 'Staff',
           empCompany: employeeData?.companyCode || 'FSM',
           mgrName: mgrName,
           quarter: quarter.name,
           year: quarter.year,
           iprfFactor: iprfScore.toFixed(1),
           iprfLabel: iprfLabel,
           submitDate: submitDate
         });
         console.log(`   -> ✅ SUCCESS: HR Alert sent to ${adminEmail}`);
      } else {
         console.log(`   -> 🔴 SKIPPED: Invalid email format for HR Admin (${adminEmail}).`);
      }
    }
  } catch (error) {
    console.error("📧 [EVENT ERROR] Failed processing APPRAISAL_SUBMITTED:", error);
  }
});


// ============================================================================
// EVENT 3: CEO - APPRAISAL FORWARDED
// ============================================================================
eventBus.on('APPRAISAL_FORWARDED', async (data) => {
  try {
    const { appraisal, empName, mgrName, hrName, quarterName, quarterYear, iprfScore, iprfLabel, isEP, forwardDate } = data;
    
    console.log(`\n📧 [EVENT SYSTEM] Processing APPRAISAL_FORWARDED...`);
    const ceoTargets = await User.find({
      'employmentDetails.isActive': true,
      'employmentDetails.isDeleted': { $ne: true },
      $or: [ { 'security.role': 'CEO' }, { 'security.secondaryRoles': 'CEO' } ]
    });

    for (const ceo of ceoTargets) {
      const adminEmail = extractEmailSafe(ceo, 'CEO');
      
      if (adminEmail && adminEmail.includes('@')) {
        await sendHRForwardEmail({
          toEmail: adminEmail,
          ceoName: ceo.personalDetails?.firstName || 'CEO',
          empName: empName,
          empId: appraisal.employeeId.employeeId,
          empTitle: appraisal.employeeId.employmentDetails?.jobTitle,
          empCompany: appraisal.employeeId.companyCode,
          mgrName: mgrName,
          hrName: hrName,
          quarter: quarterName,
          year: quarterYear,
          iprfFactor: iprfScore.toFixed(1),
          iprfLabel: iprfLabel,
          awardPercent: (appraisal.stipAward || 0).toFixed(2),
          forwardDate: forwardDate,
          isEP: isEP
        });
        console.log(`   -> ✅ SUCCESS: CEO Alert sent to ${adminEmail}`);
      } else {
         console.log(`   -> 🔴 SKIPPED: Invalid email format for CEO (${adminEmail}).`);
      }
    }
  } catch (error) {
    console.error("📧 [EVENT ERROR] Failed processing APPRAISAL_FORWARDED:", error);
  }
});


// ============================================================================
// EVENT 4: MANAGER & HR - APPRAISAL DECISION (APPROVED/REJECTED)
// ============================================================================
eventBus.on('APPRAISAL_DECISION', async (data) => {
  try {
    const { appraisal, status, empName, mgrName, ceoName, quarterName, quarterYear, iprfScore, iprfLabel, decisionDate, comments } = data;
    const isApproved = status === 'APPROVED';
    
    console.log(`\n📧 [EVENT SYSTEM] Processing APPRAISAL_DECISION (${status})...`);

    // 1. Notify Manager (If Assigned)
    if (appraisal.managerId) {
      const manager = await User.findById(appraisal.managerId._id || appraisal.managerId);
      if (manager) {
        const mgrEmail = extractEmailSafe(manager, 'MANAGER');
        if (mgrEmail && mgrEmail.includes('@')) {
          if (isApproved) {
             await sendCEOApproveEmail({
               toEmail: mgrEmail, recipientName: manager.personalDetails?.firstName || 'Manager', empName, empId: appraisal.employeeId.employeeId, quarter: quarterName, year: quarterYear, iprfFactor: iprfScore.toFixed(1), iprfLabel, ceoName, decisionDate
             });
          } else {
             await sendCEORejectEmail({
               toEmail: mgrEmail, recipientName: manager.personalDetails?.firstName || 'Manager', empName, empId: appraisal.employeeId.employeeId, quarter: quarterName, year: quarterYear, iprfFactor: iprfScore.toFixed(1), iprfLabel, ceoName, decisionDate, ceoComment: comments || 'No comment provided.', mgrName
             });
          }
          console.log(`   -> ✅ SUCCESS: Decision Alert sent to Manager ${mgrEmail}`);
        }
      }
    }

    // 2. Notify HR Admins
    const hrTargets = await User.find({
      'employmentDetails.isActive': true,
      'employmentDetails.isDeleted': { $ne: true },
      $or: [ { 'security.role': 'HR_ADMIN' }, { 'security.secondaryRoles': 'HR_ADMIN' } ]
    });

    for (const hr of hrTargets) {
      const hrEmail = extractEmailSafe(hr, 'HR_ADMIN');
      if (hrEmail && hrEmail.includes('@')) {
        if (isApproved) {
           await sendCEOApproveEmail({
             toEmail: hrEmail, recipientName: hr.personalDetails?.firstName || 'HR Admin', empName, empId: appraisal.employeeId.employeeId, quarter: quarterName, year: quarterYear, iprfFactor: iprfScore.toFixed(1), iprfLabel, ceoName, decisionDate
           });
        } else {
           await sendCEORejectEmail({
             toEmail: hrEmail, recipientName: hr.personalDetails?.firstName || 'HR Admin', empName, empId: appraisal.employeeId.employeeId, quarter: quarterName, year: quarterYear, iprfFactor: iprfScore.toFixed(1), iprfLabel, ceoName, decisionDate, ceoComment: comments || 'No comment provided.', mgrName
           });
        }
        console.log(`   -> ✅ SUCCESS: Decision Alert sent to HR ${hrEmail}`);
      }
    }
  } catch (error) {
    console.error("📧 [EVENT ERROR] Failed processing APPRAISAL_DECISION:", error);
  }
});