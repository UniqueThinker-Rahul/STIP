// backend/src/controllers/appraisalController.js
const Appraisal = require('../models/Appraisal');
const User = require('../models/User');
const Notification = require('../models/Notification');
const AppraisalQuarter = require('../models/AppraisalQuarter'); 
const { sendAppraisalEmail } = require('../utils/emailService');

// --- HELPER FUNCTION: Trigger Dual Notification ---
const dispatchNotification = async ({ senderId, recipientRole, recipientId, targetRoleContext, title, message, type, comments, actionUrl }) => {
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

      // 🚨 CRITICAL FIX: The 'await' keyword has been REMOVED from sendAppraisalEmail.
      // This is true "Fire and Forget". The system will no longer wait for SMTP timeouts!
      sendAppraisalEmail({
        targetUserId: recipient._id,
        targetRoleContext: targetRoleContext, 
        subject: `STIP Alert: ${title}`,
        title: title,
        bodyText: message,
        comments: comments || null, 
        actionUrl: actionUrl || `${process.env.FRONTEND_URL}/dashboard`
      }).catch(err => console.error("Background Email Error:", err));
    }
  } catch (error) { 
    console.error("Notification Error:", error); 
  }
};

// 1. Create a new appraisal (Draft or Submitted)
exports.createAppraisal = async (req, res) => {
  try {
    // ENFORCE QUARTER DEADLINE LOCKOUT 
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

    // Search for existing appraisal using the Quarter
    const existing = await Appraisal.findOne({ 
      employeeId: req.body.employeeId, 
      appraisalQuarter: quarterId 
    }).populate('employeeId', 'personalDetails');

    if (existing && existing.workflow.status !== 'DRAFT') {
      return res.status(400).json({ success: false, message: 'Appraisal already submitted for this quarter.' });
    }

    let appraisal;
    let employeeName = "Employee";

    if (existing) {
      employeeName = `${existing.employeeId.personalDetails?.firstName} ${existing.employeeId.personalDetails?.lastName}`;
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
      const emp = await User.findById(req.body.employeeId);
      if (emp) employeeName = `${emp.personalDetails?.firstName} ${emp.personalDetails?.lastName}`;

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

    // 🚨 TRUE FIRE AND FORGET: Hand off notifications to the background
    if (req.body.status === 'SUBMITTED' || req.body.status === 'UNDER_HR_REVIEW') {
      setImmediate(() => {
        dispatchNotification({
          senderId: req.user.id,
          recipientRole: 'HR_ADMIN',
          targetRoleContext: 'HR_ADMIN', 
          title: 'Appraisal Submitted for HR Review',
          message: `The Line Manager has submitted the ${quarter.name} appraisal for ${employeeName}. It is now awaiting your review.`,
          type: 'APPRAISAL_SUBMITTED',
          comments: { 
            epJustification: req.body.narrative?.epJustification || null,
            manager: req.body.narrative?.generalComments || null
          }, 
          actionUrl: `${process.env.FRONTEND_URL}/dashboard/hr/appraisals`
        }).catch(err => console.error("Background Dispatch Error:", err));
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
      .populate('employeeId', 'personalDetails')
      .populate('appraisalQuarter', 'name');
      
    if (!appraisal) return res.status(404).json({ success: false, message: 'Appraisal not found.' });

    appraisal.workflow.status = 'WITH_CEO';
    await appraisal.save();

    const employeeName = `${appraisal.employeeId.personalDetails?.firstName} ${appraisal.employeeId.personalDetails?.lastName}`;
    const quarterName = appraisal.appraisalQuarter?.name || `CY${appraisal.period.year}`;

    // 🚨 TRUE FIRE AND FORGET: Hand off notifications to the background
    setImmediate(() => {
      dispatchNotification({
        senderId: req.user.id,
        recipientRole: 'CEO',
        targetRoleContext: 'CEO',
        title: 'Appraisal Ready for Final Approval',
        message: `HR has validated and forwarded the ${quarterName} appraisal for ${employeeName}. It requires your final approval.`,
        type: 'APPRAISAL_FORWARDED',
        comments: { 
          hr: req.body.hrComment || appraisal.narrative?.hrComments || null,
          manager: appraisal.narrative?.generalComments || null,
          epJustification: appraisal.narrative?.epJustification || null
        },
        actionUrl: `${process.env.FRONTEND_URL}/dashboard/ceo/approve`
      }).catch(err => console.error("Background Dispatch Error:", err));
    });

    res.status(200).json({ success: true, data: appraisal }); 
  } catch (error) {
    console.error("Forward to CEO Error:", error);
    res.status(500).json({ success: false, message: 'Server Error forwarding appraisal.' });
  }
};

// 4. CEO/HR Approves or Rejects Appraisal
exports.approveRejectAppraisal = async (req, res) => {
  try {
    const { status, comments } = req.body; 
    
    if (!['APPROVED', 'NOT_APPROVED'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status update.' });
    }

    const appraisal = await Appraisal.findById(req.params.id)
      .populate('employeeId', 'personalDetails')
      .populate('managerId', 'personalDetails')
      .populate('appraisalQuarter', 'name');

    if (!appraisal) return res.status(404).json({ success: false, message: 'Appraisal not found.' });

    appraisal.workflow.status = status;
    if (comments) {
      appraisal.narrative.ceoComments = comments;
    }
    await appraisal.save();

    const employeeName = `${appraisal.employeeId.personalDetails?.firstName} ${appraisal.employeeId.personalDetails?.lastName}`;
    const isApproved = status === 'APPROVED';
    const quarterName = appraisal.appraisalQuarter?.name || `CY${appraisal.period.year}`;

    const commentsPayload = {
      ceo: comments || appraisal.narrative?.ceoComments,
      hr: appraisal.narrative?.hrComments,
      manager: appraisal.narrative?.generalComments,
      epJustification: appraisal.narrative?.epJustification
    };

    const notificationConfig = {
      senderId: req.user.id,
      title: isApproved ? 'Appraisal Approved' : 'Appraisal Not Approved',
      message: isApproved 
        ? `The ${quarterName} appraisal for ${employeeName} has been officially approved.`
        : `The ${quarterName} appraisal for ${employeeName} was returned. Please review the comments and adjust accordingly.`,
      type: isApproved ? 'APPRAISAL_APPROVED' : 'APPRAISAL_REJECTED',
      comments: commentsPayload, 
      actionUrl: `${process.env.FRONTEND_URL}/dashboard`
    };

    // 🚨 TRUE FIRE AND FORGET: Hand off notifications to the background
    setImmediate(() => {
      if (appraisal.managerId) {
        dispatchNotification({
          ...notificationConfig,
          recipientId: appraisal.managerId._id,
          targetRoleContext: 'MANAGER'
        }).catch(err => console.error("Background Dispatch Error:", err)); 
      }

      dispatchNotification({
        ...notificationConfig,
        recipientRole: 'HR_ADMIN',
        targetRoleContext: 'HR_ADMIN'
      }).catch(err => console.error("Background Dispatch Error:", err)); 
    });

    res.status(200).json({ success: true, data: appraisal }); 
  } catch (error) {
    console.error("Approve/Reject Error:", error);
    res.status(500).json({ success: false, message: 'Server Error updating appraisal status.' });
  }
};