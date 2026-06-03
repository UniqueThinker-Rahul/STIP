// backend/src/routes/auditRoutes.js
const express = require('express');
const router = express.Router();
const AuditLog = require('../models/AuditLog');
const { authGuard, roleGuard } = require('../middleware/auth');

router.use(authGuard);
router.use(roleGuard('ICT_ADMIN'));

router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50; 
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.query.category && req.query.category !== 'ALL') filter.category = req.query.category;
    if (req.query.severity && req.query.severity !== 'ALL') filter.severity = req.query.severity;
    
    if (req.query.search) {
      filter.$or = [
        { action: { $regex: req.query.search, $options: 'i' } },
        { details: { $regex: req.query.search, $options: 'i' } }
      ];
    }

    // 🚨 NEW: Dynamic Date Filtering (Restricted to max 6 months history)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    filter.createdAt = { $gte: sixMonthsAgo }; // Absolute baseline limit

    if (req.query.startDate && req.query.endDate) {
      const start = new Date(req.query.startDate); start.setHours(0,0,0,0);
      const end = new Date(req.query.endDate); end.setHours(23,59,59,999);
      // Ensure user search doesn't query beyond 6 months
      filter.createdAt = { $gte: start > sixMonthsAgo ? start : sixMonthsAgo, $lte: end };
    }

    // If it's an export request, bypass pagination
    if (req.query.export === 'true') {
        const allLogs = await AuditLog.find(filter)
            .populate('user', 'personalDetails email employeeId username')
            .sort({ createdAt: -1 });
        return res.status(200).json({ success: true, data: allLogs });
    }

    const logs = await AuditLog.find(filter)
      .populate('user', 'personalDetails email employeeId username')
      .sort({ createdAt: -1 }) 
      .skip(skip)
      .limit(limit);

    const total = await AuditLog.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: logs,
      pagination: { total, page, pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    console.error('Audit Log Fetch Error:', error);
    res.status(500).json({ success: false, message: 'Server Error fetching audit trail.' });
  }
});

module.exports = router;