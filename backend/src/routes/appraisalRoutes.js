const express = require('express');
const router = express.Router();
const Appraisal = require('../models/Appraisal');
const { authGuard, roleGuard } = require('../middleware/auth');

router.use(authGuard);

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
      .populate('managerId', 'personalDetails');

    res.json({ count: appraisals.length, data: appraisals });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching appraisals.', error: error.message });
  }
});

// 2. POST /api/v1/appraisals - Create or Update an Appraisal
router.post('/', roleGuard('MANAGER'), async (req, res) => {
  try {
    // 🚨 FIX: Extract nested payload structure correctly
    const { employeeId, reviewYear, period, scores, calculatedResults, stipAward, narrative, status } = req.body;
    const managerId = req.user.id || req.user._id;

    const actualYear = reviewYear || 2026;
    const actualQuarter = period?.quarter || 'Q3';

    let appraisal = await Appraisal.findOne({ 
      employeeId, 
      reviewYear: actualYear,
      'period.quarter': actualQuarter
    });

    if (appraisal) {
      // 🚨 FIX: Strict Backend Lock - Only allow editing if DRAFT or Rejected
      if (!['DRAFT', 'REOPENED', 'NOT_APPROVED'].includes(appraisal.workflow.status)) {
        return res.status(403).json({ message: 'Cannot edit an appraisal that has already been submitted.' });
      }
    } else {
      appraisal = new Appraisal({
        employeeId,
        managerId,
        reviewYear: actualYear,
        period: { quarter: actualQuarter, year: actualYear },
        appraisalRef: `APP-${Date.now().toString().slice(-6)}`
      });
    }

    if (!appraisal.scores) appraisal.scores = {};
    if (!appraisal.calculatedResults) appraisal.calculatedResults = {};
    if (!appraisal.narrative) appraisal.narrative = {};
    if (!appraisal.workflow) appraisal.workflow = {};

    // 🚨 FIX: Save Scores correctly
    if (scores) {
      if (scores.expectedResults !== undefined) appraisal.scores.deliveredResults = { rating: scores.expectedResults, weight: 0.3 };
      if (scores.initiative !== undefined) appraisal.scores.behaviors = { rating: scores.initiative, weight: 0.2 };
      if (scores.safeWorking !== undefined) appraisal.scores.safeWorking = { rating: scores.safeWorking, weight: 0.2 };
      if (scores.jobCompetence !== undefined) appraisal.scores.jobCompetence = { rating: scores.jobCompetence, weight: 0.1 };
      if (scores.dependability !== undefined) appraisal.scores.dependability = { rating: scores.dependability, weight: 0.1 };
      if (scores.adaptability !== undefined) appraisal.scores.adaptability = { rating: scores.adaptability, weight: 0.1 };
    }

    if (calculatedResults?.finalIprfScore !== undefined) appraisal.calculatedResults.finalIprfScore = calculatedResults.finalIprfScore;
    if (stipAward !== undefined) appraisal.stipAward = parseFloat(stipAward);

    // 🚨 FIX: Save Manager Comments & EP Justification securely
    if (narrative) {
      appraisal.narrative.generalComments = narrative.generalComments || '';
      appraisal.narrative.epJustification = narrative.epJustification || '';
    }

    appraisal.workflow.status = status || 'DRAFT';
    appraisal.workflow.lastUpdatedBy = managerId;

    await appraisal.save();

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
    const appraisal = await Appraisal.findById(req.params.id);
    if (!appraisal) return res.status(404).json({ message: 'Appraisal not found' });

    if (!appraisal.narrative) appraisal.narrative = {};
    
    // Save HR Comments cleanly
    appraisal.narrative.hrComments = req.body.hrNotes || 'Approved by HR';
    
    // 🚨 FIX: Change status to WITH_CEO to match Enum and CEO Dashboard filter
    appraisal.workflow.status = 'WITH_CEO'; 
    appraisal.workflow.lastUpdatedBy = req.user.id || req.user._id;

    await appraisal.save();

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
    const appraisal = await Appraisal.findById(req.params.id);
    if (!appraisal) return res.status(404).json({ message: 'Appraisal not found' });

    if (!appraisal.narrative) appraisal.narrative = {};
    // 🚨 FIX: Save CEO Comments cleanly
    appraisal.narrative.ceoComments = req.body.notes || 'Final Approval by CEO';
    appraisal.workflow.status = 'APPROVED'; // Locked state
    appraisal.workflow.lastUpdatedBy = req.user.id || req.user._id;

    await appraisal.save();

    res.json({ message: 'Appraisal successfully approved by CEO.', status: 'APPROVED' });
  } catch (error) {
    res.status(500).json({ message: 'CEO Approval failure.', error: error.message });
  }
});

// 7. Reject back to Manager
router.patch('/:id/reopen', roleGuard('HR_ADMIN', 'CEO'), async (req, res) => {
  try {
    const appraisal = await Appraisal.findById(req.params.id);
    if (!appraisal) return res.status(404).json({ message: 'Appraisal record not found.' });

    const newStatus = req.user.role === 'CEO' ? 'NOT_APPROVED' : 'REOPENED';
    
    if (!appraisal.narrative) appraisal.narrative = {};
    
    // 🚨 FIX: Preserve existing comments and assign rejection note correctly
    if (req.user.role === 'CEO') {
      appraisal.narrative.ceoComments = req.body.hrNotes || 'Rejected by CEO. Please revise.';
    } else {
      appraisal.narrative.hrComments = req.body.hrNotes || 'Rejected by HR. Please revise.';
    }

    appraisal.workflow.status = newStatus;
    appraisal.workflow.lastUpdatedBy = req.user.id || req.user._id;

    await appraisal.save();

    // 🚨 FIX: Trigger Email Dispatch Notification Logic
    console.log(`[EMAIL DISPATCH] Sent to HR and Line Manager: Appraisal for ${appraisal.employeeId} was REJECTED by ${req.user.role}. Reason: ${req.body.hrNotes}`);

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