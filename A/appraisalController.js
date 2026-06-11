// backend/src/controllers/appraisalController.js
const Appraisal = require('../models/Appraisal');
const User = require('../models/User');
const Notification = require('../models/Notification');
const AppraisalQuarter = require('../models/AppraisalQuarter'); 
const { 
  sendManagerSubmitEmail, 
  sendHRForwardEmail, 
  sendCEOApproveEmail, 
  sendCEORejectEmail 
} = require('../utils/emailService');

// --- HELPER FUNCTION: Trigger Dual Notification ---
const dispatchNotification = async ({ senderId, recipientRole, recipientId, targetRoleContext, title, message, type, actionUrl }) => {
  try {
    let recipients = [];
    if (recipientId) {
      const user = await User.findById(recipientId);
      if (user) recipients.push(user);
    } else if (recipientRole) {
      recipients = await User.find({ 
        'employmentDetails.isDeleted': { $ne: true },
        'employmentDetails.isActive': true,
        $or: [{ 'security.role': recipientRole }, { 'security.secondaryRoles': recipientRole }]
      });
    }

    for (const recipient of recipients) {
      // Create the in-app notification immediately
      await Notification.create({ recipient: recipient._id, sender: senderId, title, message, type, actionUrl });
    }
    
    // We return the specific target emails so the caller can send the rich external emails
    return recipients.map(r => {
       // Pull specific contextual email if exists, otherwise fallback to root email
       let email = null;
       if (r.personalDetails?.notificationEmails?.get) {
         email = r.personalDetails.notificationEmails.get(targetRoleContext) || r.username;
       } else {
         email = r.username; // Assuming username is an email address format in your system
       }
       
       return {
         email,
         firstName: r.personalDetails?.firstName,
         lastName: r.personalDetails?.lastName
       };
    });

  } catch (error) { 
    console.error("Notification Error:", error); 
    return [];
  }
};

const getIprfLabel = (score) => {
    if (score >= 1.3) return 'Exceeds Performance';
    if (score >= 1.0) return 'Fully Effective';
    if (score >= 0.7) return 'Needs Improvement';
    if (score > 0) return 'Less than Satisfactory';
    return 'Not Graded';
};

// 1. Create a new appraisal (Draft or Submitted)
exports.createAppraisal = async (req, res) => {
  try {
    const quarterId = req.body.appraisalQuarter;
    if (!quarterId) return res.status(400).json({ success: false, message: 'Appraisal Quarter ID is required.' });

    const quarter = await AppraisalQuarter.findById(quarterId);
    if (!quarter) return res.status(404).json({ success: false, message: 'Quarter not found in database.' });

    const currentDate = new Date();
    const startDate = new Date(quarter.startDate); startDate.setHours(0,0,0,0);
    const endDate = new Date(quarter.endDate); endDate.setHours(23,59,59,999);

    const isFuture = currentDate < startDate;
    const isPastDeadline = currentDate > endDate;
    
    const isLocked = quarter.isLocked || isFuture || (isPastDeadline && !quarter.forceUnlock);

    if (isLocked) {
      if (isFuture) {
         return res.status(403).json({ success: false, message: `Submissions for ${quarter.name} have not opened yet. They will open on ${startDate.toDateString()}.` });
      } else {
         return res.status(403).json({ success: false, message: `Submissions for ${quarter.name} are locked. The deadline was ${endDate.toDateString()}. Contact HR to request an ICT override.` });
      }
    }

    const existing = await Appraisal.findOne({ 
      employeeId: req.body.employeeId, 
      appraisalQuarter: quarterId 
    }).populate('employeeId', 'personalDetails employeeId companyCode employmentDetails')
      .populate('managerId', 'personalDetails');

    if (existing && existing.workflow.status !== 'DRAFT') {
      return res.status(400).json({ success: false, message: 'Appraisal already submitted for this quarter.' });
    }

    let appraisal;
    let employeeData = null;

    if (existing) {
      employeeData = existing.employeeId;
      Object.assign(existing, {
        managerId: req.body.managerId,
        period: req.body.period,
        scores: req.body.scores,
        calculatedResults: req.body.calculatedResults,
        narrative: req.body.narrative,
        stipAward: req.body.stipAward,
        'workflow.status': req.body.status
      });
      appraisal = await existing.save();
    } else {
      employeeData = await User.findById(req.body.employeeId);
      
      const refCount = await Appraisal.countDocuments();
      const newRef = `APP-${new Date().getFullYear()}-${String(refCount + 1).padStart(4, '0')}`;

      appraisal = new Appraisal({
        appraisalRef: newRef,
        employeeId: req.body.employeeId,
        managerId: req.body.managerId,
        appraisalQuarter: quarterId, 
        period: req.body.period,
        scores: req.body.scores,
        calculatedResults: req.body.calculatedResults,
        narrative: req.body.narrative,
        stipAward: req.body.stipAward,
        'workflow.status': req.body.status
      });
      await appraisal.save();
    }

    // 🚨 FIRE AND FORGET: Handle emails and notifications
    if (req.body.status === 'SUBMITTED' || req.body.status === 'UNDER_HR_REVIEW') {
      const empName = `${employeeData?.personalDetails?.firstName} ${employeeData?.personalDetails?.lastName}`;
      const mgrName = req.user.personalDetails ? `${req.user.personalDetails.firstName} ${req.user.personalDetails.lastName}` : 'Line Manager';
      const iprfScore = req.body.calculatedResults?.finalIprfScore || 0;

      setImmediate(async () => {
        try {
          const hrTargets = await dispatchNotification({
            senderId: req.user.id,
            recipientRole: 'HR_ADMIN',
            targetRoleContext: 'HR_ADMIN', 
            title: 'Appraisal Submitted for HR Review',
            message: `The Line Manager has submitted the ${quarter.name} appraisal for ${empName}. It is now awaiting your review.`,
            type: 'APPRAISAL_SUBMITTED',
            actionUrl: `${process.env.FRONTEND_URL}/dashboard/hr/appraisals`
          });

          // Dispatch Rich Email
          for (const hr of hrTargets) {
            if (hr.email && hr.email.includes('@')) {
               await sendManagerSubmitEmail({
                 toEmail: hr.email,
                 hrName: hr.firstName || 'HR Manager',
                 empName: empName,
                 empId: employeeData?.employeeId || 'N/A',
                 empTitle: employeeData?.employmentDetails?.jobTitle || 'Staff',
                 empCompany: employeeData?.companyCode || 'FSM',
                 mgrName: mgrName,
                 quarter: quarter.name,
                 year: quarter.year,
                 iprfFactor: iprfScore.toFixed(1),
                 iprfLabel: getIprfLabel(iprfScore),
                 submitDate: new Date().toLocaleDateString('en-GB')
               });
            }
          }
        } catch (e) { console.error("Email Dispatch Error:", e) }
      });
    }

    res.status(201).json({ success: true, data: appraisal });
  } catch (error) {
    console.error("Appraisal Creation Error:", error);
    res.status(500).json({ success: false, message: 'Server Error saving appraisal.' });
  }
};

// 2. Get all appraisals
exports.getAllAppraisals = async (req, res) => {
  try {
    const appraisals = await Appraisal.find()
      .populate('employeeId', 'personalDetails employeeId companyCode employmentDetails')
      .populate('managerId', 'personalDetails')
      .populate('appraisalQuarter', 'name year isLocked'); 
      
    res.status(200).json({ success: true, data: appraisals });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error fetching appraisals.' });
  }
};

// 3. HR Forwards Appraisal to CEO
exports.forwardToCEO = async (req, res) => {
  try {
    const appraisal = await Appraisal.findById(req.params.id)
      .populate('employeeId', 'personalDetails employeeId companyCode employmentDetails')
      .populate('managerId', 'personalDetails')
      .populate('appraisalQuarter', 'name year');
      
    if (!appraisal) return res.status(404).json({ success: false, message: 'Appraisal not found.' });

    appraisal.workflow.status = 'WITH_CEO';
    await appraisal.save();

    const empName = `${appraisal.employeeId.personalDetails?.firstName} ${appraisal.employeeId.personalDetails?.lastName}`;
    const mgrName = `${appraisal.managerId?.personalDetails?.firstName || ''} ${appraisal.managerId?.personalDetails?.lastName || ''}`;
    const hrName = req.user.personalDetails ? `${req.user.personalDetails.firstName} ${req.user.personalDetails.lastName}` : 'HR Manager';
    const quarterName = appraisal.appraisalQuarter?.name || `Q3`;
    const quarterYear = appraisal.appraisalQuarter?.year || new Date().getFullYear();
    const iprfScore = appraisal.calculatedResults?.finalIprfScore || 0;
    const isEP = iprfScore >= 1.3;

    // 🚨 FIRE AND FORGET
    setImmediate(async () => {
      try {
        const ceoTargets = await dispatchNotification({
          senderId: req.user.id,
          recipientRole: 'CEO',
          targetRoleContext: 'CEO',
          title: 'Appraisal Ready for Final Approval',
          message: `HR has validated and forwarded the ${quarterName} appraisal for ${empName}. It requires your final approval.`,
          type: 'APPRAISAL_FORWARDED',
          actionUrl: `${process.env.FRONTEND_URL}/dashboard/ceo/approve`
        });

        // Dispatch Rich Email
        for (const ceo of ceoTargets) {
          if (ceo.email && ceo.email.includes('@')) {
            await sendHRForwardEmail({
              toEmail: ceo.email,
              ceoName: ceo.firstName || 'CEO',
              empName: empName,
              empId: appraisal.employeeId.employeeId,
              empTitle: appraisal.employeeId.employmentDetails?.jobTitle,
              empCompany: appraisal.employeeId.companyCode,
              mgrName: mgrName,
              hrName: hrName,
              quarter: quarterName,
              year: quarterYear,
              iprfFactor: iprfScore.toFixed(1),
              iprfLabel: getIprfLabel(iprfScore),
              awardPercent: (appraisal.stipAward || 0).toFixed(2),
              forwardDate: new Date().toLocaleDateString('en-GB'),
              isEP: isEP
            });
          }
        }
      } catch (e) { console.error("Email Dispatch Error:", e) }
    });

    res.status(200).json({ success: true, data: appraisal }); 
  } catch (error) {
    console.error("Forward to CEO Error:", error);
    res.status(500).json({ success: false, message: 'Server Error forwarding appraisal.' });
  }
};

// 4. CEO Approves or Rejects Appraisal
exports.approveRejectAppraisal = async (req, res) => {
  try {
    const { status, comments } = req.body; 
    
    if (!['APPROVED', 'NOT_APPROVED'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status update.' });
    }

    const appraisal = await Appraisal.findById(req.params.id)
      .populate('employeeId', 'personalDetails employeeId')
      .populate('managerId', 'personalDetails')
      .populate('appraisalQuarter', 'name year');

    if (!appraisal) return res.status(404).json({ success: false, message: 'Appraisal not found.' });

    appraisal.workflow.status = status;
    if (comments) {
      appraisal.narrative.ceoComments = comments;
    }
    await appraisal.save();

    const empName = `${appraisal.employeeId.personalDetails?.firstName} ${appraisal.employeeId.personalDetails?.lastName}`;
    const mgrName = `${appraisal.managerId?.personalDetails?.firstName || ''} ${appraisal.managerId?.personalDetails?.lastName || ''}`;
    const ceoName = req.user.personalDetails ? `${req.user.personalDetails.firstName} ${req.user.personalDetails.lastName}` : 'CEO';
    
    const isApproved = status === 'APPROVED';
    const quarterName = appraisal.appraisalQuarter?.name || `Q3`;
    const quarterYear = appraisal.appraisalQuarter?.year || new Date().getFullYear();
    const iprfScore = appraisal.calculatedResults?.finalIprfScore || 0;

    // 🚨 FIRE AND FORGET
    setImmediate(async () => {
      try {
        if (appraisal.managerId) {
          await dispatchNotification({
            senderId: req.user.id,
            recipientId: appraisal.managerId._id,
            targetRoleContext: 'MANAGER',
            title: isApproved ? 'Appraisal Approved' : 'Appraisal Not Approved',
            message: isApproved 
              ? `The ${quarterName} appraisal for ${empName} has been officially approved.`
              : `The ${quarterName} appraisal for ${empName} was returned. Please review the comments and adjust accordingly.`,
            type: isApproved ? 'APPRAISAL_APPROVED' : 'APPRAISAL_REJECTED',
            actionUrl: `${process.env.FRONTEND_URL}/dashboard/manager`
          }); 
        }

        const hrTargets = await dispatchNotification({
          senderId: req.user.id,
          recipientRole: 'HR_ADMIN',
          targetRoleContext: 'HR_ADMIN',
          title: isApproved ? 'Appraisal Approved by CEO' : 'Appraisal Not Approved by CEO',
          message: isApproved 
            ? `The CEO approved the ${quarterName} appraisal for ${empName}.`
            : `The CEO returned the ${quarterName} appraisal for ${empName}. Review comments immediately.`,
          type: isApproved ? 'APPRAISAL_APPROVED' : 'APPRAISAL_REJECTED',
          actionUrl: `${process.env.FRONTEND_URL}/dashboard/hr/appraisals`
        }); 

        // Dispatch Rich Email to HR
        for (const hr of hrTargets) {
          if (hr.email && hr.email.includes('@')) {
            if (isApproved) {
               await sendCEOApproveEmail({
                 toEmail: hr.email,
                 hrName: hr.firstName || 'HR Manager',
                 empName: empName,
                 empId: appraisal.employeeId.employeeId,
                 quarter: quarterName,
                 year: quarterYear,
                 iprfFactor: iprfScore.toFixed(1),
                 iprfLabel: getIprfLabel(iprfScore),
                 ceoName: ceoName,
                 decisionDate: new Date().toLocaleDateString('en-GB')
               });
            } else {
               await sendCEORejectEmail({
                 toEmail: hr.email,
                 hrName: hr.firstName || 'HR Manager',
                 empName: empName,
                 empId: appraisal.employeeId.employeeId,
                 quarter: quarterName,
                 year: quarterYear,
                 iprfFactor: iprfScore.toFixed(1),
                 iprfLabel: getIprfLabel(iprfScore),
                 ceoName: ceoName,
                 decisionDate: new Date().toLocaleDateString('en-GB'),
                 ceoComment: comments || 'No comment provided.',
                 mgrName: mgrName
               });
            }
          }
        }
      } catch (e) { console.error("Email Dispatch Error:", e) }
    });

    res.status(200).json({ success: true, data: appraisal }); 
  } catch (error) {
    console.error("Approve/Reject Error:", error);
    res.status(500).json({ success: false, message: 'Server Error updating appraisal status.' });
  }
};