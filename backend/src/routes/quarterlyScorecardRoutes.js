const express = require('express');
const router = express.Router();
const controller = require('../controllers/quarterlyScorecardController');
const { authGuard, roleGuard } = require('../middleware/auth');

router.use(authGuard);

router.get('/:year', controller.getScorecardsByYear);
router.post('/:year/:quarter', roleGuard('CEO', 'HR_ADMIN', 'ICT_ADMIN', 'ADMIN', 'ICT Admin'), controller.saveScorecard);

module.exports = router;