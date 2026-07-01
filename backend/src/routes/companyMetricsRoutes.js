const express = require('express');
const router = express.Router();
const metricsController = require('../controllers/companyMetricsController');
const { authGuard, roleGuard } = require('../middleware/auth');

router.use(authGuard); 

// Fixes 404: Route for Manager Dashboard (uses current month automatically)
router.get('/:year', metricsController.getMetricsByYearAndMonth);

// Fixes 500: Route for KPA Scorecard (uses specific month)
router.get('/:year/:month', metricsController.getMetricsByYearAndMonth);

// Fixes 500: Updates metrics 
router.post('/', roleGuard('CEO', 'HR_ADMIN', 'ICT_ADMIN', 'ICT Admin', 'admin', 'ADMIN', 'ict_admin'), metricsController.updateMetrics);
router.put('/:year/:month', roleGuard('CEO', 'HR_ADMIN', 'ICT_ADMIN', 'ICT Admin', 'admin', 'ADMIN', 'ict_admin'), metricsController.updateMetrics);

module.exports = router;