const express = require('express');
const router = express.Router();
const Appraisal = require('../models/Appraisal');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { authGuard, roleGuard } = require('../middleware/auth');

const { 
  sendManagerSubmitEmail, 
  sendHRForwardEmail, 
  sendCEOApproveEmail, 
  sendCEORejectEmail 
} = require('../utils/emailService');

router.use(authGuard);

const getIprfLabel = (score) => {
    if (score >= 1.3) return 'Exceeds Performance';
    if (score >= 1.0) return 'Fully Effective';
    if (score >= 0.7) return 'Needs Improvement';
    if (score > 0) return 'Less than Satisfactory';
    return 'Not Graded';
};

// Find this helper function at the top of your backend/src/routes/appraisalRoutes.js
const dispatchNotification = async ({ senderId, recipientRole, recipientId, targetRoleContext, title, message, type, actionUrl }) => {
  try {
    let recipients = [];
    if (recipientId) {
      const user = await User.findById(recipientId);
      if (user) recipients.push(user);
    } else if (recipientRole) {
      const foundUsers = await User.find({ 
        'employmentDetails.isDeleted': { $ne: true },
        'employmentDetails.isActive': true,
        $or: [ { 'security.role': recipientRole }, { 'security.secondaryRoles': recipientRole } ]
      });
      if (foundUsers) recipients = foundUsers;
    }

    for (const recipient of recipients) {
      if (!recipient || !recipient._id) continue;
      
      // 🚨 UPGRADED: Saves the targetRole so it routes to the correct dashboard
      await Notification.create({ 
        recipient: recipient._id, 
        sender: senderId, 
        title, 
        message, 
        type, 
        actionUrl,
        targetRole: targetRoleContext || recipientRole || 'EMPLOYEE' // Injection mapping
      });
      
      console.log(`🔔 [IN-APP] Saved DB notification for ${recipient.personalDetails?.firstName} (Routed to: ${targetRoleContext})`);
    }

    return recipients.map(r => {
       let email = null;
       if (r.personalDetails?.notificationEmails?.get) {
         email = r.personalDetails.notificationEmails.get(targetRoleContext) || r.username;
       } else {
         email = r.username; 
       }
       return { email, firstName: r.personalDetails?.firstName, lastName: r.personalDetails?.lastName };
    });
  } catch (error) {
    console.error("Notification Dispatch Error:", error);
    return [];
  }
};

// 1. GET /api/v1/appraisals
router.get('/', async (req, res) => {
  try {
    let query = {};
    const userId = req.user.id || req.user._id;

    if (req.user.role === 'MANAGER') query.managerId = userId;
    else if (req.user.role === 'EMPLOYEE') {
      query.employeeId = userId;
      query['workflow.status'] = 'APPROVED'; 
    }

    const appraisals = await Appraisal.find(query)
      .populate('employeeId', 'employeeId personalDetails companyCode employmentDetails')
      .populate('managerId', 'personalDetails')
      .populate('appraisalQuarter', 'name year isLocked');

    res.json({ count: appraisals.length, data: appraisals });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching appraisals.', error: error.message });
  }
});

// 2. POST /api/v1/appraisals - Create or Update
router.post('/', roleGuard('MANAGER'), async (req, res) => {
  try {
    const { employeeId, reviewYear, period, scores, calculatedResults, stipAward, narrative, status, appraisalQuarter } = req.body;
    const managerId = req.user.id || req.user._id;

    if (!appraisalQuarter) return res.status(400).json({ message: 'Appraisal Quarter ID is required.' });

    const actualYear = reviewYear || 2026;
    const actualQuarter = period?.quarter || 'Q3';

    let appraisal = await Appraisal.findOne({ employeeId, appraisalQuarter });

    if (appraisal) {
      if (!['DRAFT', 'REOPENED', 'NOT_APPROVED'].includes(appraisal.workflow.status)) {
        return res.status(403).json({ message: 'Cannot edit an appraisal that has already been submitted.' });
      }
    } else {
      appraisal = new Appraisal({
        employeeId, managerId, appraisalQuarter, reviewYear: actualYear,
        period: { quarter: actualQuarter, year: actualYear },
        appraisalRef: `APP-${Date.now().toString().slice(-6)}`
      });
    }

    if (!appraisal.scores) appraisal.scores = {};
    if (!appraisal.calculatedResults) appraisal.calculatedResults = {};
    if (!appraisal.narrative) appraisal.narrative = {};
    if (!appraisal.workflow) appraisal.workflow = {};

    if (scores) {
      if (scores.expectedResults !== undefined) appraisal.scores.deliveredResults = { rating: Number(scores.expectedResults), weight: 0.3 };
      if (scores.initiative !== undefined) appraisal.scores.behaviors = { rating: Number(scores.initiative), weight: 0.2 };
      if (scores.safeWorking !== undefined) appraisal.scores.safeWorking = { rating: Number(scores.safeWorking), weight: 0.2 };
      if (scores.jobCompetence !== undefined) appraisal.scores.jobCompetence = { rating: Number(scores.jobCompetence), weight: 0.1 };
      if (scores.dependability !== undefined) appraisal.scores.dependability = { rating: Number(scores.dependability), weight: 0.1 };
      if (scores.adaptability !== undefined) appraisal.scores.adaptability = { rating: Number(scores.adaptability), weight: 0.1 };
    }

    if (calculatedResults?.finalIprfScore !== undefined) appraisal.calculatedResults.finalIprfScore = calculatedResults.finalIprfScore;
    if (stipAward !== undefined) appraisal.stipAward = parseFloat(stipAward);

    if (narrative) {
      appraisal.narrative.generalComments = narrative.generalComments || '';
      appraisal.narrative.epJustification = narrative.epJustification || '';
    }

    appraisal.workflow.status = status || 'DRAFT';
    appraisal.workflow.lastUpdatedBy = managerId;
    await appraisal.save();

    if (status === 'SUBMITTED' || status === 'UNDER_HR_REVIEW') {
      const emp = await User.findById(employeeId);
      const employeeName = emp ? `${emp.personalDetails?.firstName} ${emp.personalDetails?.lastName}` : 'Employee';
      
      const actionUser = await User.findById(managerId);
      const mgrName = actionUser?.personalDetails ? `${actionUser.personalDetails.firstName} ${actionUser.personalDetails.lastName}` : 'Line Manager';
      
      const iprfScore = calculatedResults?.finalIprfScore || 0;
      const formattedDateTime = new Date().toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

      setImmediate(async () => {
        try { // <--- MAKE SURE THIS IS HERE
          console.log(`\n📧 [EMAIL TRIGGER 1] Manager Submitted Appraisal for ${employeeName}...`);
          const hrTargets = await dispatchNotification({
            senderId: managerId, recipientRole: 'HR_ADMIN', targetRoleContext: 'HR_ADMIN',
            title: 'Appraisal Submitted for HR Review',
            message: `The Line Manager has submitted the appraisal for ${employeeName}. It is now awaiting your review.`,
            type: 'APPRAISAL_SUBMITTED', actionUrl: `${process.env.FRONTEND_URL}/dashboard/hr/appraisals`
          });

          for (const hr of hrTargets) {
            console.log(`   -> Target: ${hr.firstName} | Extracted Email: "${hr.email}"`);
            if (hr.email && hr.email.includes('@')) {
               console.log(`   -> 🟢 VALID EMAIL. Firing SMTP request...`);
               await sendManagerSubmitEmail({
                 toEmail: hr.email, hrName: hr.firstName || 'HR Manager',
                 empName: employeeName, empId: emp?.employeeId || 'N/A',
                 empTitle: emp?.employmentDetails?.jobTitle || 'Staff',
                 empCompany: emp?.companyCode || 'FSM',
                 mgrName: mgrName, quarter: actualQuarter, year: actualYear,
                 iprfFactor: iprfScore.toFixed(1), iprfLabel: getIprfLabel(iprfScore),
                 submitDate: formattedDateTime
               });
               console.log(`   -> ✅ SUCCESS.`);
            } else { console.log(`   -> 🔴 SKIPPED. Invalid email address.`); }
          }
        } catch (emailError) { // <--- MAKE SURE THE 'TRY' BLOCK IS CLOSED WITH } RIGHT BEFORE THIS
          console.error("📧 [EMAIL SYSTEM FAILURE]:", emailError.message);
        }
      });
    }

    res.status(201).json({ message: status === 'DRAFT' ? 'Draft saved successfully.' : 'Appraisal submitted successfully.', data: appraisal });
  } catch (error) { // <--- THIS IS YOUR EXISTING CATCH FOR THE MAIN ROUTE
    console.error("Database Save Error:", error);
    res.status(500).json({ message: 'Failed to save appraisal record.', error: error.message });
  }
});

// 3. Move to HR Review
router.patch('/:id/review', roleGuard('HR_ADMIN'), async (req, res) => {
  try {
    await Appraisal.findByIdAndUpdate(req.params.id, { $set: { 'workflow.status': 'UNDER_HR_REVIEW', 'workflow.lastUpdatedBy': req.user.id || req.user._id } }, { returnDocument: 'after' });
    res.json({ message: 'Appraisal is now under HR review.' });
  } catch (error) { res.status(500).json({ message: 'Workflow state transition failure.' }); }
});

// 4. HR Approves the appraisal -> Sends to CEO
router.patch('/:id/approve', roleGuard('HR_ADMIN'), async (req, res) => {
  try {
    const appraisal = await Appraisal.findById(req.params.id)
      .populate('employeeId', 'personalDetails employeeId companyCode employmentDetails')
      .populate('managerId', 'personalDetails')
      .populate('appraisalQuarter', 'name year');
      
    if (!appraisal) return res.status(404).json({ message: 'Appraisal not found' });

    if (!appraisal.narrative) appraisal.narrative = {};
    appraisal.narrative.hrComments = req.body.hrNotes || 'Approved by HR';
    appraisal.workflow.status = 'WITH_CEO'; 
    appraisal.workflow.lastUpdatedBy = req.user.id || req.user._id;
    await appraisal.save();

    const empName = `${appraisal.employeeId.personalDetails?.firstName} ${appraisal.employeeId.personalDetails?.lastName}`;
    const mgrName = appraisal.managerId ? `${appraisal.managerId.personalDetails?.firstName} ${appraisal.managerId.personalDetails?.lastName}` : 'Line Manager';
    
    // 🚨 FIX: Dynamically fetch active HR User from DB
    const actionUser = await User.findById(req.user.id || req.user._id);
    const hrName = actionUser?.personalDetails ? `${actionUser.personalDetails.firstName} ${actionUser.personalDetails.lastName}` : 'HR Manager';
    
    const qName = appraisal.appraisalQuarter?.name || appraisal.period?.quarter || 'Q3';
    const qYear = appraisal.appraisalQuarter?.year || appraisal.period?.year || new Date().getFullYear();
    const iprfScore = appraisal.calculatedResults?.finalIprfScore || 0;
    
    // 🚨 FIX: Appended exact time to the date
    const formattedDateTime = new Date().toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

    setImmediate(async () => {
      console.log(`\n📧 [EMAIL TRIGGER 2] HR Forwarded Appraisal to CEO for ${empName}...`);
      const ceoTargets = await dispatchNotification({
        senderId: req.user.id, recipientRole: 'CEO', targetRoleContext: 'CEO',
        title: 'Appraisal Ready for Final Approval',
        message: `HR has validated and forwarded the appraisal for ${empName}. It requires your final approval.`,
        type: 'APPRAISAL_FORWARDED', actionUrl: `${process.env.FRONTEND_URL}/dashboard/ceo/approve`
      });

      for (const ceo of ceoTargets) {
        console.log(`   -> Target: ${ceo.firstName} | Extracted Email: "${ceo.email}"`);
        if (ceo.email && ceo.email.includes('@')) {
           console.log(`   -> 🟢 VALID EMAIL. Firing SMTP request...`);
           await sendHRForwardEmail({
             toEmail: ceo.email, ceoName: ceo.firstName || 'CEO',
             empName: empName, empId: appraisal.employeeId.employeeId,
             empTitle: appraisal.employeeId.employmentDetails?.jobTitle || 'Staff',
             empCompany: appraisal.employeeId.companyCode || 'FSM',
             mgrName: mgrName, hrName: hrName, quarter: qName, year: qYear,
             iprfFactor: iprfScore.toFixed(1), iprfLabel: getIprfLabel(iprfScore),
             awardPercent: (appraisal.stipAward || 0).toFixed(2),
             forwardDate: formattedDateTime, isEP: iprfScore >= 1.3
           });
           console.log(`   -> ✅ SUCCESS.`);
        } else { console.log(`   -> 🔴 SKIPPED. Invalid email address.`); }
      }
    });

    res.json({ message: 'Appraisal approved by HR and queued for CEO.', status: 'WITH_CEO' });
  } catch (error) { res.status(500).json({ message: 'Approval failure.', error: error.message }); }
});

// 5. CEO Final Approval
router.patch('/:id/ceo-approve', roleGuard('CEO'), async (req, res) => {
  try {
    const appraisal = await Appraisal.findById(req.params.id)
      .populate('employeeId', 'personalDetails employeeId')
      .populate('managerId', 'personalDetails')
      .populate('appraisalQuarter', 'name year');
      
    if (!appraisal) return res.status(404).json({ message: 'Appraisal not found' });

    if (!appraisal.narrative) appraisal.narrative = {};
    appraisal.narrative.ceoComments = req.body.notes || 'Final Approval by CEO';
    appraisal.workflow.status = 'APPROVED'; 
    appraisal.workflow.lastUpdatedBy = req.user.id || req.user._id;
    await appraisal.save();

    const empName = `${appraisal.employeeId.personalDetails?.firstName} ${appraisal.employeeId.personalDetails?.lastName}`;
    
    // 🚨 FIX: Dynamically fetch active CEO User from DB
    const actionUser = await User.findById(req.user.id || req.user._id);
    const ceoName = actionUser?.personalDetails ? `${actionUser.personalDetails.firstName} ${actionUser.personalDetails.lastName}` : 'CEO';
    
    const qName = appraisal.appraisalQuarter?.name || appraisal.period?.quarter || 'Q3';
    const qYear = appraisal.appraisalQuarter?.year || appraisal.period?.year || new Date().getFullYear();
    const iprfScore = appraisal.calculatedResults?.finalIprfScore || 0;
    
    // 🚨 FIX: Appended exact time to the date
    const formattedDateTime = new Date().toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

    setImmediate(async () => {
      console.log(`\n📧 [EMAIL TRIGGER 3A] CEO Approved Appraisal for ${empName}...`);
      let managerTargets = [];
      if (appraisal.managerId) {
        managerTargets = await dispatchNotification({
          senderId: req.user.id, recipientId: appraisal.managerId._id, targetRoleContext: 'MANAGER',
          title: 'Appraisal Approved', message: `The appraisal for ${empName} has been officially approved.`,
          type: 'APPRAISAL_APPROVED', actionUrl: `${process.env.FRONTEND_URL}/dashboard/manager`
        });
      }
      const hrTargets = await dispatchNotification({
        senderId: req.user.id, recipientRole: 'HR_ADMIN', targetRoleContext: 'HR_ADMIN',
        title: 'Appraisal Approved', message: `The CEO approved the appraisal for ${empName}.`,
        type: 'APPRAISAL_APPROVED', actionUrl: `${process.env.FRONTEND_URL}/dashboard/hr/appraisals`
      });

      const allTargets = [...hrTargets, ...managerTargets];
      for (const target of allTargets) {
        console.log(`   -> Target: ${target.firstName} | Extracted Email: "${target.email}"`);
        if (target.email && target.email.includes('@')) {
           console.log(`   -> 🟢 VALID EMAIL. Firing SMTP request...`);
           await sendCEOApproveEmail({
             toEmail: target.email, recipientName: target.firstName || 'User',
             empName: empName, empId: appraisal.employeeId.employeeId,
             quarter: qName, year: qYear,
             iprfFactor: iprfScore.toFixed(1), iprfLabel: getIprfLabel(iprfScore),
             ceoName: ceoName, decisionDate: formattedDateTime
           });
           console.log(`   -> ✅ SUCCESS.`);
        } else { console.log(`   -> 🔴 SKIPPED. Invalid email address.`); }
      }
    });

    res.json({ message: 'Appraisal successfully approved by CEO.', status: 'APPROVED' });
  } catch (error) { res.status(500).json({ message: 'CEO Approval failure.' }); }
});

// 6. Reject back to Manager
router.patch('/:id/reopen', roleGuard('HR_ADMIN', 'CEO'), async (req, res) => {
  try {
    const appraisal = await Appraisal.findById(req.params.id)
      .populate('employeeId', 'personalDetails employeeId')
      .populate('managerId', 'personalDetails')
      .populate('appraisalQuarter', 'name year');
      
    if (!appraisal) return res.status(404).json({ message: 'Appraisal record not found.' });

    const newStatus = req.user.role === 'CEO' ? 'NOT_APPROVED' : 'REOPENED';
    if (!appraisal.narrative) appraisal.narrative = {};
    
    const rejectionComment = req.body.hrNotes || req.body.notes || 'Rejected. Please revise.';
    if (req.user.role === 'CEO') appraisal.narrative.ceoComments = rejectionComment;
    else appraisal.narrative.hrComments = rejectionComment;

    appraisal.workflow.status = newStatus;
    appraisal.workflow.lastUpdatedBy = req.user.id || req.user._id;
    await appraisal.save();

    const empName = `${appraisal.employeeId.personalDetails?.firstName} ${appraisal.employeeId.personalDetails?.lastName}`;
    const mgrName = appraisal.managerId ? `${appraisal.managerId.personalDetails?.firstName} ${appraisal.managerId.personalDetails?.lastName}` : 'Line Manager';
    
    // 🚨 FIX: Dynamically fetch active rejector User from DB
    const actionUser = await User.findById(req.user.id || req.user._id);
    const rejectorName = actionUser?.personalDetails ? `${actionUser.personalDetails.firstName} ${actionUser.personalDetails.lastName}` : (req.user.role === 'CEO' ? 'CEO' : 'HR');
    
    const qName = appraisal.appraisalQuarter?.name || appraisal.period?.quarter || 'Q3';
    const qYear = appraisal.appraisalQuarter?.year || appraisal.period?.year || new Date().getFullYear();
    const iprfScore = appraisal.calculatedResults?.finalIprfScore || 0;
    
    // 🚨 FIX: Appended exact time to the date
    const formattedDateTime = new Date().toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

    setImmediate(async () => {
      console.log(`\n📧 [EMAIL TRIGGER 3B] Appraisal Rejected for ${empName}...`);
      let managerTargets = [];
      if (appraisal.managerId) {
        managerTargets = await dispatchNotification({
          senderId: req.user.id, recipientId: appraisal.managerId._id, targetRoleContext: 'MANAGER',
          title: 'Appraisal Revisions Required', message: `The appraisal for ${empName} was returned. Please review the feedback.`,
          type: 'APPRAISAL_REJECTED', actionUrl: `${process.env.FRONTEND_URL}/dashboard/manager`
        });
      }
      const hrTargets = await dispatchNotification({
        senderId: req.user.id, recipientRole: 'HR_ADMIN', targetRoleContext: 'HR_ADMIN',
        title: 'Appraisal Rejected', message: `${rejectorName} returned the appraisal for ${empName}.`,
        type: 'APPRAISAL_REJECTED', actionUrl: `${process.env.FRONTEND_URL}/dashboard/hr/appraisals`
      });

      const allTargets = req.user.role === 'CEO' ? [...hrTargets, ...managerTargets] : managerTargets;
      for (const target of allTargets) {
        console.log(`   -> Target: ${target.firstName} | Extracted Email: "${target.email}"`);
        if (target.email && target.email.includes('@')) {
           console.log(`   -> 🟢 VALID EMAIL. Firing SMTP request...`);
           await sendCEORejectEmail({
             toEmail: target.email, recipientName: target.firstName || 'User',
             empName: empName, empId: appraisal.employeeId.employeeId,
             quarter: qName, year: qYear,
             iprfFactor: iprfScore.toFixed(1), iprfLabel: getIprfLabel(iprfScore),
             ceoName: rejectorName, decisionDate: formattedDateTime,
             ceoComment: rejectionComment, mgrName: mgrName
           });
           console.log(`   -> ✅ SUCCESS.`);
        } else { console.log(`   -> 🔴 SKIPPED. Invalid email address.`); }
      }
    });

    res.json({ message: 'Appraisal returned to Manager. Notifications dispatched.', status: newStatus });
  } catch (error) { res.status(500).json({ message: 'Reopen failure.', error: error.message }); }
});

// 7. Delete a draft
router.delete('/:id', roleGuard('MANAGER', 'HR_ADMIN'), async (req, res) => {
  try {
    const appraisal = await Appraisal.findById(req.params.id);
    if (!appraisal) return res.status(404).json({ message: 'Appraisal not found.' });

    if (appraisal.workflow.status !== 'DRAFT' && req.user.role !== 'HR_ADMIN') {
      return res.status(403).json({ message: 'You can only delete DRAFT appraisals.' });
    }

    await Appraisal.findByIdAndDelete(req.params.id);
    res.json({ message: 'Draft deleted successfully.' });
  } catch (error) { res.status(500).json({ message: 'Error deleting appraisal.' }); }
});

module.exports = router;