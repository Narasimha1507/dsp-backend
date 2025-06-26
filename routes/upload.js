const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();
const File = require('../models/File');

// Setup upload directory
const uploadPath = path.join(__dirname, '..', process.env.UPLOAD_DIR || 'uploads');
if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath, { recursive: true });
}

// Multer setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + '-' + file.originalname;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

// Upload file endpoint
router.post('/', upload.single('file'), async (req, res) => {
  const username = req.body.username;
  const file = req.file;

  if (!username || !file) {
    return res.status(400).json({ message: 'Username and file required' });
  }

  try {
    const newFile = new File({
      username,
      originalname: file.originalname,
      filename: file.filename,
      mimetype: file.mimetype,
      size: file.size,
    });

    await newFile.save();
    res.status(200).json({
      message: 'File uploaded successfully',
      filename: file.filename,
      viewURL: `/api/files/view/${file.filename}`  // return view link
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'DB error' });
  }
});

// Serve uploaded file by filename
router.get('/view/:filename', (req, res) => {
  const { filename } = req.params;
  const filePath = path.join(uploadPath, filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ message: 'File not found' });
  }

  res.sendFile(filePath);
});

module.exports = router;
