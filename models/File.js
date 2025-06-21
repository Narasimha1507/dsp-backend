// models/File.js
const mongoose = require('mongoose');

const fileSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
  },
  originalname: {
    type: String,
    required: true,
  },
  filename: {
    type: String,
    required: true,
  },
  mimetype: {
    type: String,
    required: true,
  },
  size: {
    type: Number,
    required: true,
  },
  uploaded_at: {
    type: Date,
    default: Date.now,
  },
  shareId: String,
  sharePassword: String, // stored in plain text as per instruction
});

module.exports = mongoose.model('File', fileSchema);
