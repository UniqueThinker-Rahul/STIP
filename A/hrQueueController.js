const Case = require('../models/DisciplinaryCase');

exports.getHrQueue = async (req, res) => {
  try {
    const cases = await Case.find({ status: { $ne: 'DRAFT' } }) 
      .populate('employeeId', 'personalDetails.firstName personalDetails.lastName employmentDetails.jobTitle employmentDetails.department')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: cases.length,
      data: cases
    });
  } catch (error) {
    console.error('HR Queue Fetch Error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

exports.handleWorkflowAction = async (req, res) => {
  try {
    const { action } = req.params;
    let updateData = {};

    if (action === 'acknowledge') {
      updateData = { hrAcknowledged: true };
    } else if (action === 'investigate') {
      updateData = { 
        investigationDetails: req.body, 
        hrWorkflowStatus: 'INVESTIGATION_COMPLETE',
        status: 'INVESTIGATION_COMPLETE'
      };
    } else if (action === 'issue-notice') {
      updateData = { noticeDate: req.body.noticeDate, noticeIssued: true, hrWorkflowStatus: 'AWAITING_RESPONSE' };
    } else if (action === 'record-response') {
      updateData = { employeeResponse: req.body.response, hrWorkflowStatus: 'DECISION_READY' };
    } else if (action === 'proceed-no-response') {
      updateData = { employeeResponse: 'No response received', hrWorkflowStatus: 'DECISION_READY' };
    } else if (action === 'jury') {
      updateData = { juryDetails: req.body };
    } else if (action === 'forward-smt') {
      // NEW: Handle forwarding to SMT
      updateData = { 
        hrRecommendation: req.body, 
        hrWorkflowStatus: 'WITH_SMT',
        status: 'WITH_SMT'
      };
    } else if (action === 'forward-ceo') {
      // NEW: Handle forwarding directly to CEO
      updateData = { 
        hrRecommendation: req.body, 
        hrWorkflowStatus: 'WITH_CEO',
        status: 'WITH_CEO'
      };
    }

    const updatedCase = await Case.findByIdAndUpdate(
      req.params.id, 
      { $set: updateData }, 
      { new: true, strict: false } 
    );
    
    if (!updatedCase) return res.status(404).json({ success: false, message: 'Case not found' });
    res.status(200).json({ success: true, data: updatedCase });
    
  } catch (error) {
    console.error(`Error in ${req.params.action}:`, error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

exports.getMyNotices = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;

    const cases = await Case.find({ 
      employeeId: userId,
      $or: [
        { noticeIssued: true },
        { hrWorkflowStatus: { $in: ['AWAITING_RESPONSE', 'DECISION_READY', 'CLOSED', 'WITH_SMT', 'WITH_CEO'] } }
      ]
    }) 
    .populate('employeeId', 'personalDetails.firstName personalDetails.lastName employmentDetails.jobTitle employmentDetails.department')
    .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: cases.length,
      data: cases
    });
  } catch (error) {
    console.error('My Notices Fetch Error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};