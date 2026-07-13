const User = require('../models/User');
const Appraisal = require('../models/Appraisal');
const bcrypt = require('bcryptjs');

// 1. REGISTRATION: Allows HR Admin to create an Executive Member
exports.createExecutive = async (req, res) => {
  try {
    const { employeeId, firstName, lastName, email, password, companyCode } = req.body;

    // Check if user already exists
    let user = await User.findOne({ employeeId });
    if (user) {
      return res.status(400).json({ success: false, message: 'User already exists in the system.' });
    }

    // Hash Password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create new Executive User
    user = new User({
      employeeId,
      companyCode: companyCode || 'FSM',
      personalDetails: { firstName, lastName, email },
      employmentDetails: { jobTitle: 'Executive Member' },
      role: 'EXECUTIVE',
      password: hashedPassword,
      isFirstLogin: true
    });

    await user.save();

    res.status(201).json({ success: true, data: user, message: 'Executive Member created successfully.' });
  } catch (error) {
    console.error("Error creating executive:", error);
    res.status(500).json({ success: false, message: 'Server error during creation.' });
  }
};

// 2. PRIVILEGES: Fetches the read-only oversight data for the Executive Dashboard
exports.getExecutiveDashboardData = async (req, res) => {
  try {
    // Fetch all employees and managers
    const employees = await User.find({ role: { $in: ['EMPLOYEE', 'MANAGER'] } }).select('-password');
    const managers = employees.filter(emp => emp.role === 'MANAGER');
    
    // Fetch all appraisals to calculate IPRF and submission status
    const appraisals = await Appraisal.find().populate('employeeId', 'personalDetails employmentDetails companyCode employeeId');

    // Aggregate Manager Portfolios (Total Staff, Submitted, Remaining, Avg IPRF)
    const managerPortfolios = managers.map(mgr => {
      // Find all staff reporting to this specific manager
      const staff = employees.filter(emp => String(emp.employmentDetails?.reportingTo) === String(mgr._id));
      const staffIds = staff.map(s => String(s._id));

      // Find appraisals belonging to this manager's staff
      const staffAppraisals = appraisals.filter(app => staffIds.includes(String(app.employeeId?._id || app.employeeId)));

      const submittedCount = staffAppraisals.filter(app => app.workflow?.status && app.workflow.status !== 'DRAFT').length;
      const remainingCount = staff.length - submittedCount;

      // Calculate Average IPRF for the manager's team
      const validIprfAppraisals = staffAppraisals.filter(app => app.calculatedResults?.finalIprfScore);
      const totalIprf = validIprfAppraisals.reduce((sum, app) => sum + app.calculatedResults.finalIprfScore, 0);
      const avgIprf = validIprfAppraisals.length > 0 ? (totalIprf / validIprfAppraisals.length) : 0;

      return {
        managerId: mgr._id,
        managerName: `${mgr.personalDetails?.firstName || ''} ${mgr.personalDetails?.lastName || ''}`.trim(),
        jobTitle: mgr.employmentDetails?.jobTitle,
        totalStaff: staff.length,
        submittedAppraisals: submittedCount,
        remainingAppraisals: remainingCount,
        averageTeamIprf: avgIprf.toFixed(2)
      };
    });

    res.status(200).json({
      success: true,
      data: {
        totalEmployees: employees.length,
        managerPortfolios,
        // Send all appraisals so the Executive can view the read-only details of any employee
        allAppraisals: appraisals 
      }
    });
  } catch (error) {
    console.error("Executive Dashboard Error:", error);
    res.status(500).json({ success: false, message: 'Server error fetching executive data.' });
  }
};