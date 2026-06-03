const express = require('express');
const router = express.Router();
const Appraisal = require('../models/Appraisal');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { sendAppraisalEmail } = require('../utils/emailService');
const { authGuard, roleGuard } = require('../middleware/auth');

router.use(authGuard);

// --- HELPER FUNCTION: Trigger Email & In-App Notification ---
const dispatchNotification = async ({ senderId, recipientRole, recipientId, title, message, type, comment, actionUrl }) => {
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
      if (foundUsers && foundUsers.length > 0) recipients = foundUsers;
    }

    for (const recipient of recipients) {
      if (!recipient || !recipient._id) continue;
      
      // 1. Create In-App Notification
      await Notification.create({ recipient: recipient._id, sender: senderId, title, message, type, actionUrl });
      
      // 2. Trigger Mailtrap Email
      await sendAppraisalEmail({
        targetUserId: recipient._id,
        subject: `STIP Alert: ${title}`,
        title: title,
        bodyText: message,
        comment: comment || null,
        actionUrl: actionUrl || `${process.env.FRONTEND_URL}/dashboard`
      });
    }
  } catch (error) {
    console.error("Notification Dispatch Error:", error);
  }
};

// 1. GET /api/v1/appraisals - Fetch Appraisals
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
      .populate('appraisalQuarter', 'name year isLocked'); // Ensure quarter populates

    res.json({ count: appraisals.length, data: appraisals });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching appraisals.', error: error.message });
  }
});

// 2. POST /api/v1/appraisals - Create or Update an Appraisal
router.post('/', roleGuard('MANAGER'), async (req, res) => {
  try {
    // 🚨 FIX 1: Extracted appraisalQuarter
    const { employeeId, reviewYear, period, scores, calculatedResults, stipAward, narrative, status, appraisalQuarter } = req.body;
    const managerId = req.user.id || req.user._id;

    if (!appraisalQuarter) return res.status(400).json({ message: 'Appraisal Quarter ID is required.' });

    const actualYear = reviewYear || 2026;
    const actualQuarter = period?.quarter || 'Q3';

    let appraisal = await Appraisal.findOne({ 
      employeeId, 
      appraisalQuarter 
    });

    if (appraisal) {
      if (!['DRAFT', 'REOPENED', 'NOT_APPROVED'].includes(appraisal.workflow.status)) {
        return res.status(403).json({ message: 'Cannot edit an appraisal that has already been submitted.' });
      }
    } else {
      // 🚨 FIX 2: Added appraisalQuarter to DB creation mapping
      appraisal = new Appraisal({
        employeeId,
        managerId,
        appraisalQuarter, 
        reviewYear: actualYear,
        period: { quarter: actualQuarter, year: actualYear },
        appraisalRef: `APP-${Date.now().toString().slice(-6)}`
      });
    }

    if (!appraisal.scores) appraisal.scores = {};
    if (!appraisal.calculatedResults) appraisal.calculatedResults = {};
    if (!appraisal.narrative) appraisal.narrative = {};
    if (!appraisal.workflow) appraisal.workflow = {};

    // 🚨 FIX 3: Safe Object Casting for Scores to prevent Mongoose crash
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

    // 🚨 FIX 4: Fire Email if Submitted
    if (status === 'SUBMITTED' || status === 'UNDER_HR_REVIEW') {
      const emp = await User.findById(employeeId);
      const employeeName = emp ? `${emp.personalDetails?.firstName} ${emp.personalDetails?.lastName}` : 'Employee';
      await dispatchNotification({
        senderId: managerId,
        recipientRole: 'HR_ADMIN',
        title: 'Appraisal Submitted for HR Review',
        message: `The Line Manager has submitted the appraisal for ${employeeName}. It is now awaiting your review.`,
        type: 'APPRAISAL_SUBMITTED',
        comment: narrative?.epJustification || null,
        actionUrl: `${process.env.FRONTEND_URL}/dashboard/hr/appraisals`
      });
    }

    res.status(201).json({ 
      message: status === 'DRAFT' ? 'Draft saved successfully.' : 'Appraisal submitted successfully.',
      data: appraisal 
    });

  } catch (error) {
    console.error("Database Save Error:", error);
    res.status(500).json({ message: 'Failed to save appraisal record.', error: error.message });
  }
});

// 3. Move to HR Review
router.patch('/:id/review', roleGuard('HR_ADMIN'), async (req, res) => {
  try {
    await Appraisal.findByIdAndUpdate(req.params.id, {
      $set: {
        'workflow.status': 'UNDER_HR_REVIEW',
        'workflow.lastUpdatedBy': req.user.id || req.user._id
      }
    });
    res.json({ message: 'Appraisal is now under HR review.' });
  } catch (error) {
    res.status(500).json({ message: 'Workflow state transition failure.', error: error.message });
  }
});

// 4. HR Approves the appraisal
router.patch('/:id/approve', roleGuard('HR_ADMIN'), async (req, res) => {
  try {
    const appraisal = await Appraisal.findById(req.params.id).populate('employeeId', 'personalDetails');
    if (!appraisal) return res.status(404).json({ message: 'Appraisal not found' });

    if (!appraisal.narrative) appraisal.narrative = {};
    appraisal.narrative.hrComments = req.body.hrNotes || 'Approved by HR';
    appraisal.workflow.status = 'WITH_CEO'; 
    appraisal.workflow.lastUpdatedBy = req.user.id || req.user._id;

    await appraisal.save();

    // 🚨 FIX: Email CEO
    const employeeName = `${appraisal.employeeId.personalDetails?.firstName} ${appraisal.employeeId.personalDetails?.lastName}`;
    await dispatchNotification({
      senderId: req.user.id || req.user._id,
      recipientRole: 'CEO',
      title: 'Appraisal Ready for Final Approval',
      message: `HR has validated and forwarded the appraisal for ${employeeName}. It requires your final approval.`,
      type: 'APPRAISAL_FORWARDED',
      comment: req.body.hrNotes || null,
      actionUrl: `${process.env.FRONTEND_URL}/dashboard/ceo/approve`
    });

    res.json({ message: 'Appraisal approved by HR and queued for CEO.', status: 'WITH_CEO' });
  } catch (error) {
    console.error("Approve Route Error:", error);
    res.status(500).json({ message: 'Approval failure.', error: error.message });
  }
});

// 5. Send to CEO
router.patch('/:id/forward', roleGuard('HR_ADMIN', 'CEO'), async (req, res) => {
  try {
    await Appraisal.findByIdAndUpdate(req.params.id, {
      $set: {
        'workflow.status': 'WITH_CEO',
        'workflow.lastUpdatedBy': req.user.id || req.user._id
      }
    });
    res.json({ message: 'Forwarded to Executive Queue.', status: 'WITH_CEO' });
  } catch (error) {
    res.status(500).json({ message: 'Forward failure.', error: error.message });
  }
});

// 6. CEO Final Approval
router.patch('/:id/ceo-approve', roleGuard('CEO'), async (req, res) => {
  try {
    const appraisal = await Appraisal.findById(req.params.id).populate('employeeId', 'personalDetails');
    if (!appraisal) return res.status(404).json({ message: 'Appraisal not found' });

    if (!appraisal.narrative) appraisal.narrative = {};
    appraisal.narrative.ceoComments = req.body.notes || 'Final Approval by CEO';
    appraisal.workflow.status = 'APPROVED'; 
    appraisal.workflow.lastUpdatedBy = req.user.id || req.user._id;

    await appraisal.save();

    // 🚨 FIX: Email HR & Manager
    const employeeName = `${appraisal.employeeId.personalDetails?.firstName} ${appraisal.employeeId.personalDetails?.lastName}`;
    const notificationConfig = {
      senderId: req.user.id || req.user._id,
      title: 'Appraisal Approved',
      message: `The appraisal for ${employeeName} has been officially approved by the CEO.`,
      type: 'APPRAISAL_APPROVED',
      comment: req.body.notes || null,
      actionUrl: `${process.env.FRONTEND_URL}/dashboard`
    };

    if (appraisal.managerId) await dispatchNotification({ ...notificationConfig, recipientId: appraisal.managerId });
    await dispatchNotification({ ...notificationConfig, recipientRole: 'HR_ADMIN' });

    res.json({ message: 'Appraisal successfully approved by CEO.', status: 'APPROVED' });
  } catch (error) {
    res.status(500).json({ message: 'CEO Approval failure.', error: error.message });
  }
});

// 7. Reject back to Manager
router.patch('/:id/reopen', roleGuard('HR_ADMIN', 'CEO'), async (req, res) => {
  try {
    const appraisal = await Appraisal.findById(req.params.id).populate('employeeId', 'personalDetails');
    if (!appraisal) return res.status(404).json({ message: 'Appraisal record not found.' });

    const newStatus = req.user.role === 'CEO' ? 'NOT_APPROVED' : 'REOPENED';
    
    if (!appraisal.narrative) appraisal.narrative = {};
    
    if (req.user.role === 'CEO') {
      appraisal.narrative.ceoComments = req.body.hrNotes || 'Rejected by CEO. Please revise.';
    } else {
      appraisal.narrative.hrComments = req.body.hrNotes || 'Rejected by HR. Please revise.';
    }

    appraisal.workflow.status = newStatus;
    appraisal.workflow.lastUpdatedBy = req.user.id || req.user._id;

    await appraisal.save();

    // 🚨 FIX: Email HR & Manager on Rejection
    const employeeName = `${appraisal.employeeId.personalDetails?.firstName} ${appraisal.employeeId.personalDetails?.lastName}`;
    const notificationConfig = {
      senderId: req.user.id || req.user._id,
      title: 'Appraisal Revisions Required',
      message: `The appraisal for ${employeeName} was returned by ${req.user.role === 'CEO' ? 'the CEO' : 'HR'}. Please review the feedback.`,
      type: 'APPRAISAL_REJECTED',
      comment: req.body.hrNotes || req.body.notes || null,
      actionUrl: `${process.env.FRONTEND_URL}/dashboard`
    };

    if (appraisal.managerId) await dispatchNotification({ ...notificationConfig, recipientId: appraisal.managerId });
    await dispatchNotification({ ...notificationConfig, recipientRole: 'HR_ADMIN' });

    res.json({ message: 'Appraisal returned to Manager. Email notifications dispatched.', status: newStatus });
  } catch (error) {
    res.status(500).json({ message: 'Reopen failure.', error: error.message });
  }
});

// 8. Delete a draft
router.delete('/:id', roleGuard('MANAGER', 'HR_ADMIN'), async (req, res) => {
  try {
    const appraisal = await Appraisal.findById(req.params.id);
    if (!appraisal) return res.status(404).json({ message: 'Appraisal not found.' });

    if (appraisal.workflow.status !== 'DRAFT' && req.user.role !== 'HR_ADMIN') {
      return res.status(403).json({ message: 'You can only delete DRAFT appraisals.' });
    }

    await Appraisal.findByIdAndDelete(req.params.id);
    res.json({ message: 'Draft deleted successfully.' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting appraisal.', error: error.message });
  }
});

module.exports = router;