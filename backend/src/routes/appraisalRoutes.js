// backend/src/routes/appraisalRoutes.js
const express = require('express');
const router = express.Router();
const Appraisal = require('../models/Appraisal');
const { authGuard, roleGuard } = require('../middleware/auth');

router.use(authGuard);

// 1. GET /api/v1/appraisals - Fetch Appraisals based on Role
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

// 2. POST /api/v1/appraisals - Create or Update an Appraisal (Draft or Submitted)
router.post('/', roleGuard('MANAGER'), async (req, res) => {
  try {
    const { employeeId, reviewYear, metrics, individualAssessment, stipAward, comments, status, quarter } = req.body;
    const managerId = req.user.id || req.user._id;

    const actualYear = reviewYear || 2026;
    const actualQuarter = quarter || 'Q3';

    let appraisal = await Appraisal.findOne({ 
      employeeId, 
      reviewYear: actualYear,
      'period.quarter': actualQuarter
    });

    if (appraisal) {
      if (appraisal.workflow.status !== 'DRAFT' && appraisal.workflow.status !== 'REOPENED') {
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

    if (metrics) {
      if (metrics.expectedResults !== undefined) appraisal.scores.deliveredResults = { rating: metrics.expectedResults };
      if (metrics.initiative !== undefined) appraisal.scores.behaviors = { rating: metrics.initiative };
      if (metrics.safeWorking !== undefined) appraisal.scores.safeWorking = { rating: metrics.safeWorking };
      if (metrics.jobCompetence !== undefined) appraisal.scores.jobCompetence = { rating: metrics.jobCompetence };
      if (metrics.dependability !== undefined) appraisal.scores.dependability = { rating: metrics.dependability };
      if (metrics.adaptability !== undefined) appraisal.scores.adaptability = { rating: metrics.adaptability };
    }

    if (individualAssessment !== undefined) appraisal.calculatedResults.finalIprfScore = individualAssessment;
    if (stipAward !== undefined) appraisal.stipAward = parseFloat(stipAward);

    if (comments) {
      const parts = comments.split('| EP Justification:');
      appraisal.narrative.generalComments = parts[0].trim();
      if (parts.length > 1) {
        appraisal.narrative.epJustification = parts[1].trim();
      }
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

// 3. PATCH /api/v1/appraisals/:id/review - Move to HR Review
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

// 4. PATCH /api/v1/appraisals/:id/approve - HR Approves the appraisal
router.patch('/:id/approve', roleGuard('HR_ADMIN'), async (req, res) => {
  try {
    await Appraisal.findByIdAndUpdate(req.params.id, {
      $set: {
        'workflow.status': 'APPROVED_BY_HR',
        'narrative.hrComments': req.body.hrNotes || 'Approved by HR',
        'workflow.lastUpdatedBy': req.user.id || req.user._id
      }
    });
    res.json({ message: 'Appraisal approved by HR.', status: 'APPROVED_BY_HR' });
  } catch (error) {
    console.error("Approve Route Error:", error);
    res.status(500).json({ message: 'Approval failure.', error: error.message });
  }
});

// 5. PATCH /api/v1/appraisals/:id/forward - Send to CEO
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
    console.error("Forward Route Error:", error);
    res.status(500).json({ message: 'Forward failure.', error: error.message });
  }
});

// 🚨 CRITICAL FIX: Missing CEO Approval Route Restored
// 6. PATCH /api/v1/appraisals/:id/ceo-approve - CEO Final Approval
router.patch('/:id/ceo-approve', roleGuard('CEO'), async (req, res) => {
  try {
    await Appraisal.findByIdAndUpdate(req.params.id, {
      $set: {
        'workflow.status': 'APPROVED', // This is the final locked state
        'narrative.ceoComments': req.body.notes || 'Final Approval by CEO',
        'workflow.lastUpdatedBy': req.user.id || req.user._id
      }
    });
    res.json({ message: 'Appraisal successfully approved by CEO.', status: 'APPROVED' });
  } catch (error) {
    console.error("CEO Approve Route Error:", error);
    res.status(500).json({ message: 'CEO Approval failure.', error: error.message });
  }
});

// 7. PATCH /api/v1/appraisals/:id/reopen - Reject back to Manager
router.patch('/:id/reopen', roleGuard('HR_ADMIN', 'CEO'), async (req, res) => {
  try {
    const appraisal = await Appraisal.findById(req.params.id);
    if (!appraisal) return res.status(404).json({ message: 'Appraisal record not found.' });

    const newStatus = req.user.role === 'CEO' ? 'NOT_APPROVED' : 'REOPENED';
    const rejectionNote = `[REJECTED BY ${req.user.role}]: ${req.body.hrNotes || 'Please revise.'} \n\nOriginal Notes: ${appraisal.narrative?.generalComments || ''}`;
    
    await Appraisal.findByIdAndUpdate(req.params.id, {
      $set: {
        'workflow.status': newStatus,
        'narrative.generalComments': rejectionNote,
        'workflow.lastUpdatedBy': req.user.id || req.user._id
      }
    });

    res.json({ message: 'Appraisal returned to Manager.', status: newStatus });
  } catch (error) {
    console.error("Reopen Route Error:", error);
    res.status(500).json({ message: 'Reopen failure.', error: error.message });
  }
});

// 8. DELETE /api/v1/appraisals/:id (Delete a draft)
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