const { logAudit } = require('../utils/logger');

const apiLogger = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const isError = res.statusCode >= 400;
    
    // Ignore routine GET requests to save database space, unless it's an error
    if (req.method !== 'GET' || isError) {
      
      // 🚨 UPGRADE: Prevent infinite loops and DUPLICATE logs
      // We bypass /audit to prevent infinite loops.
      if (req.originalUrl.includes('/api/v1/audit')) return;
      // We bypass /auth because authRoutes.js already handles authentication logging manually and perfectly!
      if (req.originalUrl.includes('/api/v1/auth')) return;

      let category = 'API';
      let action = `API_${req.method}`;
      let severity = 'LOW';
      let details = `${req.method} request to ${req.originalUrl} completed in ${duration}ms`;

      // 🧠 INTELLIGENT ROUTING & CATEGORIZATION
      if (isError) {
          category = 'SYSTEM';
          severity = res.statusCode >= 500 ? 'CRITICAL' : 'MEDIUM';
          details = `API Error (${res.statusCode}) triggered on ${req.method} ${req.originalUrl}`;
      } else {
          // 1. Appraisals -> WORKFLOW
          if (req.originalUrl.includes('/appraisals')) {
              category = 'WORKFLOW';
              action = req.method === 'POST' ? 'APPRAISAL_CREATED' : (req.method === 'DELETE' ? 'APPRAISAL_DELETED' : 'APPRAISAL_UPDATED');
              details = `Appraisal workflow action performed via ${req.method} request.`;
          } 
          // 2. User Management -> ADMIN_ACTION
          else if (req.originalUrl.includes('/users') && !req.originalUrl.includes('/my-team')) {
              category = 'ADMIN_ACTION';
              action = req.method === 'POST' ? 'USER_CREATED' : (req.method === 'DELETE' ? 'USER_DELETED' : 'USER_UPDATED');
              severity = req.method === 'DELETE' ? 'HIGH' : 'MEDIUM';
              details = `Staff directory modified via ${req.method} request.`;
          } 
          // 3. Scorecard & Configs -> SYSTEM
          else if (req.originalUrl.includes('/config') || req.originalUrl.includes('/company-metrics')) {
              category = 'SYSTEM';
              action = 'SYSTEM_CONFIG_ALTERED';
              severity = 'HIGH';
              details = `System configuration, dropdowns, or KPI Scorecard altered.`;
          }
      }

      // Dispatch the log
      logAudit({
        user: req.user || null, // req.user exists if authGuard passed
        role: req.user?.role || 'SYSTEM',
        action: action,
        category: category,
        severity: severity,
        details: details,
        req: req
      });
    }
  });

  next();
};

module.exports = apiLogger;