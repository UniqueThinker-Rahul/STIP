const express = require('express');
const router = express.Router();
const Appraisal = require('../models/Appraisal');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { authGuard, roleGuard } = require('../middleware/auth');

// 🚨 UPGRADE: Imported the logger system to track workflow actions
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
    // STRICT FILTER: ONLY calculate averages from fully APPROVED appraisals
    let matchStage = {
       'workflow.status': 'APPROVED' 
    };

    // If scope is explicitly team, filter by manager. Otherwise, process the entire company.
    if (req.user.role === 'MANAGER' && req.query.scope === 'team') {
       matchStage.managerId = req.user.id || req.user._id;
    }

    let pipeline = [];
    
    // Stage 1: Filter by Status and Manager
    pipeline.push({ $match: matchStage });

    // Stage 2: Bulletproof Date Filtering (Year & Quarter)
    const yearFilter = req.query.year && req.query.year !== 'ALL';
    const quarterFilter = req.query.quarter && req.query.quarter !== 'ALL';

    if (yearFilter || quarterFilter) {
      // ALWAYS join the Quarter document just in case the dates are stored there instead of the appraisal document
      pipeline.push({
        $lookup: {
          from: 'quarters', // Ensure this matches your Quarters collection name in MongoDB
          localField: 'appraisalQuarter',
          foreignField: '_id',
          as: 'quarterDoc'
        }
      });

      let andConditions = [];

      // Check Number and String across all possible year fields (reviewYear, period.year, quarterDoc.year)
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

      // Check across all possible quarter fields (period.quarter, quarterDoc.name)
      if (quarterFilter) {
        andConditions.push({
          $or: [
            { 'period.quarter': req.query.quarter },
            { 'quarterDoc.name': req.query.quarter }
          ]
        });
      }

      // Apply the date filters
      if (andConditions.length > 0) {
        pipeline.push({ $match: { $and: andConditions } });
      }
    }

    // Stage 3: The math group
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

    // 🚨 UPGRADE: Fetch employee name for Audit Log
    const empForLog = await User.findById(employeeId).select('personalDetails');
    const empNameLog = empForLog ? `${empForLog.personalDetails?.firstName} ${empForLog.personalDetails?.lastName}` : 'Employee';

    // 🚨 UPGRADE: Fire Audit Log event
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
          console.log(`\n📧 [EMAIL SYSTEM] Initializing Manager Submit sequence...`);
          const hrTargets = await dispatchNotification({
            senderId: req.user.id,
            recipientRole: 'HR_ADMIN',
            targetRoleContext: 'HR_ADMIN', 
            title: 'Appraisal Submitted for HR Review',
            message: `The Line Manager has submitted the appraisal for ${employeeName}. It is now awaiting your review.`,
            type: 'APPRAISAL_SUBMITTED',
            actionUrl: `${process.env.FRONTEND_URL}/dashboard/hr/appraisals`
          });

          console.log(`📧 [EMAIL SYSTEM] Found ${hrTargets.length} HR_ADMIN users to notify.`);

          for (const hr of hrTargets) {
            let adminEmail = null;
            if (hr.personalDetails && hr.personalDetails.notificationEmails) {
              if (typeof hr.personalDetails.notificationEmails.get === 'function') {
                adminEmail = hr.personalDetails.notificationEmails.get('HR_ADMIN');
              } else {
                adminEmail = hr.personalDetails.notificationEmails['HR_ADMIN'];
              }
            }
            if (!adminEmail) {
              adminEmail = hr.username; 
            }

            console.log(`   -> Target: ${hr.personalDetails?.firstName} | Extracted Email String: "${adminEmail}"`);
            
            if (adminEmail && adminEmail.includes('@')) {
               console.log(`   -> 🟢 VALID EMAIL. Firing SMTP request...`);
               await sendManagerSubmitEmail({
                 toEmail: adminEmail,
                 hrName: hr.personalDetails?.firstName || 'HR Manager',
                 empName: employeeName,
                 empId: emp?.employeeId || 'N/A',
                 empTitle: emp?.employmentDetails?.jobTitle || 'Staff',
                 empCompany: emp?.companyCode || 'FSM',
                 mgrName: mgrName,
                 quarter: actualQuarter,
                 year: actualYear,
                 iprfFactor: iprfScore.toFixed(1),
                 iprfLabel: getIprfLabel(iprfScore),
                 submitDate: new Date().toLocaleDateString('en-GB')
               });
               console.log(`   -> ✅ SUCCESS. Email delivered to ${adminEmail}`);
            } else {
               console.log(`   -> 🔴 SKIPPED. Invalid email address (No '@' symbol found).`);
            }
          }
        } catch (e) { console.error("📧 [EMAIL SYSTEM CRASH]:", e) }
      });
    }

    res.status(201).json({ success: true, data: appraisal });
  } catch (error) {
    console.error("Appraisal Creation Error:", error);
    res.status(500).json({ success: false, message: 'Server Error saving appraisal.' });
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

    // 🚨 UPGRADE: Fire Audit Log event
    await logAudit({
      user: req.user, role: req.user.role, action: 'APPRAISAL_HR_APPROVED', category: 'APPRAISAL_WORKFLOW', severity: 'MEDIUM',
      details: `HR validated appraisal for ${empName} and forwarded it to the CEO.`, req
    });

    setImmediate(async () => {
      try {
        console.log(`\n📧 [EMAIL SYSTEM] Initializing HR Forward sequence...`);
        const ceoTargets = await dispatchNotification({
          senderId: req.user.id,
          recipientRole: 'CEO',
          targetRoleContext: 'CEO',
          title: 'Appraisal Ready for Final Approval',
          message: `HR has validated and forwarded the ${quarterName} appraisal for ${empName}. It requires your final approval.`,
          type: 'APPRAISAL_FORWARDED',
          actionUrl: `${process.env.FRONTEND_URL}/dashboard/ceo/approve`
        });

        console.log(`📧 [EMAIL SYSTEM] Found ${ceoTargets.length} CEO users to notify.`);

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

          console.log(`   -> Target: ${ceo.personalDetails?.firstName} | Extracted Email String: "${adminEmail}"`);
          
          if (adminEmail && adminEmail.includes('@')) {
            console.log(`   -> 🟢 VALID EMAIL. Firing SMTP request...`);
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
            console.log(`   -> ✅ SUCCESS. Email delivered to ${adminEmail}`);
          } else {
             console.log(`   -> 🔴 SKIPPED. Invalid email address (No '@' symbol found).`);
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

    // 🚨 UPGRADE: Fire Audit Log event
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
        console.log(`\n📧 [EMAIL SYSTEM] Initializing CEO Decision sequence (${status})...`);
        
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
              if (!adminEmail) {
                adminEmail = target.username; 
              }

              console.log(`   -> Target: ${target.personalDetails?.firstName} (Manager) | Extracted Email String: "${adminEmail}"`);
              
              if (adminEmail && adminEmail.includes('@')) {
                console.log(`   -> 🟢 VALID EMAIL. Firing SMTP request...`);
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
                console.log(`   -> ✅ SUCCESS. Email delivered to ${adminEmail}`);
              } else {
                console.log(`   -> 🔴 SKIPPED. Invalid email address (No '@' symbol found).`);
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
              if (!adminEmail) {
                adminEmail = target.username; 
              }

              console.log(`   -> Target: ${target.personalDetails?.firstName} (HR) | Extracted Email String: "${adminEmail}"`);
              
              if (adminEmail && adminEmail.includes('@')) {
                console.log(`   -> 🟢 VALID EMAIL. Firing SMTP request...`);
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
                console.log(`   -> ✅ SUCCESS. Email delivered to ${adminEmail}`);
              } else {
                console.log(`   -> 🔴 SKIPPED. Invalid email address (No '@' symbol found).`);
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