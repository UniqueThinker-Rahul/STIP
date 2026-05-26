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

    // Security: Prevent edits if already locked by the board
    if (metrics.locked && req.body.locked === false) {
      return res.status(403).json({ message: 'Scorecard is permanently locked by the Board.' });
    }

    // 🚨 FIX: Explicit Math Calculation (Replaces the broken Mongoose Hook)
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

    // Apply updates from the request body to the database object
    Object.assign(metrics, req.body);

    // Stamp the lock event
    if (locked && !metrics.locked) {
      metrics.lockedBy = req.user.id || req.user._id;
      metrics.lockedAt = new Date();
    }

    // Save the record
    await metrics.save(); 

    res.status(200).json({ success: true, data: metrics });
  } catch (error) {
    console.error("Metrics Update Error:", error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};