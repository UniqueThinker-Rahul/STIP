const User = require('../models/User');
const Appraisal = require('../models/Appraisal');

// 🚨 UPGRADE: Mapped the criteria keys EXACTLY to your appraisal.js schema
const CRIT = [
  { key: "jobCompetence",    label: "Job Competence",             weight: 10, color: "#7C3AED" },
  { key: "behaviors",        label: "Behaviours",                 weight: 20, color: "#1E40AF" },
  { key: "dependability",    label: "Dependability",              weight: 10, color: "#0369A1" },
  { key: "adaptability",     label: "Adaptability",               weight: 10, color: "#D97706" },
  { key: "safeWorking",      label: "Safe Working",               weight: 20, color: "#059669" },
  { key: "deliveredResults", label: "Delivered Expected Results", weight: 30, color: "#0D2B55" },
];

const RB = [
  { k: "LS", v: 0,   bg: "#FEE2E2", fg: "#B42318", hex: "#EF4444", label: "Less than Satisfactory" },
  { k: "NI", v: 0.7, bg: "#FEF3C7", fg: "#92400E", hex: "#F59E0B", label: "Needs Improvement" },
  { k: "E",  v: 1.0, bg: "#D1FAE5", fg: "#065F46", hex: "#10B981", label: "Fully Effective" },
  { k: "EP", v: 1.3, bg: "#DBEAFE", fg: "#1E40AF", hex: "#3B82F6", label: "Exceeds Performance" },
];

exports.getBoardReportData = async (req, res) => {
  try {
    const { year = new Date().getFullYear().toString(), quarter = 'Q2', office = 'All' } = req.query;
    const targetYear = parseInt(year);

    // 1. Fetch Actual Active Users from Database based on Office Filter
    const userQuery = { 'employmentDetails.isDeleted': { $ne: true } };
    if (office !== 'All') {
      userQuery.companyCode = office;
    }
    
    const validUsers = await User.find(userQuery).select('_id companyCode').lean();
    const validUserIds = validUsers.map(u => u._id.toString());
    const N = validUsers.length;

    // 2. Fetch Actual Appraisals for these users in this timeframe
    // 🚨 UPGRADE: Matched query to your schema's nested period object and employeeId
    const appraisals = await Appraisal.find({
      'period.year': targetYear,
      'period.quarter': quarter,
      employeeId: { $in: validUserIds },
      'workflow.status': { $in: ['APPROVED', 'WITH_CEO'] } // Ensures only verified scores count
    }).lean();

    // 3. Aggregate Actual Data
    const critRows = CRIT.map((cat) => {
      const counts = { LS: 0, NI: 0, E: 0, EP: 0 };
      let sum = 0;

      appraisals.forEach((app) => {
        // 🚨 UPGRADE: Accesses the specific .rating property in your nested scores object
        const scoreObj = app.scores?.[cat.key];
        const score = scoreObj?.rating;
        
        if (score !== undefined && score !== null) {
          const v = parseFloat(score);
          counts[v >= 1.3 ? "EP" : v >= 1.0 ? "E" : v >= 0.7 ? "NI" : "LS"]++; 
          sum += v;
        }
      });

      const rated = counts.LS + counts.NI + counts.E + counts.EP;
      const avg = rated ? sum / rated : 0;
      return { cat, counts, rated, avg, contrib: (avg * cat.weight) / 100 };
    });

    const totals = { LS: 0, NI: 0, E: 0, EP: 0 };
    critRows.forEach((r) => RB.forEach((b) => (totals[b.k] += r.counts[b.k])));
    const totalRatings = RB.reduce((t, b) => t + totals[b.k], 0);

    const data = {
      N,
      critRows,
      totals,
      totalRatings,
      scope: office === "All" ? "Whole organisation" : `${office} office`,
      period: `${quarter} ${year}`
    };

    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("Board Report Generate Error:", error);
    res.status(500).json({ success: false, message: "Error generating board report from real database." });
  }
};