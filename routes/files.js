const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();
const File = require('../models/File');

// Upload directory
const uploadPath = path.join(__dirname, '..', process.env.UPLOAD_DIR || 'uploads');
if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath, { recursive: true });

// Multer configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadPath),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } }); // 10 MB

// ----- Upload File -----
router.post('/upload', upload.single('file'), async (req, res) => {
  const { username, password } = req.body;
  const file = req.file;
  if (!username || !file) return res.status(400).json({ message: 'Username & file required' });

  try {
    const newFile = new File({
      username,
      originalname: file.originalname,
      filename: file.filename,
      mimetype: file.mimetype,
      size: file.size,
      sharePassword: password || '',
      shareId: file.filename
    });

    await newFile.save();

    res.json({
      message: 'File uploaded successfully',
      filename: file.filename,
      url: `/api/files/protected-access/${file.filename}`
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Database error during file upload' });
  }
});

// ----- List Files for a User -----
router.get('/:username', async (req, res) => {
  try {
    const files = await File.find({ username: req.params.username });
    res.json({ files });
  } catch {
    res.status(500).json({ message: 'Error retrieving files' });
  }
});

// ----- Delete File -----
router.delete('/:filename', async (req, res) => {
  try {
    const deleted = await File.findOneAndDelete({ filename: req.params.filename });
    if (!deleted) return res.status(404).json({ message: 'File not found' });

    const filePath = path.join(uploadPath, req.params.filename);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    res.json({ message: 'File deleted successfully' });
  } catch {
    res.status(500).json({ message: 'Delete failed' });
  }
});

// ----- Get File Info -----
router.get('/info/:filename', async (req, res) => {
  try {
    const file = await File.findOne({ filename: req.params.filename });
    if (!file) return res.status(404).json({ message: 'File not found' });

    res.json({ requiresPassword: !!file.sharePassword });
  } catch {
    res.status(500).json({ message: 'Error fetching file info' });
  }
});

// ----- Set or Update Share Password -----
router.post('/share/:filename', async (req, res) => {
  const { password } = req.body;

  try {
    const file = await File.findOne({ filename: req.params.filename });
    if (!file) return res.status(404).json({ message: 'File not found' });

    file.sharePassword = password || '';
    await file.save();

    res.json({
      message: password ? 'Password protection enabled' : 'Password removed',
      shareLink: `/shared/${file.filename}`
    });
  } catch {
    res.status(500).json({ message: 'Error setting share password' });
  }
});

// ----- POST: Protected Access with Password Verification -----
router.post('/protected-access/:filename', async (req, res) => {
  const { password } = req.body;

  try {
    const file = await File.findOne({ filename: req.params.filename });
    if (!file) return res.status(404).json({ message: 'File not found' });

    const filePath = path.join(uploadPath, file.filename);
    if (!fs.existsSync(filePath)) return res.status(404).json({ message: 'File missing' });

    if (!file.sharePassword || file.sharePassword.trim() === '' || password === file.sharePassword) {
      return res.sendFile(filePath);
    } else {
      return res.status(401).json({ message: 'Incorrect password' });
    }
  } catch {
    res.status(500).json({ message: 'Error accessing protected file' });
  }
});

// ----- GET: Direct File Access (with optional password in query) -----
router.get('/protected-access/:filename', async (req, res) => {
  const filename = decodeURIComponent(req.params.filename);
  const password = req.query.password || '';

  try {
    const file = await File.findOne({ filename });
    if (!file) return res.status(404).json({ message: 'File not found' });

    const filePath = path.join(uploadPath, filename);
    if (!fs.existsSync(filePath)) return res.status(404).json({ message: 'File missing' });

    if (!file.sharePassword || file.sharePassword.trim() === '' || password === file.sharePassword) {
      return res.sendFile(filePath);
    } else {
      return res.status(401).json({ message: 'Incorrect or missing password' });
    }
  } catch {
    res.status(500).json({ message: 'Error accessing protected file' });
  }
});

module.exports = router;
