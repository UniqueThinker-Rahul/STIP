const express = require('express');
const router = express.Router();
const { authGuard, roleGuard } = require('../middleware/auth');
const { getHrQueue, handleWorkflowAction, getMyNotices } = require('../controllers/hrQueueController');

// Safety fallback in case roleGuard isn't fully configured in the middleware yet
const requireRole = typeof roleGuard === 'function' ? roleGuard('HR_ADMIN', 'CEO') : (req, res, next) => next();

// GET route to load the table (HR/CEO only)
router.get('/', authGuard, requireRole, getHrQueue);

// NEW ROUTE: Dedicated endpoint for staff to submit their own response. 
// Uses authGuard to ensure they are logged in, but bypasses requireRole (HR/CEO check).
// We map it directly to the same controller action.
router.post('/staff/respond/:id', authGuard, (req, res, next) => {
    // Manually inject the action parameter so the controller knows what to do
    req.params.action = 'record-response';
    next();
}, handleWorkflowAction);

// POST route to handle all other dynamic action buttons (HR/CEO only)
router.post('/:id/:action', authGuard, requireRole, handleWorkflowAction);

// GET route to fetch cases for the authenticated user (no HR/CEO role guard needed, just authGuard)
router.get('/staff/my-notices', authGuard, getMyNotices);

module.exports = router;