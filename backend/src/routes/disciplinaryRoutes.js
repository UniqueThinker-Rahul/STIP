const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Consolidated all controller imports into one clean object
const { 
  createCase, 
  getEmployeeCases, 
  getMyCases, 
  getPropertiesToRetrieve, 
  submitToHR, 
  deleteDraft, 
  toggleSeriousFlag,
  getCaseById, 
  updateCase,
  createCounselling, 
  getMyCounsellings
} = require('../controllers/disciplinaryController');

const { authGuard } = require('../middleware/auth'); 
const { getAllCounsellings } = require('../controllers/disciplinaryController');
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


// ================= COUNSELLING ROUTES ================= //
// MOVED TO TOP: Prevent collision with the /:id dynamic routes below
router.post('/counselling', authGuard, createCounselling);
router.get('/counselling', authGuard, getMyCounsellings);
// Add this HR endpoint
router.get('/hr/counselling', authGuard, getAllCounsellings);

// ================= STATIC ROUTES ================= //
router.get('/my-cases', authGuard, getMyCases);
router.get('/properties', authGuard, getPropertiesToRetrieve);
router.post('/', authGuard, upload.array('files', 10), createCase);

// ================= PARAMETERIZED ROUTES ================= //
router.get('/employee/:employeeId', authGuard, getEmployeeCases);
router.patch('/:id/submit', authGuard, submitToHR);
router.patch('/:id/toggle-serious', authGuard, toggleSeriousFlag);
router.delete('/:id', authGuard, deleteDraft);
router.get('/:id', authGuard, getCaseById);
router.put('/:id', authGuard, upload.array('files', 10), updateCase);


module.exports = router;