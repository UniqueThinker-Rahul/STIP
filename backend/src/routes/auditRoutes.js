const express = require('express');
const router = express.Router();
const { authGuard, roleGuard } = require('../middleware/auth');
const auditController = require('../controllers/auditController'); // 🚨 Imported the new controller

// Ensure user is logged in
router.use(authGuard);

// 🚨 Apply security guards and route the request to the controller
router.get('/', roleGuard('ICT_ADMIN', 'ICT Admin', 'admin', 'ADMIN', 'ict_admin', 'CEO'), auditController.getAuditLogs);

module.exports = router;