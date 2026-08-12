// backend/src/routes/userRoutes.js
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Appraisal = require('../models/Appraisal'); // 🚨 UPGRADE: Imported Appraisal model for deletion hook
const userController = require('../controllers/userController');
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

    // Heavy Projection Optimization. We strip out giant data blobs to speed up loading.
    const users = await User.find(query)
      .select('employeeId username personalDetails.firstName personalDetails.lastName personalDetails.notificationEmails employmentDetails.isActive employmentDetails.jobTitle employmentDetails.officeLocation employmentDetails.dateOfHire employmentDetails.salary employmentDetails.prorateValue companyCode security.role security.secondaryRoles')
      .populate('employmentDetails.reportingTo', 'personalDetails.firstName personalDetails.lastName')
      .populate('employmentDetails.executiveTo', 'personalDetails.firstName personalDetails.lastName') // Added Executive population
      .lean(); 

    res.json({ count: users.length, data: users });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching staff directory.' });
  }
});

// PATCH /api/v1/users/notification-email (Update or Remove own notification email)
router.patch('/notification-email', async (req, res) => {
  try {
    const roleKey = req.body.targetRole || req.body.role || req.user.role;
    const emailValue = req.body.newEmail !== undefined ? req.body.newEmail : req.body.email;
    const userId = req.body.userId || req.user.id;

    if (!roleKey || typeof roleKey !== 'string') {
      return res.status(400).json({ success: false, message: 'Valid role key is required to update notification emails.' });
    }

    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    if (!user.personalDetails) user.personalDetails = {};
    if (!user.personalDetails.notificationEmails) {
      user.personalDetails.notificationEmails = new Map();
    }
    
    const isMap = user.personalDetails.notificationEmails instanceof Map;

    if (!emailValue || emailValue.trim() === '') {
      if (isMap) {
        user.personalDetails.notificationEmails.delete(roleKey);
      } else {
        delete user.personalDetails.notificationEmails[roleKey];
      }
    } else {
      if (isMap) {
        user.personalDetails.notificationEmails.set(roleKey, emailValue);
      } else {
        user.personalDetails.notificationEmails = {
          ...user.personalDetails.notificationEmails,
          [roleKey]: emailValue
        };
      }
    }

    user.markModified('personalDetails.notificationEmails');
    await user.save();

    res.status(200).json({ 
      success: true, 
      message: (!emailValue || emailValue.trim() === '') 
        ? 'Notification email removed successfully.' 
        : 'Notification email updated successfully.' 
    });

  } catch (error) {
    console.error("Notification Email Update Error:", error);
    res.status(500).json({ success: false, message: 'Server error updating notification email.' });
  }
});

// PATCH /api/v1/users/:id/alert-email (ICT Admin Route)
router.patch('/:id/alert-email', roleGuard('ICT_ADMIN'), async (req, res) => {
  try {
    const { targetRole, newEmail } = req.body;
    
    if (!targetRole) return res.status(400).json({ success: false, message: 'Role context is required.' });

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    if (!user.personalDetails) user.personalDetails = {};
    if (!user.personalDetails.notificationEmails) {
      user.personalDetails.notificationEmails = new Map();
    }

    if (user.personalDetails.notificationEmails instanceof Map) {
      if (!newEmail || newEmail.trim() === '') {
        user.personalDetails.notificationEmails.delete(targetRole);
      } else {
        user.personalDetails.notificationEmails.set(targetRole, newEmail);
      }
    } else {
      if (!newEmail || newEmail.trim() === '') {
         delete user.personalDetails.notificationEmails[targetRole];
      } else {
         user.personalDetails.notificationEmails = {
           ...user.personalDetails.notificationEmails,
           [targetRole]: newEmail
         };
      }
    }

    user.markModified('personalDetails.notificationEmails');
    await user.save();

    if (newEmail && newEmail.trim() !== '') {
      await Notification.create({
        recipient: user._id,
        sender: req.user.id,
        title: 'Alert Email Updated',
        message: `The ICT Admin has updated your notification email address for the ${targetRole.replace('_', ' ')} portal to: ${newEmail}`,
        type: 'SYSTEM_ALERT',
        targetRole: targetRole
      });
    }

    const { logAudit } = require('../utils/logger');
    await logAudit({
      user: req.user, role: req.user.role, action: 'UPDATED_NOTIFICATION_PREF', 
      category: 'USER_MANAGEMENT', severity: 'LOW',
      details: `ICT Admin updated notification email for ${user.username} (${targetRole}) to: ${newEmail || '[REMOVED]'}`, req
    });

    res.json({ success: true, message: `Preferences updated for ${targetRole.replace('_', ' ')}.` });
  } catch (error) {
    console.error("Error updating alert email:", error);
    res.status(500).json({ success: false, message: 'Server error updating profile.' });
  }
});

// GET /api/v1/users/recycle-bin (The Soft Deleted Users)
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

// GET /api/v1/users/managers (Populates HR dropdowns)
router.get('/managers', async (req, res) => {
  try {
    const managerRoles = ['MANAGER', 'HR_ADMIN', 'CEO'];
    
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

// 🚨 UPGRADED: Expanded roleGuard to prevent 403 blocks for dual-admins
router.get('/executives', roleGuard('HR_ADMIN', 'ADMIN', 'ICT_ADMIN', 'admin'), async (req, res) => {
  try {
    const executives = await User.find({
      'employmentDetails.isDeleted': { $ne: true },
      $or: [
        { 'security.role': 'EXECUTIVE' },
        { 'security.secondaryRoles': 'EXECUTIVE' },
        { 'role': 'EXECUTIVE' } 
      ]
    })
    .select("personalDetails.firstName personalDetails.lastName employeeId security.role security.secondaryRoles")
    .lean();
    
    res.json({ data: executives });
  } catch (error) {
    console.error("Error fetching executives:", error);
    res.status(500).json({ message: 'Error fetching executives.' });
  }
});

// GET /api/v1/users/my-team 
router.get('/my-team', userController.getMyTeam);

// GET /api/v1/users/:id (View a specific profile)
router.get('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password -security.currentSessionId')
      .populate('employmentDetails.reportingTo', 'personalDetails.firstName personalDetails.lastName')
      .populate('employmentDetails.executiveTo', 'personalDetails.firstName personalDetails.lastName'); 
      
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

// POST /api/v1/users (Create new staff)
router.post('/', roleGuard('HR_ADMIN', 'ICT_ADMIN', 'ICT Admin', 'admin', 'ADMIN', 'ict_admin'), async (req, res) => {
  try {
    const { employeeId, firstName, lastName, jobTitle, officeLocation, companyCode, dateOfHire, role, reportingTo, executiveTo, prorateValue, isActive, salary } = req.body;
    
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
        executiveTo: executiveTo || null, 
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

// PATCH /api/v1/users/:id/hr-update (Edit Profile)
router.patch('/:id/hr-update', roleGuard('HR_ADMIN', 'ICT_ADMIN', 'ICT Admin', 'admin', 'ADMIN', 'ict_admin'), async (req, res) => {
  try {
    const { 
      firstName, lastName, jobTitle, officeLocation, companyCode, 
      dateOfHire, role, secondaryRoles, reportingTo, executiveTo, salary,
      notificationEmails
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
    if (executiveTo !== undefined) user.employmentDetails.executiveTo = executiveTo; 

    if (role) user.security.role = role;

    if (secondaryRoles !== undefined) {
      user.security.secondaryRoles = Array.isArray(secondaryRoles) ? secondaryRoles : [secondaryRoles];
    }

    if (notificationEmails && typeof notificationEmails === 'object') {
      if (!user.personalDetails.notificationEmails) {
         user.personalDetails.notificationEmails = new Map();
      }
      Object.keys(notificationEmails).forEach(key => {
         const val = notificationEmails[key];
         if (!val || String(val).trim() === '') {
            user.personalDetails.notificationEmails.delete(key);
         } else {
            user.personalDetails.notificationEmails.set(key, String(val).trim());
         }
      });
      user.markModified('personalDetails.notificationEmails');
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

// PATCH /api/v1/users/:id/status (Toggle Login Access)
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

// PATCH /api/v1/users/:id/restore (Restore from Recycle Bin)
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

// DELETE /api/v1/users/:id (Move to Recycle Bin - Soft Delete)
router.delete('/:id', roleGuard('HR_ADMIN', 'ICT_ADMIN', 'ICT Admin', 'admin', 'ADMIN', 'ict_admin'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found.' });

    user.employmentDetails.isDeleted = true;
    user.employmentDetails.isActive = false; 
    await user.save();

    // 🚨 UPGRADE: Automatically move active appraisals to Inactive Directory when employee is recycled
    await Appraisal.updateMany(
      { employeeId: req.params.id, isArchived: { $ne: true } },
      { 
        $set: { 
          isArchived: true, 
          archiveReason: 'EMPLOYEE_DELETED',
          archivedAt: new Date(),
          'workflow.status': 'ARCHIVED' 
        } 
      }
    );

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

// 🚨 UPGRADE: Permanent Delete route completely removed to secure the API.

module.exports = router;