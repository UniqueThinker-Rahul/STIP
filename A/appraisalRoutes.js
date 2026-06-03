const express = require('express');
const router = express.Router();
const appraisalController = require('../controllers/appraisalController');
const { authGuard, roleGuard } = require('../middleware/auth');

router.use(authGuard);

// 1. GET /api/v1/appraisals - Fetch Appraisals
router.get('/', appraisalController.getAllAppraisals);

// 2. POST /api/v1/appraisals - Create or Update an Appraisal
// 🚨 UPGRADED: Now correctly pointing to the controller which handles the email logic!
router.post('/', roleGuard('MANAGER'), appraisalController.createAppraisal);

// 3. Move to HR Review (Can be handled by the controller's createAppraisal for status updates)
router.patch('/:id/review', roleGuard('HR_ADMIN'), async (req, res) => {
  // Keeping this simple route intact as it just flips a switch
  try {
    const Appraisal = require('../models/Appraisal');
    await Appraisal.findByIdAndUpdate(req.params.id, {
      $set: { 'workflow.status': 'UNDER_HR_REVIEW', 'workflow.lastUpdatedBy': req.user.id }
    });
    res.json({ message: 'Appraisal is now under HR review.' });
  } catch (error) {
    res.status(500).json({ message: 'Workflow state transition failure.' });
  }
});

// 4. HR Approves the appraisal
router.patch('/:id/approve', roleGuard('HR_ADMIN'), async (req, res) => {
    // Delegating HR Approval to the controller's approveReject logic
    req.body.status = 'WITH_CEO';
    return appraisalController.approveRejectAppraisal(req, res);
});

// 5. Send to CEO
router.patch('/:id/forward', roleGuard('HR_ADMIN', 'CEO'), appraisalController.forwardToCEO);

// 6. CEO Final Approval
router.patch('/:id/ceo-approve', roleGuard('CEO'), async (req, res) => {
    // Delegating CEO Approval to the controller
    req.body.status = 'APPROVED';
    return appraisalController.approveRejectAppraisal(req, res);
});

// 7. Reject back to Manager
router.patch('/:id/reopen', roleGuard('HR_ADMIN', 'CEO'), async (req, res) => {
    // Delegating Rejection to the controller
    req.body.status = req.user.role === 'CEO' ? 'NOT_APPROVED' : 'REOPENED';
    req.body.comments = req.body.hrNotes || req.body.notes;
    return appraisalController.approveRejectAppraisal(req, res);
});

// 8. Delete a draft
router.delete('/:id', roleGuard('MANAGER', 'HR_ADMIN'), async (req, res) => {
  try {
    const Appraisal = require('../models/Appraisal');
    const appraisal = await Appraisal.findById(req.params.id);
    if (!appraisal) return res.status(404).json({ message: 'Appraisal not found.' });

    if (appraisal.workflow.status !== 'DRAFT' && req.user.role !== 'HR_ADMIN') {
      return res.status(403).json({ message: 'You can only delete DRAFT appraisals.' });
    }

    await Appraisal.findByIdAndDelete(req.params.id);
    res.json({ message: 'Draft deleted successfully.' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting appraisal.' });
  }
});

module.exports = router;