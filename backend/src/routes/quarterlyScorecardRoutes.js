const express = require('express');
const router = express.Router();
const scorecardsController = require('../controllers/quarterlyScorecardController');
const { authGuard, roleGuard } = require('../middleware/auth');

router.use(authGuard);

router.get('/:year', scorecardsController.getScorecardsByYear);
router.post('/:year/:quarter', roleGuard('ICT_ADMIN', 'CEO', 'HR_ADMIN', 'ADMIN'), scorecardsController.saveScorecard);

module.exports = router;