const CompanyMetric = require('../models/CompanyMetric');

exports.getMetricsByYearAndMonth = async (req, res) => {
  try {
    // 🚨 FIX: Moved index healing INSIDE the function to guarantee DB connection is active
    try { await CompanyMetric.collection.dropIndex('year_1'); } catch(e) {}
    try { await CompanyMetric.collection.dropIndex('reviewYear_1'); } catch(e) {}
    try { await CompanyMetric.syncIndexes(); } catch(e) {}

    const reviewYear = parseInt(req.params.year) || new Date().getFullYear();
    const reviewMonth = req.params.month ? parseInt(req.params.month) : (new Date().getMonth() + 1);
    
    let metrics = await CompanyMetric.findOne({ reviewYear, reviewMonth })
      .populate('lockedBy', 'personalDetails.firstName personalDetails.lastName');

    if (!metrics) {
      metrics = new CompanyMetric({ reviewYear, reviewMonth });
      try {
        await metrics.save();
      } catch (saveError) {
        // Handle rapid multi-fire race conditions gracefully
        metrics = await CompanyMetric.findOne({ reviewYear, reviewMonth })
          .populate('lockedBy', 'personalDetails.firstName personalDetails.lastName');
      }
    }

    res.status(200).json({ success: true, data: metrics });
  } catch (error) {
    console.error("Metrics DB Error:", error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

exports.updateMetrics = async (req, res) => {
  try {
    // 🚨 FIX: Moved index healing INSIDE the function to guarantee DB connection is active
    try { await CompanyMetric.collection.dropIndex('year_1'); } catch(e) {}
    try { await CompanyMetric.collection.dropIndex('reviewYear_1'); } catch(e) {}
    try { await CompanyMetric.syncIndexes(); } catch(e) {}

    const reviewYear = req.body.reviewYear || req.body.year || parseInt(req.params.year) || new Date().getFullYear();
    const reviewMonth = req.body.reviewMonth || req.body.month || parseInt(req.params.month) || (new Date().getMonth() + 1);
    const { locked } = req.body;
    
    let metrics = await CompanyMetric.findOne({ reviewYear, reviewMonth });
    if (!metrics) {
      metrics = new CompanyMetric({ reviewYear, reviewMonth });
    }

    const userRole = req.user?.role || req.user?.security?.role || '';
    const isIctAdmin = String(userRole).toUpperCase().includes('ICT') || String(userRole).toUpperCase() === 'ADMIN';

    if (metrics.locked && req.body.locked === false && !isIctAdmin) {
      return res.status(403).json({ message: 'Scorecard is permanently locked by the Board.' });
    }

    const { financialResilience, operationalEffectiveness, humanCapital, safetyEnvironment, reputationalCapital } = req.body;
    
    if (
      financialResilience !== undefined && financialResilience !== null && 
      operationalEffectiveness !== undefined && operationalEffectiveness !== null &&
      humanCapital !== undefined && humanCapital !== null && 
      safetyEnvironment !== undefined && safetyEnvironment !== null &&
      reputationalCapital !== undefined && reputationalCapital !== null
    ) {
      const bsc = (financialResilience * 0.14) +
                  (operationalEffectiveness * 0.45) +
                  (humanCapital * 0.26) +
                  (safetyEnvironment * 0.12) +
                  (reputationalCapital * 0.03);
      
      req.body.bscRawScore = bsc;
      req.body.cpPct = bsc * 0.15;
    }

    const wasLocked = metrics.locked;

    Object.assign(metrics, req.body);
    metrics.reviewYear = reviewYear;
    metrics.reviewMonth = reviewMonth;

    if (locked === true && !wasLocked) {
      metrics.lockedBy = req.user?.id || req.user?._id;
      metrics.lockedAt = new Date();
    } else if (locked === false && wasLocked) {
      metrics.lockedBy = null;
      metrics.lockedAt = null;
    }

    await metrics.save(); 

    res.status(200).json({ success: true, data: metrics });
  } catch (error) {
    console.error("Metrics Update Error:", error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};