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
    // 🚨 FIX: Moved the role into the 'security' object to strictly match User schema
    user = new User({
      employeeId,
      companyCode: companyCode || 'FSM',
      personalDetails: { firstName, lastName, email },
      employmentDetails: { jobTitle: 'Executive Member' },
      security: { role: 'EXECUTIVE' }, 
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
    const executiveId = req.user.id || req.user._id;

    // Fetch ONLY employees explicitly assigned to this Executive
    const portfolioStaff = await User.find({ 
        'employmentDetails.executiveTo': executiveId 
    })
    .select('-password')
    .populate('employmentDetails.reportingTo', 'personalDetails employmentDetails _id');
    
    // Extract staff IDs to filter appraisals
    const staffIds = portfolioStaff.map(emp => String(emp._id));

    // Fetch ONLY appraisals belonging to this Executive's staff
    const appraisals = await Appraisal.find({
        employeeId: { $in: staffIds }
    }).populate('employeeId', 'personalDetails employmentDetails companyCode employeeId');

    // Extract unique managers from the assigned staff to build portfolio metrics
    const managerMap = new Map();
    portfolioStaff.forEach(emp => {
        if (emp.employmentDetails?.reportingTo) {
            const mgr = emp.employmentDetails.reportingTo;
            managerMap.set(String(mgr._id), mgr);
        }
    });
    const managers = Array.from(managerMap.values());

    // Aggregate Manager Portfolios (Total Staff, Submitted, Remaining, Avg IPRF)
    const managerPortfolios = managers.map(mgr => {
      // Find all staff reporting to this specific manager within this portfolio
      const staff = portfolioStaff.filter(emp => 
        String(emp.employmentDetails?.reportingTo?._id || emp.employmentDetails?.reportingTo) === String(mgr._id)
      );
      const mgrStaffIds = staff.map(s => String(s._id));

      // Find appraisals belonging to this manager's staff
      const staffAppraisals = appraisals.filter(app => mgrStaffIds.includes(String(app.employeeId?._id || app.employeeId)));

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
        totalEmployees: portfolioStaff.length,
        portfolioStaff, 
        managerPortfolios,
        allAppraisals: appraisals 
      }
    });
  } catch (error) {
    console.error("Executive Dashboard Error:", error);
    res.status(500).json({ success: false, message: 'Server error fetching executive data.' });
  }
};