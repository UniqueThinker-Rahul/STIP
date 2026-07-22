const express = require('express');
const router = express.Router();
const AppraisalQuarter = require('../models/AppraisalQuarter');
const { authGuard, roleGuard } = require('../middleware/auth');
const { logAudit } = require('../utils/logger');

router.use(authGuard);

// 1. GET ALL QUARTERS (Hides unpublished quarters universally)
router.get('/', async (req, res) => {
  try {
    const { all } = req.query;
    let query = {};
    
    // Unless specifically requested via "?all=true", hide unpublished quarters everywhere
    if (all !== 'true') {
      query.isPublished = true;
    }

    const quarters = await AppraisalQuarter.find(query).sort({ startDate: -1 });
    res.json({ data: quarters });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching quarters' });
  }
});

// 2. CREATE A QUARTER
router.post('/', roleGuard('HR_ADMIN', 'ICT_ADMIN', 'CEO'), async (req, res) => {
  try {
    const { name, year, startDate, endDate, isPublished } = req.body;

    // 🚨 UPGRADED: Block HR from publishing during creation
    if (isPublished === true && req.user.role === 'HR_ADMIN') {
      return res.status(403).json({ message: 'Permission Denied: HR can create quarters, but only the CEO can publish them.' });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (start.getFullYear() !== year || end.getFullYear() !== year) {
      return res.status(400).json({ message: `Dates must fall within the selected fiscal year (${year}).` });
    }

    const quarterSequence = ['Q1', 'Q2', 'Q3', 'Q4'];
    const selectedQIndex = quarterSequence.indexOf(name);
    
    if (selectedQIndex > 0) {
      const requiredPreviousQ = quarterSequence[selectedQIndex - 1];
      const prevQuarter = await AppraisalQuarter.findOne({ year, name: requiredPreviousQ });
      
      if (!prevQuarter) {
        return res.status(400).json({ message: `Sequence Error: You must establish ${requiredPreviousQ} for ${year} before creating ${name}.` });
      }
      
      if (start <= new Date(prevQuarter.endDate)) {
        return res.status(400).json({ message: `Timeline Error: ${name} must start after ${requiredPreviousQ} ends.` });
      }
    }
    
    const newQuarter = new AppraisalQuarter({
      name, year, startDate, endDate, isPublished: isPublished || false, createdBy: req.user.id
    });
    
    await newQuarter.save();
    
    await logAudit({
      user: req.user, role: req.user.role, action: 'QUARTER_CREATED', category: 'SYSTEM_CONFIG', severity: 'MEDIUM',
      details: `${req.user.role || 'Admin'} created a new appraisal timeline: ${name}`, req
    });

    res.status(201).json({ message: 'Appraisal Quarter created successfully', data: newQuarter });
  } catch (error) {
    res.status(500).json({ message: 'Error creating quarter' });
  }
});

// 3. EDIT AN UPCOMING QUARTER & SMART BYPASS
router.put('/:id', roleGuard('HR_ADMIN', 'ICT_ADMIN', 'CEO'), async (req, res) => {
  try {
    const { name, year, startDate, endDate, isPublished } = req.body;
    const quarter = await AppraisalQuarter.findById(req.params.id);
    
    if (!quarter) return res.status(404).json({ message: 'Quarter not found' });

    // Smart bypass for the isPublished toggle.
    const start = new Date(quarter.startDate);
    start.setHours(0, 0, 0, 0);
    const isActiveOrExpired = new Date() >= start;

    if (isActiveOrExpired) {
      const formatAsInputDate = (d) => new Date(d).toISOString().split('T')[0];
      
      // If trying to change core dates/names on an active/expired quarter, block it.
      if (
        quarter.name !== name || 
        quarter.year !== year || 
        formatAsInputDate(quarter.startDate) !== formatAsInputDate(startDate) || 
        formatAsInputDate(quarter.endDate) !== formatAsInputDate(endDate)
      ) {
        return res.status(403).json({ message: 'Permission Denied: Only Upcoming quarters can have their dates or names modified.' });
      }

      // 🚨 UPGRADED: Block HR from publishing/unpublishing via the active bypass
      if (isPublished !== undefined && quarter.isPublished !== isPublished) {
        if (req.user.role === 'HR_ADMIN') {
          return res.status(403).json({ message: 'Permission Denied: Only the CEO can publish or unpublish a quarter.' });
        }
        quarter.isPublished = isPublished;
      }

      await quarter.save();
      return res.json({ message: 'Quarter publish state updated successfully', data: quarter });
    }

    // --- Standard Edit Logic for Upcoming Quarters ---
    const newStart = new Date(startDate);
    const newEnd = new Date(endDate);
    if (newStart.getFullYear() !== year || newEnd.getFullYear() !== year) {
      return res.status(400).json({ message: `Dates must fall within the selected fiscal year (${year}).` });
    }

    const quarterSequence = ['Q1', 'Q2', 'Q3', 'Q4'];
    const selectedQIndex = quarterSequence.indexOf(name);
    
    if (selectedQIndex > 0) {
      const requiredPreviousQ = quarterSequence[selectedQIndex - 1];
      const prevQuarter = await AppraisalQuarter.findOne({ year, name: requiredPreviousQ, _id: { $ne: quarter._id } });
      
      if (prevQuarter && newStart <= new Date(prevQuarter.endDate)) {
        return res.status(400).json({ message: `Timeline Error: ${name} must start after ${requiredPreviousQ} ends.` });
      }
    }

    if (selectedQIndex < 3) {
      const nextQ = quarterSequence[selectedQIndex + 1];
      const nextQuarter = await AppraisalQuarter.findOne({ year, name: nextQ, _id: { $ne: quarter._id } });
      
      if (nextQuarter && newEnd >= new Date(nextQuarter.startDate)) {
        return res.status(400).json({ message: `Timeline Error: ${name} must end before ${nextQ} starts.` });
      }
    }

    quarter.name = name;
    quarter.year = year;
    quarter.startDate = startDate;
    quarter.endDate = endDate;
    
    // 🚨 UPGRADED: Block HR from publishing/unpublishing during standard edit
    if (isPublished !== undefined && quarter.isPublished !== isPublished) {
      if (req.user.role === 'HR_ADMIN') {
        return res.status(403).json({ message: 'Permission Denied: Only the CEO can publish or unpublish a quarter.' });
      }
      quarter.isPublished = isPublished; 
    }
    
    await quarter.save();

    await logAudit({
      user: req.user, role: req.user.role, action: 'QUARTER_UPDATED', category: 'SYSTEM_CONFIG', severity: 'MEDIUM',
      details: `${req.user.role || 'Admin'} updated upcoming quarter: ${name}`, req
    });

    res.json({ message: 'Quarter updated successfully', data: quarter });
  } catch (error) {
    res.status(500).json({ message: 'Error updating quarter' });
  }
});

// 4. DELETE AN UPCOMING QUARTER
router.delete('/:id', roleGuard('HR_ADMIN', 'ICT_ADMIN', 'CEO'), async (req, res) => {
  try {
    const quarter = await AppraisalQuarter.findById(req.params.id);
    if (!quarter) return res.status(404).json({ message: 'Quarter not found' });

    // Enforce "Upcoming Status Only" deletion rule
    const start = new Date(quarter.startDate);
    start.setHours(0, 0, 0, 0);
    if (new Date() >= start) {
      return res.status(403).json({ message: 'Permission Denied: Only Upcoming quarters can be deleted.' });
    }

    // Prevent deleting a quarter if a subsequent one exists
    const quarterSequence = ['Q1', 'Q2', 'Q3', 'Q4'];
    const selectedQIndex = quarterSequence.indexOf(quarter.name);
    
    if (selectedQIndex < 3) {
      const nextQ = quarterSequence[selectedQIndex + 1];
      const hasNext = await AppraisalQuarter.findOne({ year: quarter.year, name: nextQ });
      
      if (hasNext) {
        return res.status(400).json({ message: `Sequence Error: You must delete ${nextQ} before deleting ${quarter.name}.` });
      }
    }

    await AppraisalQuarter.findByIdAndDelete(req.params.id);

    await logAudit({
      user: req.user, role: req.user.role, action: 'QUARTER_DELETED', category: 'SYSTEM_CONFIG', severity: 'HIGH',
      details: `${req.user.role || 'Admin'} deleted upcoming quarter: ${quarter.name}`, req
    });

    res.json({ message: 'Quarter deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting quarter' });
  }
});

// 5. FORCE UNLOCK AN EXPIRED QUARTER
router.patch('/:id/unlock', roleGuard('ICT_ADMIN', 'CEO', 'HR_ADMIN'), async (req, res) => {
  try {
    const quarter = await AppraisalQuarter.findById(req.params.id);
    if (!quarter) return res.status(404).json({ message: 'Quarter not found' });

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