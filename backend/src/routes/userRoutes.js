// backend/src/routes/userRoutes.js
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const userController = require('../controllers/userController');
//const { authGuard } = require('../middleware/auth');

// 1. IMPORT MIDDLEWARE 
// (We only import from auth.js, preventing duplicate declarations)
const { authGuard, roleGuard } = require('../middleware/auth');

// 2. APPLY GLOBAL AUTH
// This ensures ALL routes below require a valid login token.
router.use(authGuard);

// 3. GET /api/v1/users (The Staff Directory)
router.get('/', async (req, res) => {
  try {
    let query = {};
    if (req.user.role === 'MANAGER') {
      query = { 'employmentDetails.reportingTo': req.user.id };
    } else if (req.user.role === 'EMPLOYEE') {
      return res.status(403).json({ message: 'Employees do not have directory access.' });
    }

    const users = await User.find(query)
      .select('-password -security.currentSessionId')
      .populate('employmentDetails.reportingTo', 'personalDetails.firstName personalDetails.lastName');

    res.json({ count: users.length, data: users });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching staff directory.' });
  }
});

// 4. GET /api/v1/users/managers (Populates HR dropdowns)
router.get('/managers', async (req, res) => {
  try {
    const managers = await User.find({
      'security.role': { $in: ['MANAGER', 'HR_ADMIN', 'CEO'] }
    }).select("personalDetails employeeId");
    
    res.json({ data: managers });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching managers.' });
  }
});

// 5. GET /api/v1/users/my-team 
// MUST BE ABOVE /:id to prevent Express from thinking "my-team" is a user ID
router.get('/my-team', userController.getMyTeam);

// 6. GET /api/v1/users/:id (View a specific profile)
router.get('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password -security.currentSessionId')
      .populate('employmentDetails.reportingTo', 'personalDetails.firstName personalDetails.lastName');
      
    if (!user) return res.status(404).json({ message: 'User not found.' });

    // Ensure managers can only view their own direct reports
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
router.post('/', roleGuard('HR_ADMIN', 'ICT_ADMIN'), async (req, res) => {
  try {
    const { employeeId, firstName, lastName, jobTitle, dateOfHire, role, reportingTo } = req.body;
    const hiringYear = new Date(dateOfHire).getFullYear();
    const username = `${employeeId}${hiringYear}`;
    const password = `STIP+${employeeId}`;

    const newUser = new User({
      employeeId,
      companyCode: 'FSM',
      username,
      password,
      personalDetails: { firstName, lastName },
      employmentDetails: { jobTitle, dateOfHire, reportingTo: reportingTo || null },
      security: { role: role || 'EMPLOYEE', isFirstLogin: true }
    });

    await newUser.save();
    res.status(201).json({ message: 'Staff member created successfully.', username });
  } catch (error) {
    res.status(400).json({ message: 'Error creating user.' });
  }
});

// 8. PATCH /api/v1/users/:id/hr-update (Edit, Upgrade Role, Reassign Manager)
router.patch('/:id/hr-update', roleGuard('HR_ADMIN', 'ICT_ADMIN'), userController.updateUserByHR);

// 9. DELETE /api/v1/users/:id (Delete staff)
router.delete('/:id', roleGuard('HR_ADMIN', 'ICT_ADMIN'), userController.deleteUser);

module.exports = router;