const express = require('express');
const router = express.Router();
const AppraisalQuarter = require('../models/AppraisalQuarter');
const { authGuard, roleGuard } = require('../middleware/auth');
const { logAudit } = require('../utils/logger');

router.use(authGuard);

// 1. GET ALL QUARTERS (Anyone logged in can view them for dropdowns)
router.get('/', async (req, res) => {
  try {
    const quarters = await AppraisalQuarter.find().sort({ startDate: -1 });
    res.json({ data: quarters });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching quarters' });
  }
});

// 2. HR/ICT/CEO: CREATE A QUARTER
// 🚨 UPGRADED: Added ICT_ADMIN and CEO to the roleGuard to prevent 403 Forbidden errors
router.post('/', roleGuard('HR_ADMIN', 'ICT_ADMIN', 'CEO'), async (req, res) => {
  try {
    const { name, year, startDate, endDate } = req.body;
    
    const newQuarter = new AppraisalQuarter({
      name, year, startDate, endDate, createdBy: req.user.id
    });
    
    await newQuarter.save();
    
    // 🚨 UPGRADED: Dynamic role logging instead of hardcoded 'HR Admin'
    await logAudit({
      user: req.user, role: req.user.role, action: 'QUARTER_CREATED', category: 'SYSTEM_CONFIG', severity: 'MEDIUM',
      details: `${req.user.role || 'Admin'} created a new appraisal timeline: ${name}`, req
    });

    res.status(201).json({ message: 'Appraisal Quarter created successfully', data: newQuarter });
  } catch (error) {
    res.status(500).json({ message: 'Error creating quarter' });
  }
});

// 3. ICT/CEO/HR: FORCE UNLOCK AN EXPIRED QUARTER
// 🚨 UPGRADED: Added HR_ADMIN so HR can also unlock deadlines if needed
router.patch('/:id/unlock', roleGuard('ICT_ADMIN', 'CEO', 'HR_ADMIN'), async (req, res) => {
  try {
    const quarter = await AppraisalQuarter.findById(req.params.id);
    if (!quarter) return res.status(404).json({ message: 'Quarter not found' });

    // Toggle the force unlock status
    quarter.forceUnlock = !quarter.forceUnlock;
    await quarter.save();

    await logAudit({
      user: req.user, role: req.user.role, action: 'QUARTER_UNLOCKED', category: 'SECURITY', severity: 'HIGH',
      details: `${req.user.role || 'Admin'} ${quarter.forceUnlock ? 'UNLOCKED' : 'LOCKED'} the expired quarter: ${quarter.name}`, req
    });

    res.json({ 
      message: `Quarter is now ${quarter.forceUnlock ? 'UNLOCKED (Accepting late submissions)' : 'LOCKED (Enforcing deadline)'}.`, 
      data: quarter 
    });
  } catch (error) {
    res.status(500).json({ message: 'Error unlocking quarter' });
  }
});

module.exports = router;