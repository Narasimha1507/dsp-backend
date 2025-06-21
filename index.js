const path = require('path');
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();
const fileRoutes = require('./routes/files');

const app = express();

// ✅ Load MONGO_URI from .env
const MONGO_URI = process.env.MONGO_URI;

// Middleware
const allowedOrigins = [
  'https://docshareplatform.netlify.app',
  'http://localhost:3000'
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/api/files', fileRoutes); // Includes upload, fetch, delete, serve
app.use((req, res, next) => {
  res.setHeader('Content-Security-Policy',
    "default-src 'self'; " +
    "font-src 'self' https://dsp-backend-njek.onrender.com; " +
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
    "script-src 'self' https://docshareplatform.netlify.app;"
  );
  next();
});
// MongoDB connection
mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch((err) => console.error('❌ MongoDB connection error:', err));

// Routes
const uploadRoute = require('./routes/upload');
const filesRoute = require('./routes/files');
const userRoute = require('./routes/user');

app.use('/api/upload', uploadRoute);
app.use('/api/files', filesRoute);
app.use('/api/users', userRoute);

// Serve uploaded files
const uploadDir = process.env.UPLOAD_DIR || 'uploads';
app.use('/uploads', express.static(path.join(__dirname, uploadDir)));

// Health check
app.get('/', (req, res) => {
  res.send('📁 DocuShare Backend is running...');
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server started on http://localhost:${PORT}`));
