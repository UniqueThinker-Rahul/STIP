require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

// 1. Import your route files
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes'); 
const appraisalRoutes = require('./routes/appraisalRoutes');
const reportRoutes = require('./routes/reportRoutes'); 
const settingsRoutes = require('./routes/settingsRoutes');
const companyMetricsRoutes = require('./routes/companyMetricsRoutes'); // <-- NEW: Company Metrics

const app = express();
app.use(cors({
  origin: 'http://localhost:3000', 
  credentials: true
}));

app.use(express.json());

// 2. Map the routes to the URL paths
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);          
app.use('/api/v1/appraisals', appraisalRoutes);
app.use('/api/v1/reports', reportRoutes);
app.use('/api/v1/settings', settingsRoutes);
app.use('/api/v1/company-metrics', companyMetricsRoutes); // <-- NEW: Mapped to /company-metrics

const PORT = process.env.PORT || 5000;
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅ Connected to MongoDB Atlas Cloud Production Ready.');
    app.listen(PORT, () => console.log(`🚀 API Engine online on port ${PORT}`));
  })
  .catch(err => console.error('❌ Database boot up failure:', err));