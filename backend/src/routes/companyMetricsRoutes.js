const express = require('express');
const router = express.Router();
const metricsController = require('../controllers/companyMetricsController');
const { authGuard, roleGuard } = require('../middleware/auth');

router.use(authGuard); 

// Fetch metrics
router.get('/:year', metricsController.getMetricsByYear);

// Update metrics (Supports both root POST and param PUT for maximum frontend compatibility)
router.post('/', roleGuard('CEO', 'HR_ADMIN'), metricsController.updateMetrics);
router.put('/:year', roleGuard('CEO', 'HR_ADMIN'), metricsController.updateMetrics);

module.exports = router;