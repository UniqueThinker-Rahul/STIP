// backend/src/controllers/companyMetricsController.js
const CompanyMetric = require('../models/CompanyMetric');

exports.getMetricsByYear = async (req, res) => {
  try {
    const reviewYear = parseInt(req.params.year) || new Date().getFullYear();
    
    const metrics = await CompanyMetric.findOneAndUpdate(
      { reviewYear },
      { $setOnInsert: { reviewYear } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    ).populate('lockedBy', 'personalDetails.firstName personalDetails.lastName');

    res.status(200).json({ success: true, data: metrics });
  } catch (error) {
    console.error("Metrics DB Error:", error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

exports.updateMetrics = async (req, res) => {
  try {
    const reviewYear = req.body.reviewYear || parseInt(req.params.year) || new Date().getFullYear();
    const { locked } = req.body;
    
    let metrics = await CompanyMetric.findOne({ reviewYear });
    if (!metrics) {
      metrics = new CompanyMetric({ reviewYear });
    }

    // 🚨 UPGRADED: Allow ICT_ADMIN to bypass the lock prevention block
    const userRole = req.user?.role || req.user?.security?.role || '';
    const isIctAdmin = String(userRole).toUpperCase().includes('ICT') || String(userRole).toUpperCase() === 'ADMIN';

    // Security: Prevent edits if already locked by the board, EXCEPT for ICT Admin resetting it
    if (metrics.locked && req.body.locked === false && !isIctAdmin) {
      return res.status(403).json({ message: 'Scorecard is permanently locked by the Board.' });
    }

    // 🚨 CONFIDENTIAL CALCULATION DATA (Untouched)
    const { financialResilience, operationalEffectiveness, humanCapital, safetyEnvironment, reputationalCapital } = req.body;
    
    if (
      financialResilience !== undefined && financialResilience !== null && 
      operationalEffectiveness !== undefined && operationalEffectiveness !== null &&
      humanCapital !== undefined && humanCapital !== null && 
      safetyEnvironment !== undefined && safetyEnvironment !== null &&
      reputationalCapital !== undefined && reputationalCapital !== null
    ) {
      // Calculate the BSC Raw Score based on the weights
      const bsc = (financialResilience * 0.14) +
                  (operationalEffectiveness * 0.45) +
                  (humanCapital * 0.26) +
                  (safetyEnvironment * 0.12) +
                  (reputationalCapital * 0.03);
      
      req.body.bscRawScore = bsc;
      req.body.cpPct = bsc * 0.15; // Max 15% Cap applied
    }

    // Capture the previous lock state before applying updates
    const wasLocked = metrics.locked;

    // Apply updates from the request body to the database object
    Object.assign(metrics, req.body);

    // 🚨 UPGRADED: Properly handle the Lock/Unlock audit stamping
    if (locked === true && !wasLocked) {
      metrics.lockedBy = req.user?.id || req.user?._id;
      metrics.lockedAt = new Date();
    } else if (locked === false && wasLocked) {
      // Clear the lock tracking data when ICT resets it
      metrics.lockedBy = null;
      metrics.lockedAt = null;
    }

    // Save the record
    await metrics.save(); 

    res.status(200).json({ success: true, data: metrics });
  } catch (error) {
    console.error("Metrics Update Error:", error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};