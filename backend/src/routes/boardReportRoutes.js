const express = require('express');
const router = express.Router();
const boardReportController = require('../controllers/boardReportController');
const { authGuard, roleGuard } = require('../middleware/auth');

router.use(authGuard);

// 🚨 FIX: Explicitly matches the "/board-report" path requested by the frontend
router.get('/board-report', roleGuard('CEO', 'HR_ADMIN', 'ICT_ADMIN', 'ADMIN'), boardReportController.getBoardReportData);

module.exports = router;