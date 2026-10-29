const express = require('express');
const router = express.Router();
const AdmZip = require('adm-zip');
const mongoose = require('mongoose');
const multer = require('multer');

// Configure Multer for processing uploaded backup ZIP files in memory
const upload = multer({ storage: multer.memoryStorage() });

const AppConfig = require('../models/AppConfig');
const { authGuard, roleGuard } = require('../middleware/auth');
const { logAudit } = require('../utils/logger');

// Lightweight helper function to map nested object properties into a flat CSV row string
const jsonToCsv = (items, headers) => {
  const csv = [
    headers.join(','),
    ...items.map(row => headers.map(fieldName => {
      let val = row[fieldName];
      if (typeof val === 'object' && val !== null) val = JSON.stringify(val);
      return `"${String(val !== undefined && val !== null ? val : '').replace(/"/g, '""')}"`;
    }).join(','))
  ].join('\r\n');
  return csv;
};

// Converts raw JSON strings back into authentic MongoDB BSON Objects
const reviveBSON = (key, value) => {
  if (typeof value === 'string' && /^[0-9a-fA-F]{24}$/.test(value)) {
    return new mongoose.Types.ObjectId(value);
  }
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)) {
    return new Date(value);
  }
  return value;
};

// GET /api/v1/backup/config — Retrieve Saved Connections
router.get('/config', authGuard, roleGuard('ICT_ADMIN', 'ICT Admin', 'admin', 'ADMIN'), async (req, res) => {
  try {
    const configDoc = await AppConfig.findOne({ configType: 'BACKUP_SETTINGS' }).lean();
    const currentDbName = mongoose.connection.name || 'test'; // Extract active original DB name
    
    res.json({
      success: true,
      currentDbName: currentDbName,
      data: configDoc?.configData || { savedConnections: [] }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch backup settings.' });
  }
});

// POST /api/v1/backup/config — Save Multiple Connection URIs (Fixed Persistence & Deprecation)
router.post('/config', authGuard, roleGuard('ICT_ADMIN', 'ICT Admin', 'admin', 'ADMIN'), async (req, res) => {
  try {
    const { savedConnections } = req.body;
    
    // strict: false forces Mongoose to save the new fields even if not in the base AppConfig schema
    await AppConfig.findOneAndUpdate(
      { configType: 'BACKUP_SETTINGS' },
      { 
        $set: {
          configType: 'BACKUP_SETTINGS',
          'configData.savedConnections': savedConnections || [],
          'configData.updatedAt': new Date()
        }
      },
      // FIXED: Replaced `new: true` with `returnDocument: 'after'` to resolve Mongoose warning
      { upsert: true, returnDocument: 'after', strict: false } 
    );

    res.json({ success: true, message: 'Backup connections saved successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to save backup configuration.' });
  }
});

// GET /api/v1/backup/export — Dynamic System Extraction
router.get('/export', authGuard, roleGuard('ICT_ADMIN', 'ICT Admin', 'admin', 'ADMIN'), async (req, res) => {
  try {
    const zip = new AdmZip();
    const timestamp = new Date().toISOString().split('T')[0];
    
    const format = req.query.format || 'ALL'; 
    const collectionsRequested = req.query.collections ? req.query.collections.split(',') : ['ALL'];
    const environment = req.query.environment || 'PRODUCTION';
    const retentionNote = req.query.reason || 'Routine Data Extraction';

    const data = {};
    const dbCollections = await mongoose.connection.db.listCollections().toArray();
    
    for (const col of dbCollections) {
      const colName = col.name;
      if (
        collectionsRequested.includes('ALL') || 
        (collectionsRequested.includes('USERS') && colName === 'users') ||
        (collectionsRequested.includes('APPRAISALS') && colName === 'appraisals') ||
        (collectionsRequested.includes('AUDIT_LOGS') && colName === 'auditlogs') ||
        (collectionsRequested.includes('SYSTEM_CONFIG') && colName === 'appconfigs') ||
        (collectionsRequested.includes('NOTIFICATIONS') && colName === 'notifications')
      ) {
        data[colName] = await mongoose.connection.db.collection(colName).find({}).toArray();
      }
    }

    const folderPrefix = `stip-${environment.toLowerCase()}-backup-${timestamp}`;

    if (format === 'ALL' || format === 'JSON') {
        for (const [colName, docs] of Object.entries(data)) {
            zip.addFile(`${folderPrefix}/json/${colName}.json`, Buffer.from(JSON.stringify(docs, null, 2), "utf-8"));
        }
    }

    if (format === 'ALL' || format === 'CSV') {
        for (const [colName, docs] of Object.entries(data)) {
            if (docs.length > 0) {
                const headers = Array.from(new Set(docs.flatMap(doc => Object.keys(doc))));
                zip.addFile(`${folderPrefix}/csv/${colName}.csv`, Buffer.from(jsonToCsv(docs, headers), "utf-8"));
            }
        }
    }

    const manifestCounts = {};
    for (const [colName, docs] of Object.entries(data)) manifestCounts[colName] = docs.length;

    const manifest = {
        extractedAt: new Date().toISOString(),
        extractedBy: req.user.id,
        environment: environment,
        collectionsRequested: collectionsRequested,
        formatRequested: format,
        reason: retentionNote,
        recordCounts: manifestCounts
    };
    zip.addFile(`${folderPrefix}/EXTRACTION_MANIFEST.json`, Buffer.from(JSON.stringify(manifest, null, 2), "utf-8"));

    await logAudit({
      user: req.user, role: req.user.role, action: 'SYSTEM_BACKUP_DOWNLOADED', category: 'SECURITY', severity: 'CRITICAL',
      details: `Generated ${format} backup in ${environment}. Reason: ${retentionNote}`, req
    });

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

// POST /api/v1/backup/push — Dynamic Direct Database Push
router.post('/push', authGuard, roleGuard('ICT_ADMIN', 'ICT Admin', 'admin', 'ADMIN'), async (req, res) => {
  let targetDb;
  try {
    const { mongoUri, targetDbName, collections, environment, reason } = req.body;
    
    if (!mongoUri) return res.status(400).json({ success: false, message: 'Destination Mongo URI is strictly required.' });

    const collectionsRequested = collections ? collections : ['ALL'];
    const data = {};
    
    const allDbCollections = await mongoose.connection.db.listCollections().toArray();
    for (const col of allDbCollections) {
        const colName = col.name;
        if (
            collectionsRequested.includes('ALL') || 
            (collectionsRequested.includes('USERS') && colName === 'users') ||
            (collectionsRequested.includes('APPRAISALS') && colName === 'appraisals') ||
            (collectionsRequested.includes('AUDIT_LOGS') && colName === 'auditlogs') ||
            (collectionsRequested.includes('SYSTEM_CONFIG') && colName === 'appconfigs') ||
            (collectionsRequested.includes('NOTIFICATIONS') && colName === 'notifications')
        ) {
            data[colName] = await mongoose.connection.db.collection(colName).find({}).toArray();
        }
    }

    const connOptions = { serverSelectionTimeoutMS: 7000 };
    if (targetDbName && targetDbName.trim()) {
      connOptions.dbName = targetDbName.trim();
    }

    targetDb = await mongoose.createConnection(mongoUri, connOptions).asPromise();
    
    for (const [colName, docs] of Object.entries(data)) {
        if (docs.length > 0) {
            const targetCollection = targetDb.collection(colName);
            try {
                await targetCollection.insertMany(docs, { ordered: false });
            } catch (err) {
                if (err.code !== 11000) console.error(`Error pushing to ${colName}:`, err);
            }
        }
    }
    await targetDb.close();

    await logAudit({
      user: req.user, role: req.user.role, action: 'SYSTEM_BACKUP_PUSHED', category: 'SECURITY', severity: 'CRITICAL',
      details: `Pushed raw DB backup directly to external MongoDB URI (${environment}). Target DB: ${targetDbName || 'default'}. Reason: ${reason}`, req
    });

    res.json({ success: true, message: 'Data perfectly replicated to the destination database.' });

  } catch (error) {
    console.error("Critical Backup Push Failure:", error);
    if (targetDb) await targetDb.close();
    res.status(500).json({ success: false, message: 'Connection to destination URI failed or timed out.' });
  }
});

// POST /api/v1/backup/restore — Dynamic Restoration from Uploaded Backup File
router.post('/restore', authGuard, roleGuard('ICT_ADMIN', 'ICT Admin', 'admin', 'ADMIN'), upload.single('backupFile'), async (req, res) => {
  let targetDb;
  try {
    const { mongoUri, targetDbName, environment, reason } = req.body;
    
    if (!mongoUri || !req.file) {
      return res.status(400).json({ success: false, message: 'Mongo URI and Backup ZIP file are strictly required.' });
    }

    const connOptions = { serverSelectionTimeoutMS: 7000 };
    if (targetDbName && targetDbName.trim()) {
      connOptions.dbName = targetDbName.trim();
    }

    targetDb = await mongoose.createConnection(mongoUri, connOptions).asPromise();
    
    const zip = new AdmZip(req.file.buffer);
    const zipEntries = zip.getEntries();
    let restoredCollections = 0;

    for (const entry of zipEntries) {
      if (entry.entryName.includes('/json/') && entry.name.endsWith('.json')) {
        const colName = entry.name.replace('.json', '');
        const fileContent = entry.getData().toString('utf8');
        
        const docs = JSON.parse(fileContent, reviveBSON);
        
        if (Array.isArray(docs) && docs.length > 0) {
          const targetCollection = targetDb.collection(colName);
          try {
             await targetCollection.insertMany(docs, { ordered: false });
             restoredCollections++;
          } catch (err) {
             if (err.code !== 11000) console.error(`Restore error on ${colName}:`, err);
          }
        }
      }
    }

    await targetDb.close();

    await logAudit({
      user: req.user, role: req.user.role, action: 'SYSTEM_BACKUP_RESTORED', category: 'SECURITY', severity: 'CRITICAL',
      details: `Restored ${restoredCollections} collections into ${environment} environment (DB: ${targetDbName || 'default'}). Reason: ${reason}`, req
    });

    res.json({ success: true, message: `Successfully restored ${restoredCollections} collections into destination database.` });

  } catch (error) {
    console.error("Critical Backup Restore Failure:", error);
    if (targetDb) await targetDb.close();
    res.status(500).json({ success: false, message: 'Database restoration failed. Check network URI or file format.' });
  }
});

module.exports = router;