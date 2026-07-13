const express = require('express');
const router = express.Router();
const executiveController = require('../controllers/executiveController');
const { authGuard, roleGuard } = require('../middleware/auth');

router.use(authGuard);

// Route for HR Admin to create a new Executive
router.post('/create', roleGuard('HR_ADMIN', 'ADMIN'), executiveController.createExecutive);

// Route for the Executive to fetch their specific dashboard metrics
router.get('/dashboard', roleGuard('EXECUTIVE'), executiveController.getExecutiveDashboardData);

module.exports = router;