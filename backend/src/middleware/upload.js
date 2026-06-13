const multer = require('multer');
const path = require('path');

// ──────────────────────────────────────────────────────────────────────────
// Memory storage — for files forwarded directly to the Python AI service
// (bank statements, CSVs). We never write these to disk.
// ──────────────────────────────────────────────────────────────────────────
const memoryStorage = multer.memoryStorage();

const memoryUpload = multer({ storage: memoryStorage });

// ──────────────────────────────────────────────────────────────────────────
// Disk storage — for emergency documents that are stored locally
// and served via /uploads/emergency/
// ──────────────────────────────────────────────────────────────────────────
const emergencyDiskStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/emergency');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

const emergencyUpload = multer({
  storage: emergencyDiskStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
});

module.exports = { memoryUpload, emergencyUpload };
