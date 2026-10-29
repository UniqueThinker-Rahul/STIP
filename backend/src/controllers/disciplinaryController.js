const DisciplinaryCase = require('../models/DisciplinaryCase');
const Notification = require('../models/Notification'); // Optional, keeps your existing setup
const User = require('../models/User');
const Counselling = require('../models/Counselling'); // Moved cleanly to the top

// 1. Create a new case or save as draft (UPDATED FOR MULTER FILE UPLOADS)
exports.createCase = async (req, res) => {
  try {
    // FormData sends complex objects as JSON strings, so we parse them
    const employeeId = req.body.employeeId;
    const offences = JSON.parse(req.body.offences);
    const dateRaised = req.body.dateRaised;
    const statement = req.body.statement;
    const isSerious = req.body.isSerious === 'true'; // FormData boolean handling
    const status = req.body.status;

    // Extract saved filenames from Multer's req.files array
    const attachedFiles = req.files ? req.files.map(file => file.filename) : [];

    const newCase = new DisciplinaryCase({
      employeeId,
      raisedBy: req.user.id,
      offences,
      dateRaised,
      statement,
      isSerious,
      status,
      attachedFiles
    });

    await newCase.save();

    if (isSerious && status === 'SUBMITTED_TO_HR') {
      try {
        const hrAlert = new Notification({
          recipientRole: 'HR_MANAGER',
          title: '🚨 Urgent: Serious Disciplinary Offence Raised',
          message: `A serious offence has been reported. Immediate review required.`,
          type: 'DISCIPLINARY_ALERT',
          relatedId: newCase._id
        });
        await hrAlert.save();
      } catch (notifErr) {
        console.log("Notification logic skipped or schema not found.");
      }
    }

    res.status(201).json({ success: true, data: newCase });
  } catch (error) {
    console.error("Error creating disciplinary case:", error);
    res.status(500).json({ success: false, message: 'Server Error saving case.' });
  }
};

// 2. Fetch past cases for an employee
exports.getEmployeeCases = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const pastCases = await DisciplinaryCase.find({
      employeeId,
      status: { $ne: 'DRAFT' }
    }).sort({ createdAt: -1 });

    res.status(200).json({ success: true, data: pastCases });
  } catch (error) {
    console.error("Error fetching employee cases:", error);
    res.status(500).json({ success: false, message: 'Server Error fetching case history.' });
  }
};

// 3. Fetch cases raised by the logged-in Line Manager
exports.getMyCases = async (req, res) => {
  try {
    const cases = await DisciplinaryCase.find({ raisedBy: req.user.id })
      .populate('employeeId', 'personalDetails employmentDetails')
      .sort({ createdAt: -1 });

    const formattedCases = cases.map(c => ({
      _id: c._id,
      caseId: `DC-${c._id.toString().slice(-4).toUpperCase()}`,
      employeeName: `${c.employeeId?.personalDetails?.firstName || ''} ${c.employeeId?.personalDetails?.lastName || ''}`.trim(),
      jobTitle: c.employeeId?.employmentDetails?.jobTitle || 'Employee',
      offences: c.offences,
      isSerious: c.isSerious,
      status: c.status,
      dateRaised: c.dateRaised
    }));

    res.status(200).json({ success: true, data: formattedCases });
  } catch (error) {
    console.error("Error fetching my cases:", error);
    res.status(500).json({ success: false, message: 'Server Error fetching cases.' });
  }
};

// 4. Update a case status from DRAFT to SUBMITTED_TO_HR
exports.submitToHR = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedCase = await DisciplinaryCase.findOneAndUpdate(
      { _id: id, raisedBy: req.user.id, status: 'DRAFT' },
      { status: 'SUBMITTED_TO_HR' },
      { new: true }
    );

    if (!updatedCase) {
      return res.status(404).json({ success: false, message: 'Draft not found or unauthorized.' });
    }

    res.status(200).json({ success: true, data: updatedCase });
  } catch (error) {
    console.error("Error submitting case:", error);
    res.status(500).json({ success: false, message: 'Server Error submitting case.' });
  }
};

// 5. Toggle the Serious flag (Flag / Unflag)
exports.toggleSeriousFlag = async (req, res) => {
  try {
    const { id } = req.params;
    const { isSerious } = req.body;

    const updatedCase = await DisciplinaryCase.findOneAndUpdate(
      { _id: id, raisedBy: req.user.id },
      { isSerious: isSerious },
      { new: true }
    );

    if (!updatedCase) {
      return res.status(404).json({ success: false, message: 'Case not found or unauthorized.' });
    }

    res.status(200).json({ success: true, data: updatedCase });
  } catch (error) {
    console.error("Error toggling serious flag:", error);
    res.status(500).json({ success: false, message: 'Server Error toggling flag.' });
  }
};

// 6. Delete a draft case
exports.deleteDraft = async (req, res) => {
  try {
    const { id } = req.params;

    const deletedCase = await DisciplinaryCase.findOneAndDelete({
      _id: id,
      raisedBy: req.user.id,
      status: 'DRAFT'
    });

    if (!deletedCase) {
      return res.status(404).json({ success: false, message: 'Draft not found, already submitted, or unauthorized.' });
    }

    res.status(200).json({ success: true, message: 'Draft successfully deleted.' });
  } catch (error) {
    console.error("Error deleting case:", error);
    res.status(500).json({ success: false, message: 'Server Error deleting case.' });
  }
};

// 7. Fetch properties pending retrieval (Mocked based on Dismissal cases)
exports.getPropertiesToRetrieve = async (req, res) => {
  try {
    const dismissalCases = await DisciplinaryCase.find({
      raisedBy: req.user.id,
      'offences.action': { $regex: /^D/ }
    }).populate('employeeId', 'personalDetails employmentDetails');

    const pendingProperties = dismissalCases.map(c => ({
      _id: c._id,
      caseId: `DC-${c._id.toString().slice(-4).toUpperCase()}`,
      employeeName: `${c.employeeId?.personalDetails?.firstName || ''} ${c.employeeId?.personalDetails?.lastName || ''}`.trim(),
      jobTitle: c.employeeId?.employmentDetails?.jobTitle || 'Employee',
      department: c.employeeId?.employmentDetails?.department || 'Unknown Dept',
      returnedCount: 0,
      totalCount: 3
    }));

    res.status(200).json({ success: true, data: pendingProperties });
  } catch (error) {
    console.error("Error fetching properties:", error);
    res.status(500).json({ success: false, message: 'Server Error fetching properties.' });
  }
};

// Fetch a single case by ID for editing
exports.getCaseById = async (req, res) => {
  try {
    const caseData = await DisciplinaryCase.findOne({ _id: req.params.id, raisedBy: req.user.id })
      .populate('employeeId', 'personalDetails employmentDetails');
    if (!caseData) return res.status(404).json({ success: false, message: 'Case not found' });
    res.status(200).json({ success: true, data: caseData });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// Update an existing draft case
exports.updateCase = async (req, res) => {
  try {
    const { id } = req.params;
    const offences = JSON.parse(req.body.offences);
    const dateRaised = req.body.dateRaised;
    const statement = req.body.statement;
    const isSerious = req.body.isSerious === 'true';
    const status = req.body.status;
    
    // Handle files: Keep old ones not deleted, and add new ones uploaded
    const retainedFiles = req.body.retainedFiles ? JSON.parse(req.body.retainedFiles) : [];
    const newAttachedFiles = req.files ? req.files.map(file => file.filename) : [];
    const attachedFiles = [...retainedFiles, ...newAttachedFiles];

    const updatedCase = await DisciplinaryCase.findOneAndUpdate(
      { _id: id, raisedBy: req.user.id, status: 'DRAFT' },
      { offences, dateRaised, statement, isSerious, status, attachedFiles },
      { new: true }
    );

    if (!updatedCase) return res.status(404).json({ success: false, message: 'Draft not found or cannot be edited' });
    res.status(200).json({ success: true, data: updatedCase });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error updating case' });
  }
};

// ================= COUNSELLING CONTROLLERS ================= //

// 1. Create a new counselling record
exports.createCounselling = async (req, res) => {
  try {
    const { employeeId, issue, discussed, outcome, date } = req.body;
    
    // Safety mapping for auth middleware payload variations
    const userId = req.user._id || req.user.id;

    const newCounselling = new Counselling({
      employeeId,
      raisedBy: userId,
      issue,
      discussed,
      outcome,
      date
    });

    await newCounselling.save();
    res.status(201).json({ success: true, data: newCounselling });
  } catch (error) {
    console.error("Error saving counselling:", error);
    res.status(500).json({ success: false, message: 'Server error saving counselling.' });
  }
};

// 2. Fetch all counselling records logged by this manager
exports.getMyCounsellings = async (req, res) => {
  try {
    // Safety mapping for auth middleware payload variations
    const userId = req.user._id || req.user.id;

    const records = await Counselling.find({ raisedBy: userId })
      .populate('employeeId', 'personalDetails employmentDetails')
      .sort({ date: -1 });
      
    res.status(200).json({ success: true, data: records });
  } catch (error) {
    console.error("Error fetching counselling records:", error);
    res.status(500).json({ success: false, message: 'Server error fetching counselling.' });
  }
};
// Fetch ALL counselling records for HR Oversight
exports.getAllCounsellings = async (req, res) => {
  try {
    const records = await Counselling.find()
      .populate('employeeId', 'personalDetails employmentDetails')
      .sort({ date: -1 });
      
    res.status(200).json({ success: true, data: records });
  } catch (error) {
    console.error("Error fetching all counselling records for HR:", error);
    res.status(500).json({ success: false, message: 'Server error fetching counselling logs.' });
  }
};