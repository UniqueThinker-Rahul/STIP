// backend/src/controllers/appraisalController.js
const Appraisal = require('../models/Appraisal');

// Create a new appraisal (Draft or Submitted)
exports.createAppraisal = async (req, res) => {
  try {
    // 1. Check if an appraisal already exists for this employee/year
    const existing = await Appraisal.findOne({ 
      employee: req.body.employeeId, 
      reviewYear: req.body.reviewYear 
    });

    if (existing && existing.status !== 'DRAFT') {
      return res.status(400).json({ success: false, message: 'Appraisal already submitted.' });
    }

    // 2. If it's a draft, update it. If not, create new.
    let appraisal;
    if (existing) {
      Object.assign(existing, {
        manager: req.body.managerId,
        metrics: req.body.metrics,
        individualAssessment: req.body.individualAssessment,
        stipAward: req.body.stipAward,
        comments: req.body.comments,
        status: req.body.status
      });
      appraisal = await existing.save();
    } else {
      appraisal = new Appraisal({
        employee: req.body.employeeId,
        manager: req.body.managerId,
        reviewYear: req.body.reviewYear,
        metrics: req.body.metrics,
        individualAssessment: req.body.individualAssessment,
        stipAward: req.body.stipAward,
        comments: req.body.comments,
        status: req.body.status
      });
      await appraisal.save();
    }

    res.status(201).json({ success: true, data: appraisal });
  } catch (error) {
    console.error("Appraisal Creation Error:", error);
    res.status(500).json({ success: false, message: 'Server Error saving appraisal.' });
  }
};

// Get all appraisals (Used by the manager dashboard)
exports.getAllAppraisals = async (req, res) => {
  try {
    const appraisals = await Appraisal.find()
      .populate('employee', 'personalDetails employeeId companyCode employmentDetails')
      .populate('manager', 'personalDetails');
      
    res.status(200).json({ success: true, data: appraisals });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error fetching appraisals.' });
  }
};