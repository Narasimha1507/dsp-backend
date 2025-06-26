const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();
const File = require('../models/File');

// Define upload path
const uploadPath = path.join(__dirname, '..', process.env.UPLOAD_DIR || 'uploads');

// Ensure folder exists
if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath, { recursive: true });

// Multer setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadPath),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

// ----- UPLOAD FILE -----
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
      sharePassword: password || '', // Save password if provided
      shareId: file.filename,        // Set shareId to filename
    });

    await newFile.save();

    res.json({
      message: 'File uploaded successfully',
      filename: file.filename,
      url: `/api/files/protected-access/${file.filename}`,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'DB error' });
  }
});

// ----- LIST FILES FOR USER -----
router.get('/:username', async (req, res) => {
  try {
    const files = await File.find({ username: req.params.username });
    res.json({ files });
  } catch {
    res.status(500).json({ message: 'Error retrieving files' });
  }
});

// ----- DELETE FILE -----
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

// ----- GET FILE INFO (to check if password is needed) -----
router.get('/info/:filename', async (req, res) => {
  try {
    const file = await File.findOne({ filename: req.params.filename });
    if (!file) return res.status(404).json({ message: 'File not found' });

    res.json({
      requiresPassword: !!file.sharePassword
    });
  } catch {
    res.status(500).json({ message: 'Error fetching file info' });
  }
});


// ----- SET/UPDATE SHARE PASSWORD -----
router.post('/share/:filename', async (req, res) => {
  const { password } = req.body;

  try {
    const file = await File.findOne({ filename: req.params.filename });
    if (!file) return res.status(404).json({ message: 'File not found' });

    file.sharePassword = password || ''; // Set or clear password
    await file.save();

    res.json({
      message: password ? 'Password protection enabled' : 'Password removed',
      shareLink: `/shared/${file.filename}`
    });
  } catch {
    res.status(500).json({ message: 'Error setting share password' });
  }
});

router.get('/view/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(uploadPath, filename);  // uploadPath should be defined

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ message: 'File not found' });
  }

  res.sendFile(filePath);
});

// ----- PROTECTED ACCESS (ASK IF PASSWORD IS SET) -----
router.post('/protected-access/:filename', async (req, res) => {
  const { password } = req.body;
  try {
    const file = await File.findOne({ filename: req.params.filename });
    if (!file) return res.status(404).json({ message: 'File not found' });

    const filePath = path.join(uploadPath, file.filename);
    if (!fs.existsSync(filePath)) return res.status(404).json({ message: 'File missing' });

    // ✅ If no password is set, allow access
    if (!file.sharePassword || file.sharePassword.trim() === '') {
      return res.sendFile(filePath);
    }

    // 🔐 If password is set, validate it
    if (password === file.sharePassword) {
      return res.sendFile(filePath);
    } else {
      return res.status(401).json({ message: 'Incorrect password' });
    }
  } catch {
    res.status(500).json({ message: 'Error accessing protected file' });
  }
});

module.exports = router;
