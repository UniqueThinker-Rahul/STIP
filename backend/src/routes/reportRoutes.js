const express = require('express');
const router = express.Router();
const Appraisal = require('../models/Appraisal');
const User = require('../models/User');
const { authGuard, roleGuard } = require('../middleware/auth');

// Secure the entire reporting module
router.use(authGuard);
router.use(roleGuard('HR_ADMIN', 'CEO', 'ICT_ADMIN'));

// 1. GET /api/v1/reports/distribution - IPRF Score Distribution & The 5% Cap Rule
router.get('/distribution', async (req, res) => {
  try {
    const { year, quarter } = req.query;
    if (!year || !quarter) return res.status(400).json({ message: 'Year and quarter are required.' });

    // Fetch all appraisals for the given period that have been calculated (Submitted and beyond)
    const appraisals = await Appraisal.find({
      'period.year': Number(year),
      'period.quarter': quarter,
      'workflow.status': { $ne: 'DRAFT' } // Ignore drafts
    });

    let counts = { '0.0': 0, '0.7': 0, '1.0': 0, '1.3': 0 };
    let exceedsCount = 0;

    appraisals.forEach(app => {
      const score = app.calculatedResults.finalIprfScore;
      if (score <= 0.0) counts['0.0']++;
      else if (score <= 0.7) counts['0.7']++;
      else if (score <= 1.0) counts['1.0']++;
      else if (score >= 1.3) {
        counts['1.3']++;
        exceedsCount++;
      }
    });

    const totalSubmitted = appraisals.length;
    // Calculate the percentage of staff receiving 1.3
    const exceedsPercentage = totalSubmitted > 0 ? (exceedsCount / totalSubmitted) * 100 : 0;
    
    // The Critical SRS System Flag
    const capWarningTriggered = exceedsPercentage > 5.0; 

    res.json({
      totalSubmitted,
      distribution: counts,
      metrics: {
        exceedsCount,
        exceedsPercentage: exceedsPercentage.toFixed(2) + '%',
        capWarningTriggered
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error generating distribution report.' });
  }
});

// 2. GET /api/v1/reports/completion - Completion Rates & Un-Appraised Staff
router.get('/completion', async (req, res) => {
  try {
    const { year, quarter } = req.query;

    // 1. Get all active staff (excluding CEO who doesn't get STIP)
    const activeStaff = await User.find({ 
      'employmentDetails.isActive': true,
      'security.role': { $ne: 'CEO' }
    }).select('employeeId personalDetails employmentDetails.reportingTo');

    // 2. Get all submitted/approved appraisals for this period
    const completedAppraisals = await Appraisal.find({
      'period.year': Number(year),
      'period.quarter': quarter,
      'workflow.status': { $in: ['SUBMITTED', 'UNDER_HR_REVIEW', 'WITH_CEO', 'APPROVED'] }
    }).select('employeeId');

    const completedEmployeeIds = completedAppraisals.map(app => app.employeeId.toString());

    // 3. Filter out who is missing
    const unappraisedStaff = activeStaff.filter(staff => 
      !completedEmployeeIds.includes(staff._id.toString())
    );

    const completionRate = ((completedAppraisals.length / activeStaff.length) * 100).toFixed(1);

    res.json({
      companyCompletionRate: `${completionRate}%`,
      totalActiveStaff: activeStaff.length,
      completedCount: completedAppraisals.length,
      missingCount: unappraisedStaff.length,
      unappraisedList: unappraisedStaff // Frontend can use this to render a table and send reminders
    });
  } catch (error) {
    res.status(500).json({ message: 'Error generating completion report.' });
  }
});

// 3. GET /api/v1/reports/criteria - Evaluated Criteria Breakdown
router.get('/criteria', async (req, res) => {
  try {
    const { year, quarter } = req.query;

    // MongoDB Aggregation to get the average rating for each specific behavior
    const criteriaAverages = await Appraisal.aggregate([
      { $match: { 'period.year': Number(year), 'period.quarter': quarter, 'workflow.status': { $ne: 'DRAFT' } } },
      { 
        $group: {
          _id: null,
          avgDeliveredResults: { $avg: '$scores.deliveredResults.rating' },
          avgBehaviors: { $avg: '$scores.behaviors.rating' },
          avgSafeWorking: { $avg: '$scores.safeWorking.rating' },
          avgJobCompetence: { $avg: '$scores.jobCompetence.rating' },
          avgDependability: { $avg: '$scores.dependability.rating' },
          avgAdaptability: { $avg: '$scores.adaptability.rating' },
          totalAppraisals: { $sum: 1 }
        }
      }
    ]);

    res.json({ data: criteriaAverages[0] || {} });
  } catch (error) {
    res.status(500).json({ message: 'Error generating criteria report.' });
  }
});

module.exports = router;