// Hardcoded Backend Weights (CY2026 Standard) to prevent frontend tampering
const CRITERIA_WEIGHTS = {
  deliveredResults: 0.30,
  behaviors: 0.20,
  safeWorking: 0.20,
  jobCompetence: 0.10,
  dependability: 0.10,
  adaptability: 0.10
};

// Validate that only the official Assessment Guide scores are used
const VALID_RATINGS = [0.0, 0.7, 1.0, 1.3];

const calculateIPRF = (rawScores) => {
  let totalScore = 0;

  for (const [key, weight] of Object.entries(CRITERIA_WEIGHTS)) {
    const rating = rawScores[key];
    
    if (!VALID_RATINGS.includes(rating)) {
      throw new Error(`Invalid rating of ${rating} submitted for ${key}. Allowed values: 0, 0.7, 1.0, 1.3`);
    }
    
    totalScore += (rating * weight);
  }

  // Handle Javascript floating-point math issues (e.g., 1.000000000000002)
  const finalIprfScore = Math.round(totalScore * 100) / 100;
  
  return {
    finalIprfScore,
    isExceedingPerformance: finalIprfScore === 1.3
  };
};

module.exports = { CRITERIA_WEIGHTS, calculateIPRF };