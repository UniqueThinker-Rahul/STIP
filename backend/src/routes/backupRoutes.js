const express = require('express');
const router = express.Router();
const AdmZip = require('adm-zip');

// Import all platform models
const User = require('../models/User');
const Appraisal = require('../models/Appraisal');
const AuditLog = require('../models/AuditLog');
const AppConfig = require('../models/AppConfig');
const Notification = require('../models/Notification');

const { authGuard, roleGuard } = require('../middleware/auth');
const { logAudit } = require('../utils/logger');

// Lightweight helper function to safely map nested object properties into a flat CSV row string
const jsonToCsv = (items, headers) => {
  const replacer = (key, value) => value === null ? '' : value; 
  
  const csv = [
    headers.join(','), // Primary header row
    ...items.map(row => headers.map(fieldName => {
      // Handle shallow nesting up to 2 levels safely
      if (fieldName.includes('.')) {
        const parts = fieldName.split('.');
        const val = row[parts[0]]?.[parts[1]];
        return JSON.stringify(val, replacer);
      }
      return JSON.stringify(row[fieldName], replacer);
    }).join(','))
  ].join('\r\n');
  
  return csv;
};

// GET /api/v1/backup/export — Dynamic System Extraction
router.get('/export', authGuard, roleGuard('ICT_ADMIN', 'ICT Admin', 'admin', 'ADMIN'), async (req, res) => {
  try {
    const zip = new AdmZip();
    const timestamp = new Date().toISOString().split('T')[0];
    
    // Parse user requests from the query string
    const format = req.query.format || 'ALL'; // 'JSON', 'CSV', or 'ALL'
    const collections = req.query.collections ? req.query.collections.split(',') : ['ALL'];
    const environment = req.query.environment || 'PRODUCTION';
    const retentionNote = req.query.reason || 'Routine Data Extraction';

    // 1. Fetch only requested datasets (optimization)
    const requests = {};
    if (collections.includes('ALL') || collections.includes('USERS')) requests.users = User.find().lean();
    if (collections.includes('ALL') || collections.includes('APPRAISALS')) requests.appraisals = Appraisal.find().lean();
    if (collections.includes('ALL') || collections.includes('AUDIT_LOGS')) requests.logs = AuditLog.find().lean();
    if (collections.includes('ALL') || collections.includes('SYSTEM_CONFIG')) requests.configs = AppConfig.find().lean();
    if (collections.includes('ALL') || collections.includes('NOTIFICATIONS')) requests.notifications = Notification.find().lean();

    const data = {};
    for (const [key, promise] of Object.entries(requests)) {
        data[key] = await promise;
    }

    const folderPrefix = `stip-${environment.toLowerCase()}-backup-${timestamp}`;

    // 2. Compile requested formats
    if (format === 'ALL' || format === 'JSON') {
        if (data.users) zip.addFile(`${folderPrefix}/json/users.json`, Buffer.from(JSON.stringify(data.users, null, 2), "utf-8"));
        if (data.appraisals) zip.addFile(`${folderPrefix}/json/appraisals.json`, Buffer.from(JSON.stringify(data.appraisals, null, 2), "utf-8"));
        if (data.logs) zip.addFile(`${folderPrefix}/json/auditlogs.json`, Buffer.from(JSON.stringify(data.logs, null, 2), "utf-8"));
        if (data.configs) zip.addFile(`${folderPrefix}/json/appconfigs.json`, Buffer.from(JSON.stringify(data.configs, null, 2), "utf-8"));
        if (data.notifications) zip.addFile(`${folderPrefix}/json/notifications.json`, Buffer.from(JSON.stringify(data.notifications, null, 2), "utf-8"));
    }

    if (format === 'ALL' || format === 'CSV') {
        if (data.users) {
            const userHeaders = ['_id', 'employeeId', 'username', 'companyCode', 'security.role', 'employmentDetails.isActive'];
            zip.addFile(`${folderPrefix}/csv/users.csv`, Buffer.from(jsonToCsv(data.users, userHeaders), "utf-8"));
        }
        if (data.appraisals) {
            const appraisalHeaders = ['_id', 'appraisalRef', 'employeeId', 'managerId', 'reviewYear', 'calculatedResults.finalIprfScore', 'stipAward', 'workflow.status'];
            zip.addFile(`${folderPrefix}/csv/appraisals.csv`, Buffer.from(jsonToCsv(data.appraisals, appraisalHeaders), "utf-8"));
        }
        if (data.logs) {
            const logHeaders = ['_id', 'role', 'action', 'category', 'severity', 'ipAddress', 'createdAt'];
            zip.addFile(`${folderPrefix}/csv/system_audit_logs.csv`, Buffer.from(jsonToCsv(data.logs, logHeaders), "utf-8"));
        }
        if (data.configs) {
            // Flatten basic configs
            const configHeaders = ['_id', 'configType', 'updatedAt'];
            zip.addFile(`${folderPrefix}/csv/system_configs.csv`, Buffer.from(jsonToCsv(data.configs, configHeaders), "utf-8"));
        }
    }

    // 3. Include an extraction manifest file
    const manifest = {
        extractedAt: new Date().toISOString(),
        extractedBy: req.user.id,
        environment: environment,
        collectionsRequested: collections,
        formatRequested: format,
        reason: retentionNote,
        recordCounts: {
            users: data.users?.length || 0,
            appraisals: data.appraisals?.length || 0,
            auditLogs: data.logs?.length || 0,
            configs: data.configs?.length || 0,
            notifications: data.notifications?.length || 0
        }
    };
    zip.addFile(`${folderPrefix}/EXTRACTION_MANIFEST.json`, Buffer.from(JSON.stringify(manifest, null, 2), "utf-8"));

    // 4. Log the transaction securely
    await logAudit({
      user: req.user,
      role: req.user.role,
      action: 'SYSTEM_BACKUP_DOWNLOADED',
      category: 'SECURITY',
      severity: 'CRITICAL',
      details: `Generated ${format} backup of [${collections.join(', ')}] in ${environment}. Reason: ${retentionNote}`,
      req
    });

    // 5. Build and transmit the stream
    const zipBuffer = zip.toBuffer();
    
    res.writeHead(200, {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename=STIP_${environment.toUpperCase()}_BACKUP_${timestamp}.zip`,
      'Content-Length': zipBuffer.length
    });
    
    res.end(zipBuffer);

  } catch (error) {
    console.error("Critical Backup Failure:", error);
    res.status(500).json({ success: false, message: 'Server configuration error running file generation engine.' });
  }
});

module.exports = router;