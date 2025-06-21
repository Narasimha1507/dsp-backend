const express = require('express');
const router = express.Router();
const User = require('../models/User');

// POST /api/users/signup
router.post('/signup', async (req, res) => {
  const { username, email, mobile, password } = req.body;

  if (!username || !email || !mobile || !password) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  try {
    const existing = await User.findOne({ email });
    if (existing) return res.status(409).json({ message: 'Email already exists' });

    const newUser = new User({ username, email, mobile, password }); // password saved as plain text
    await newUser.save();

    res.status(201).json({
      message: 'User registered successfully',
      user: { username, email, mobile }
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error during signup' });
  }
});

// POST /api/users/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password)
    return res.status(400).json({ message: 'Email and password are required' });

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Plaintext comparison (not secure!)
    if (user.password !== password)
      return res.status(401).json({ message: 'Invalid credentials' });

    res.json({
      message: 'Login successful',
      user: { username: user.username, email: user.email }
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error during login' });
  }
});

// GET /api/users/:email
router.get('/:email', async (req, res) => {
  try {
    const user = await User.findOne({ email: req.params.email }).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ user });
  } catch (err) {
    res.status(500).json({ message: 'Failed to get user data' });
  }
});

router.put('/:email', async (req, res) => {
  const { email } = req.params;
  const { username, mobile } = req.body;

  try {
    const result = await User.findOneAndUpdate(
      { email },                      // find user by email
      { $set: { username, mobile } }, // update fields
      { new: true }                   // return updated user
    );

    if (!result) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({ user: result });
  } catch (err) {
    console.error('Update error:', err);
    res.status(500).json({ message: 'Error updating profile.' });
  }
});

module.exports = router;
