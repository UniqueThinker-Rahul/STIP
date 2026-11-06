const express = require('express');
const router = express.Router();
const {
  getOffences,
  createOffence,
  updateOffence,
  deleteOffence,
  addCategory
} = require('../controllers/offenceController');

// Optional: Add your authentication & RBAC middleware here to guard write operations
// e.g., router.use(protect, authorize('HR_ADMIN', 'ICT_ADMIN'));

router.route('/')
  .get(getOffences)
  .post(createOffence);

router.post('/categories', addCategory);

router.route('/:id')
  .put(updateOffence)
  .delete(deleteOffence);

module.exports = router;