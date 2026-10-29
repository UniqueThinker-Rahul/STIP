const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { getCaseById, updateCase } = require('../controllers/disciplinaryController');
const { createCounselling, getMyCounsellings } = require('../controllers/disciplinaryController');

const { 
  createCase, 
  getEmployeeCases, 
  getMyCases, 
  getPropertiesToRetrieve, 
  submitToHR, 
  deleteDraft, 
  toggleSeriousFlag 
} = require('../controllers/disciplinaryController');
const { authGuard } = require('../middleware/auth'); 

// Ensure uploads directory exists for file uploads
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure Multer Storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const sanitizedName = file.originalname.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9.\-]/g, '');
    cb(null, uniqueSuffix + '-' + sanitizedName);
  }
});
const upload = multer({ storage: storage });

// ================= EXISTING ROUTES ================= //
router.post('/', authGuard, upload.array('files', 10), createCase);
router.get('/employee/:employeeId', authGuard, getEmployeeCases);

// ================= NEW ROUTES TO FIX 404 ERRORS ================= //

// 1. Fetch cases raised by the logged-in Line Manager
router.get('/my-cases', authGuard, getMyCases);

// 2. Fetch properties pending retrieval (for Dismissed employees)
router.get('/properties', authGuard, getPropertiesToRetrieve);

// 3. Action: Submit a draft to HR
router.patch('/:id/submit', authGuard, submitToHR);

// 4. Action: Toggle the "Serious" flag on a submitted case
router.patch('/:id/toggle-serious', authGuard, toggleSeriousFlag);

// 5. Action: Delete a draft case
router.delete('/:id', authGuard, deleteDraft);

router.get('/:id', authGuard, getCaseById);
router.put('/:id', authGuard, upload.array('files', 10), updateCase);
// Counselling Endpoints
router.post('/counselling', authGuard, createCounselling);
router.get('/counselling', authGuard, getMyCounsellings);
module.exports = router;