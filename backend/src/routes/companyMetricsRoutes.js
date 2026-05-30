const express = require('express');
const router = express.Router();
const metricsController = require('../controllers/companyMetricsController');
const { authGuard, roleGuard } = require('../middleware/auth');

router.use(authGuard); 

// Fetch metrics
router.get('/:year', metricsController.getMetricsByYear);

// Update metrics (Supports both root POST and param PUT for maximum frontend compatibility)
// 🚨 UPGRADED: Added multiple variations of the ICT role to prevent 403 errors
router.post('/', roleGuard('CEO', 'HR_ADMIN', 'ICT_ADMIN', 'ICT Admin', 'admin', 'ADMIN', 'ict_admin'), metricsController.updateMetrics);
router.put('/:year', roleGuard('CEO', 'HR_ADMIN', 'ICT_ADMIN', 'ICT Admin', 'admin', 'ADMIN', 'ict_admin'), metricsController.updateMetrics);

module.exports = router;