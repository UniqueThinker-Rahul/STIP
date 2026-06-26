const express = require('express');
const router = express.Router();
const Appraisal = require('../models/Appraisal');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { authGuard, roleGuard } = require('../middleware/auth');

// Imported the logger system to track workflow actions
const { logAudit } = require('../utils/logger');

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
      
      await Notification.create({ 
        recipient: recipient._id, 
        sender: senderId, 
        title, 
        message, 
        type, 
        actionUrl,
        targetRole: targetRoleContext || recipientRole || 'EMPLOYEE'
      });
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

// Real-time Analytics Aggregation with Bulletproof Date Filtering
router.get('/analytics/category-averages', async (req, res) => {
  try {
    let matchStage = {
       'workflow.status': 'APPROVED' 
    };

    if (req.user.role === 'MANAGER' && req.query.scope === 'team') {
       matchStage.managerId = req.user.id || req.user._id;
    }

    let pipeline = [];
    pipeline.push({ $match: matchStage });

    const yearFilter = req.query.year && req.query.year !== 'ALL';
    const quarterFilter = req.query.quarter && req.query.quarter !== 'ALL';

    if (yearFilter || quarterFilter) {
      pipeline.push({
        $lookup: {
          from: 'quarters', 
          localField: 'appraisalQuarter',
          foreignField: '_id',
          as: 'quarterDoc'
        }
      });

      let andConditions = [];

      if (yearFilter) {
        const yrNum = parseInt(req.query.year);
        const yrStr = String(req.query.year);
        andConditions.push({
          $or: [
            { reviewYear: yrNum },
            { reviewYear: yrStr },
            { 'period.year': yrNum },
            { 'period.year': yrStr },
            { 'quarterDoc.year': yrNum },
            { 'quarterDoc.year': yrStr }
          ]
        });
      }

      if (quarterFilter) {
        andConditions.push({
          $or: [
            { 'period.quarter': req.query.quarter },
            { 'quarterDoc.name': req.query.quarter }
          ]
        });
      }

      if (andConditions.length > 0) {
        pipeline.push({ $match: { $and: andConditions } });
      }
    }

    pipeline.push({
      $group: {
        _id: null,
        totalCount: { $sum: 1 }, 
        JobCompetence: { $avg: "$scores.jobCompetence.rating" },
        Dependability: { $avg: "$scores.dependability.rating" },
        ExpectedResults: { $avg: "$scores.deliveredResults.rating" },
        Adaptability: { $avg: "$scores.adaptability.rating" },
        SafeWorking: { $avg: "$scores.safeWorking.rating" },
        Initiative: { $avg: "$scores.behaviors.rating" } 
      }
    });

    const aggregation = await Appraisal.aggregate(pipeline);

    const result = aggregation[0] || { totalCount: 0 };
    
    const data = [
      { name: 'Job Competence', score: Number((result.JobCompetence || 0).toFixed(2)) },
      { name: 'Dependability', score: Number((result.Dependability || 0).toFixed(2)) },
      { name: 'Expected Results', score: Number((result.ExpectedResults || 0).toFixed(2)) },
      { name: 'Adaptability/Flexibility', score: Number((result.Adaptability || 0).toFixed(2)) },
      { name: 'Safe Working Environment', score: Number((result.SafeWorking || 0).toFixed(2)) },
      { name: 'Initiative', score: Number((result.Initiative || 0).toFixed(2)) }
    ];

    res.status(200).json({ success: true, count: result.totalCount, data });
  } catch (error) {
    console.error("Aggregation error:", error);
    res.status(500).json({ success: false, message: 'Failed to fetch analytics' });
  }
});

// 1. GET /api/v1/appraisals
router.get('/', async (req, res) => {
  try {
    let query = {};
    const userId = req.user.id || req.user._id;

    if (req.user.role === 'MANAGER') {
      query.managerId = userId;
    } else if (req.user.role === 'EMPLOYEE') {
      query.employeeId = userId;
      // 🚨 CRITICAL FIX: Removed `query['workflow.status'] = 'APPROVED';` 
      // This blocked employees from seeing their live, pending appraisal status.
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

    const actualYear = reviewYear || new Date().getFullYear();
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

    const empForLog = await User.findById(employeeId).select('personalDetails');
    const empNameLog = empForLog ? `${empForLog.personalDetails?.firstName} ${empForLog.personalDetails?.lastName}` : 'Employee';

    await logAudit({
      user: req.user, 
      role: req.user.role, 
      action: status === 'DRAFT' ? 'APPRAISAL_DRAFT_SAVED' : 'APPRAISAL_SUBMITTED', 
      category: 'APPRAISAL_WORKFLOW', 
      severity: status === 'DRAFT' ? 'LOW' : 'MEDIUM',
      details: `${status === 'DRAFT' ? 'Manager saved draft' : 'Manager submitted'} appraisal for ${empNameLog} (${actualQuarter} ${actualYear}).`, 
      req
    });

    if (status === 'SUBMITTED' || status === 'UNDER_HR_REVIEW') {
      const emp = await User.findById(employeeId);
      const employeeName = emp ? `${emp.personalDetails?.firstName} ${emp.personalDetails?.lastName}` : 'Employee';
      
      const actionUser = await User.findById(managerId);
      const mgrName = actionUser?.personalDetails ? `${actionUser.personalDetails.firstName} ${actionUser.personalDetails.lastName}` : 'Line Manager';
      
      const iprfScore = calculatedResults?.finalIprfScore || 0;
      const formattedDateTime = new Date().toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

      setImmediate(async () => {
        try { 
          const hrTargets = await dispatchNotification({
            senderId: managerId, recipientRole: 'HR_ADMIN', targetRoleContext: 'HR_ADMIN',
            title: 'Appraisal Submitted for HR Review',
            message: `The Line Manager has submitted the appraisal for ${employeeName}. It is now awaiting your review.`,
            type: 'APPRAISAL_SUBMITTED', actionUrl: `${process.env.FRONTEND_URL}/dashboard/hr/appraisals`
          });

          for (const hr of hrTargets) {
            if (hr.email && hr.email.includes('@')) {
               await sendManagerSubmitEmail({
                 toEmail: hr.email, hrName: hr.firstName || 'HR Manager',
                 empName: employeeName, empId: emp?.employeeId || 'N/A',
                 empTitle: emp?.employmentDetails?.jobTitle || 'Staff',
                 empCompany: emp?.companyCode || 'FSM',
                 mgrName: mgrName, quarter: actualQuarter, year: actualYear,
                 iprfFactor: iprfScore.toFixed(1), iprfLabel: getIprfLabel(iprfScore),
                 submitDate: formattedDateTime
               });
            }
          }
        } catch (emailError) { 
          console.error("📧 [EMAIL SYSTEM FAILURE]:", emailError.message);
        }
      });
    }

    res.status(201).json({ message: status === 'DRAFT' ? 'Draft saved successfully.' : 'Appraisal submitted successfully.', data: appraisal });
  } catch (error) { 
    console.error("Database Save Error:", error);
    res.status(500).json({ message: 'Failed to save appraisal record.', error: error.message });
  }
});

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

    await logAudit({
      user: req.user, role: req.user.role, action: 'APPRAISAL_HR_APPROVED', category: 'APPRAISAL_WORKFLOW', severity: 'MEDIUM',
      details: `HR validated appraisal for ${empName} and forwarded it to the CEO.`, req
    });

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

        for (const ceo of ceoTargets) {
          let adminEmail = null;
          if (ceo.personalDetails && ceo.personalDetails.notificationEmails) {
            if (typeof ceo.personalDetails.notificationEmails.get === 'function') {
              adminEmail = ceo.personalDetails.notificationEmails.get('CEO');
            } else {
              adminEmail = ceo.personalDetails.notificationEmails['CEO'];
            }
          }
          if (!adminEmail) {
            adminEmail = ceo.username; 
          }
          
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
              iprfLabel: getIprfLabel(iprfScore),
              awardPercent: (appraisal.stipAward || 0).toFixed(2),
              forwardDate: new Date().toLocaleDateString('en-GB'),
              isEP: isEP
            });
          }
        }
      } catch (e) { console.error("📧 [EMAIL SYSTEM CRASH]:", e) }
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
      .populate('managerId', 'personalDetails username notificationEmails')
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

    await logAudit({
      user: req.user, 
      role: req.user.role, 
      action: isApproved ? 'APPRAISAL_CEO_APPROVED' : 'APPRAISAL_REJECTED', 
      category: 'APPRAISAL_WORKFLOW', 
      severity: isApproved ? 'HIGH' : 'MEDIUM',
      details: isApproved ? `CEO officially approved the appraisal for ${empName}.` : `CEO returned the appraisal for ${empName}.`, 
      req
    });

    setImmediate(async () => {
      try {        
        let managerTargets = [];
        if (appraisal.managerId) {
          managerTargets = await dispatchNotification({
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

        // --- Process Line Managers ---
        if (managerTargets.length > 0) {
            for (const target of managerTargets) {
              let adminEmail = null;
              if (target.personalDetails && target.personalDetails.notificationEmails) {
                if (typeof target.personalDetails.notificationEmails.get === 'function') {
                  adminEmail = target.personalDetails.notificationEmails.get('MANAGER');
                } else {
                  adminEmail = target.personalDetails.notificationEmails['MANAGER'];
                }
              }
              if (!adminEmail) adminEmail = target.username; 
              
              if (adminEmail && adminEmail.includes('@')) {
                if (isApproved) {
                   await sendCEOApproveEmail({
                     toEmail: adminEmail,
                     recipientName: target.personalDetails?.firstName || 'Manager', 
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
                     toEmail: adminEmail,
                     recipientName: target.personalDetails?.firstName || 'Manager',
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
        }

        // --- Process HR Admins ---
        if (hrTargets.length > 0) {
            for (const target of hrTargets) {
              let adminEmail = null;
              if (target.personalDetails && target.personalDetails.notificationEmails) {
                if (typeof target.personalDetails.notificationEmails.get === 'function') {
                  adminEmail = target.personalDetails.notificationEmails.get('HR_ADMIN');
                } else {
                  adminEmail = target.personalDetails.notificationEmails['HR_ADMIN'];
                }
              }
              if (!adminEmail) adminEmail = target.username; 
              
              if (adminEmail && adminEmail.includes('@')) {
                if (isApproved) {
                   await sendCEOApproveEmail({
                     toEmail: adminEmail,
                     recipientName: target.personalDetails?.firstName || 'HR Manager', 
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
                     toEmail: adminEmail,
                     recipientName: target.personalDetails?.firstName || 'HR Manager',
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
        }

      } catch (e) { console.error("📧 [EMAIL SYSTEM CRASH]:", e) }
    });

    res.status(200).json({ success: true, data: appraisal }); 
  } catch (error) {
    console.error("Approve/Reject Error:", error);
    res.status(500).json({ success: false, message: 'Server Error updating appraisal status.' });
  }
};

// Move to HR Review
router.patch('/:id/review', roleGuard('HR_ADMIN'), async (req, res) => {
  try {
    const updatedApp = await Appraisal.findByIdAndUpdate(req.params.id, { $set: { 'workflow.status': 'UNDER_HR_REVIEW', 'workflow.lastUpdatedBy': req.user.id || req.user._id } }, { returnDocument: 'after' });
    
    await logAudit({
      user: req.user, role: req.user.role, action: 'APPRAISAL_UNDER_REVIEW', category: 'APPRAISAL_WORKFLOW', severity: 'LOW',
      details: `HR initiated review for appraisal record: ${updatedApp.appraisalRef || req.params.id}.`, req
    });

    res.json({ message: 'Appraisal is now under HR review.' });
  } catch (error) { res.status(500).json({ message: 'Workflow state transition failure.' }); }
});

// HR Approves the appraisal -> Sends to CEO
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
    
    await logAudit({
      user: req.user, role: req.user.role, action: 'APPRAISAL_HR_APPROVED', category: 'APPRAISAL_WORKFLOW', severity: 'MEDIUM',
      details: `HR approved appraisal for ${empName} and forwarded to CEO.`, req
    });

    const actionUser = await User.findById(req.user.id || req.user._id);
    const hrName = actionUser?.personalDetails ? `${actionUser.personalDetails.firstName} ${actionUser.personalDetails.lastName}` : 'HR Manager';
    
    const qName = appraisal.appraisalQuarter?.name || appraisal.period?.quarter || 'Q3';
    const qYear = appraisal.appraisalQuarter?.year || appraisal.period?.year || new Date().getFullYear();
    const iprfScore = appraisal.calculatedResults?.finalIprfScore || 0;
    
    const formattedDateTime = new Date().toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

    setImmediate(async () => {
      const ceoTargets = await dispatchNotification({
        senderId: req.user.id, recipientRole: 'CEO', targetRoleContext: 'CEO',
        title: 'Appraisal Ready for Final Approval',
        message: `HR has validated and forwarded the appraisal for ${empName}. It requires your final approval.`,
        type: 'APPRAISAL_FORWARDED', actionUrl: `${process.env.FRONTEND_URL}/dashboard/ceo/approve`
      });

      for (const ceo of ceoTargets) {
        if (ceo.email && ceo.email.includes('@')) {
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
        }
      }
    });

    res.json({ message: 'Appraisal approved by HR and queued for CEO.', status: 'WITH_CEO' });
  } catch (error) { res.status(500).json({ message: 'Approval failure.', error: error.message }); }
});

// CEO Final Approval
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
    
    await logAudit({
      user: req.user, role: req.user.role, action: 'APPRAISAL_CEO_APPROVED', category: 'APPRAISAL_WORKFLOW', severity: 'HIGH',
      details: `CEO officially approved the appraisal for ${empName}.`, req
    });

    const actionUser = await User.findById(req.user.id || req.user._id);
    const ceoName = actionUser?.personalDetails ? `${actionUser.personalDetails.firstName} ${actionUser.personalDetails.lastName}` : 'CEO';
    
    const qName = appraisal.appraisalQuarter?.name || appraisal.period?.quarter || 'Q3';
    const qYear = appraisal.appraisalQuarter?.year || appraisal.period?.year || new Date().getFullYear();
    const iprfScore = appraisal.calculatedResults?.finalIprfScore || 0;
    
    const formattedDateTime = new Date().toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

    setImmediate(async () => {
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
        if (target.email && target.email.includes('@')) {
           await sendCEOApproveEmail({
             toEmail: target.email, recipientName: target.firstName || 'User',
             empName: empName, empId: appraisal.employeeId.employeeId,
             quarter: qName, year: qYear,
             iprfFactor: iprfScore.toFixed(1), iprfLabel: getIprfLabel(iprfScore),
             ceoName: ceoName, decisionDate: formattedDateTime
           });
        }
      }
    });

    res.json({ message: 'Appraisal successfully approved by CEO.', status: 'APPROVED' });
  } catch (error) { res.status(500).json({ message: 'CEO Approval failure.' }); }
});

// Reject back to Manager
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
    
    const actionUser = await User.findById(req.user.id || req.user._id);
    const rejectorName = actionUser?.personalDetails ? `${actionUser.personalDetails.firstName} ${actionUser.personalDetails.lastName}` : (req.user.role === 'CEO' ? 'CEO' : 'HR');
    
    await logAudit({
      user: req.user, role: req.user.role, action: 'APPRAISAL_REJECTED', category: 'APPRAISAL_WORKFLOW', severity: 'HIGH',
      details: `${rejectorName} returned the appraisal for ${empName} back to the Line Manager.`, req
    });

    const qName = appraisal.appraisalQuarter?.name || appraisal.period?.quarter || 'Q3';
    const qYear = appraisal.appraisalQuarter?.year || appraisal.period?.year || new Date().getFullYear();
    const iprfScore = appraisal.calculatedResults?.finalIprfScore || 0;
    
    const formattedDateTime = new Date().toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

    setImmediate(async () => {
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
        if (target.email && target.email.includes('@')) {
           await sendCEORejectEmail({
             toEmail: target.email, recipientName: target.firstName || 'User',
             empName: empName, empId: appraisal.employeeId.employeeId,
             quarter: qName, year: qYear,
             iprfFactor: iprfScore.toFixed(1), iprfLabel: getIprfLabel(iprfScore),
             ceoName: rejectorName, decisionDate: formattedDateTime,
             ceoComment: rejectionComment, mgrName: mgrName
           });
        }
      }
    });

    res.json({ message: 'Appraisal returned to Manager. Notifications dispatched.', status: newStatus });
  } catch (error) { res.status(500).json({ message: 'Reopen failure.', error: error.message }); }
});

// 7. Delete a draft
router.delete('/:id', roleGuard('MANAGER', 'HR_ADMIN'), async (req, res) => {
  try {
    const appraisal = await Appraisal.findById(req.params.id).populate('employeeId', 'personalDetails');
    if (!appraisal) return res.status(404).json({ message: 'Appraisal not found.' });

    if (appraisal.workflow.status !== 'DRAFT' && req.user.role !== 'HR_ADMIN') {
      return res.status(403).json({ message: 'You can only delete DRAFT appraisals.' });
    }
    
    const empName = appraisal.employeeId ? `${appraisal.employeeId.personalDetails?.firstName} ${appraisal.employeeId.personalDetails?.lastName}` : 'Unknown Employee';

    await Appraisal.findByIdAndDelete(req.params.id);
    
    await logAudit({
      user: req.user, role: req.user.role, action: 'APPRAISAL_DELETED', category: 'APPRAISAL_WORKFLOW', severity: 'MEDIUM',
      details: `Deleted draft appraisal for ${empName}.`, req
    });

    res.json({ message: 'Draft deleted successfully.' });
  } catch (error) { res.status(500).json({ message: 'Error deleting appraisal.' }); }
});

module.exports = router;