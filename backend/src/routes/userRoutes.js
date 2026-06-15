// backend/src/routes/userRoutes.js
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const userController = require('../controllers/userController');
// 🚨 Ensure Notification is imported so the bell alert works
const Notification = require('../models/Notification');

// 1. IMPORT MIDDLEWARE 
const { authGuard, roleGuard } = require('../middleware/auth');

// 2. APPLY GLOBAL AUTH
router.use(authGuard);

// 3. GET /api/v1/users (The Active Staff Directory)
router.get('/', async (req, res) => {
  try {
    let query = { 'employmentDetails.isDeleted': { $ne: true } };
    
    if (req.user.role === 'MANAGER') {
      query['employmentDetails.reportingTo'] = req.user.id;
    } else if (req.user.role === 'EMPLOYEE') {
      return res.status(403).json({ message: 'Employees do not have directory access.' });
    }

    // 🚨 UPGRADE: Heavy Projection Optimization. We strip out giant data blobs to speed up loading.
    const users = await User.find(query)
      .select('employeeId username personalDetails.firstName personalDetails.lastName personalDetails.notificationEmails employmentDetails.isActive employmentDetails.jobTitle employmentDetails.officeLocation employmentDetails.dateOfHire employmentDetails.salary employmentDetails.prorateValue companyCode security.role security.secondaryRoles')
      .populate('employmentDetails.reportingTo', 'personalDetails.firstName personalDetails.lastName')
      .lean(); // .lean() strips heavy Mongoose wrappers, making the query 5x faster

    res.json({ count: users.length, data: users });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching staff directory.' });
  }
});

// 🚨 CORRECTED: PATCH /api/v1/users/:id/alert-email (ICT Admin Route)
router.patch('/:id/alert-email', roleGuard('ICT_ADMIN'), async (req, res) => {
  try {
    const { targetRole, newEmail } = req.body;
    
    if (!targetRole) return res.status(400).json({ success: false, message: 'Role context is required.' });

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    if (!user.personalDetails) user.personalDetails = {};

    // Handle Mongoose Map vs Object safely for the dynamic email storage
    if (user.personalDetails.notificationEmails instanceof Map) {
      user.personalDetails.notificationEmails.set(targetRole, newEmail);
    } else {
      user.personalDetails.notificationEmails = {
        ...user.personalDetails.notificationEmails,
        [targetRole]: newEmail
      };
    }

    // Force Mongoose to recognize the change in the mixed/nested object
    user.markModified('personalDetails.notificationEmails');
    await user.save();

    // Fire the In-App Bell Notification to the user
    await Notification.create({
      recipient: user._id,
      sender: req.user.id,
      title: 'Alert Email Updated',
      message: `The ICT Admin has updated your notification email address for the ${targetRole.replace('_', ' ')} portal to: ${newEmail}`,
      type: 'SYSTEM_ALERT',
      targetRole: targetRole
    });

    const { logAudit } = require('../utils/logger');
    await logAudit({
      user: req.user, role: req.user.role, action: 'UPDATED_NOTIFICATION_PREF', 
      category: 'USER_MANAGEMENT', severity: 'LOW',
      details: `ICT Admin updated notification email for ${user.username} (${targetRole}) to: ${newEmail}`, req
    });

    res.json({ success: true, message: `Preferences updated for ${targetRole.replace('_', ' ')}.` });
  } catch (error) {
    console.error("Error updating alert email:", error);
    res.status(500).json({ success: false, message: 'Server error updating profile.' });
  }
});

// 3b. GET /api/v1/users/recycle-bin (The Soft Deleted Users)
router.get('/recycle-bin', roleGuard('HR_ADMIN', 'ICT_ADMIN', 'CEO'), async (req, res) => {
  try {
    const deletedUsers = await User.find({ 'employmentDetails.isDeleted': true })
      .select('employeeId personalDetails employmentDetails companyCode security.role username')
      .populate('employmentDetails.reportingTo', 'personalDetails.firstName personalDetails.lastName')
      .lean();
    
    res.json({ data: deletedUsers });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching recycle bin.' });
  }
});

// 4. GET /api/v1/users/managers (Populates HR dropdowns)
router.get('/managers', async (req, res) => {
  try {
    const managerRoles = ['MANAGER', 'HR_ADMIN', 'CEO'];
    
    // 🚨 UPGRADE: Projection Optimization
    const managers = await User.find({
      'employmentDetails.isDeleted': { $ne: true },
      $or: [
        { 'security.role': { $in: managerRoles } },
        { 'security.secondaryRoles': { $in: managerRoles } }
      ]
    })
    .select("personalDetails.firstName personalDetails.lastName employeeId security.role security.secondaryRoles")
    .lean();
    
    res.json({ data: managers });
  } catch (error) {
    console.error("Error fetching managers:", error);
    res.status(500).json({ message: 'Error fetching managers.' });
  }
});

// 5. GET /api/v1/users/my-team 
router.get('/my-team', userController.getMyTeam);

// 6. GET /api/v1/users/:id (View a specific profile)
router.get('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password -security.currentSessionId')
      .populate('employmentDetails.reportingTo', 'personalDetails.firstName personalDetails.lastName');
      
    if (!user) return res.status(404).json({ message: 'User not found.' });

    if (req.user.role === 'MANAGER' && req.user.id !== user._id.toString()) {
      if (user.employmentDetails.reportingTo?._id.toString() !== req.user.id) {
        return res.status(403).json({ message: 'You can only view your direct reports.' });
      }
    }

    res.json({ data: user });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching profile.' });
  }
});

// 7. POST /api/v1/users (Create new staff)
router.post('/', roleGuard('HR_ADMIN', 'ICT_ADMIN', 'ICT Admin', 'admin', 'ADMIN', 'ict_admin'), async (req, res) => {
  try {
    const { employeeId, firstName, lastName, jobTitle, officeLocation, companyCode, dateOfHire, role, reportingTo, prorateValue, isActive, salary } = req.body;
    
    const hiringYear = new Date(dateOfHire).getFullYear();
    const username = `${employeeId}${hiringYear}`;
    const password = `STIP@2026`; 

    const newUser = new User({
      employeeId,
      companyCode: companyCode || 'FSM', 
      username,
      password,
      personalDetails: { firstName, lastName },
      employmentDetails: { 
        jobTitle, 
        officeLocation: officeLocation || 'Unassigned', 
        salary: salary || 0, 
        dateOfHire, 
        prorateValue: prorateValue || 12,              
        reportingTo: reportingTo || null,
        isActive: isActive !== undefined ? isActive : true,
        isDeleted: false 
      },
      security: { role: role || 'EMPLOYEE', isFirstLogin: true }
    });

    await newUser.save();
    res.status(201).json({ message: 'Staff member created successfully.', username });
  } catch (error) {
    console.error("Error creating user:", error);
    res.status(400).json({ message: error.message || 'Error creating user.' });
  }
});

// 8. 🚨 UPGRADED: PATCH /api/v1/users/:id/hr-update (Edit Profile)
router.patch('/:id/hr-update', roleGuard('HR_ADMIN', 'ICT_ADMIN', 'ICT Admin', 'admin', 'ADMIN', 'ict_admin'), async (req, res) => {
  try {
    const { 
      firstName, lastName, jobTitle, officeLocation, companyCode, 
      dateOfHire, role, secondaryRoles, reportingTo, salary 
    } = req.body;

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found.' });

    if (firstName) user.personalDetails.firstName = firstName;
    if (lastName) user.personalDetails.lastName = lastName;
    if (jobTitle !== undefined) user.employmentDetails.jobTitle = jobTitle;
    if (officeLocation !== undefined) user.employmentDetails.officeLocation = officeLocation;
    if (salary !== undefined) user.employmentDetails.salary = salary;
    if (dateOfHire !== undefined) user.employmentDetails.dateOfHire = dateOfHire;
    if (companyCode !== undefined) user.companyCode = companyCode;
    if (reportingTo !== undefined) user.employmentDetails.reportingTo = reportingTo;

    if (role) user.security.role = role;

    // Securely handle Array assignment for Secondary Roles
    if (secondaryRoles !== undefined) {
      user.security.secondaryRoles = Array.isArray(secondaryRoles) ? secondaryRoles : [secondaryRoles];
    }

    await user.save();

    const { logAudit } = require('../utils/logger');
    await logAudit({
      user: req.user, role: req.user.role, action: 'USER_UPDATED', category: 'ADMIN_ACTION', severity: 'MEDIUM',
      details: `Updated profile & portal clearances for ${firstName} ${lastName}`, req
    });

    res.json({ message: 'Employee updated successfully.', data: user });
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(400).json({ message: error.message || 'Error updating user.' });
  }
});

// 8b. PATCH /api/v1/users/:id/status (Toggle Login Access)
router.patch('/:id/status', roleGuard('HR_ADMIN', 'ICT_ADMIN', 'ICT Admin', 'admin', 'ADMIN', 'ict_admin'), async (req, res) => {
  try {
    const { isActive } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found.' });

    user.employmentDetails.isActive = isActive;
    await user.save();

    const { logAudit } = require('../utils/logger');
    await logAudit({
      user: req.user, role: req.user.role, action: 'USER_UPDATED', category: 'ADMIN_ACTION', severity: 'HIGH',
      details: `User login access ${isActive ? 'ACTIVATED' : 'DEACTIVATED'} for ${user.personalDetails.firstName} ${user.personalDetails.lastName}`, req
    });

    res.json({ message: `User access updated.` });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// 8c. PATCH /api/v1/users/:id/restore (Restore from Recycle Bin)
router.patch('/:id/restore', roleGuard('HR_ADMIN', 'ICT_ADMIN', 'CEO'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found.' });

    user.employmentDetails.isDeleted = false;
    user.employmentDetails.isActive = true; 
    await user.save();

    const { logAudit } = require('../utils/logger');
    await logAudit({
      user: req.user, role: req.user.role, action: 'USER_RESTORED', category: 'ADMIN_ACTION', severity: 'MEDIUM',
      details: `Restored ${user.personalDetails.firstName} ${user.personalDetails.lastName} from Recycle Bin.`, req
    });

    res.json({ message: 'User restored successfully.' });
  } catch (error) {
    res.status(500).json({ message: 'Error restoring user.' });
  }
});

// 9. DELETE /api/v1/users/:id (Move to Recycle Bin - Soft Delete)
router.delete('/:id', roleGuard('HR_ADMIN', 'ICT_ADMIN', 'ICT Admin', 'admin', 'ADMIN', 'ict_admin'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found.' });

    user.employmentDetails.isDeleted = true;
    user.employmentDetails.isActive = false; 
    await user.save();

    const { logAudit } = require('../utils/logger');
    await logAudit({
      user: req.user, role: req.user.role, action: 'USER_DELETED', category: 'ADMIN_ACTION', severity: 'HIGH',
      details: `Moved ${user.personalDetails.firstName} ${user.personalDetails.lastName} to Recycle Bin.`, req
    });

    res.json({ message: 'User moved to Recycle Bin successfully.' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting user.' });
  }
});

// 10. DELETE /api/v1/users/:id/permanent (Wipe completely)
router.delete('/:id/permanent', roleGuard('HR_ADMIN', 'ICT_ADMIN', 'CEO'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found.' });

    await User.findByIdAndDelete(req.params.id);

    const { logAudit } = require('../utils/logger');
    await logAudit({
      user: req.user, role: req.user.role, action: 'USER_PERMANENTLY_DELETED', category: 'ADMIN_ACTION', severity: 'CRITICAL',
      details: `Permanently deleted ${user.personalDetails.firstName} ${user.personalDetails.lastName} from the database.`, req
    });

    res.json({ message: 'User permanently deleted.' });
  } catch (error) {
    res.status(500).json({ message: 'Error permanently deleting user.' });
  }
});

module.exports = router;