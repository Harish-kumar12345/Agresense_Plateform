const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User } = require('../models/User');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// GET /api/auth/me — return current user from token
router.get('/me', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user.sub).select('-passwordHash');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({
      user: {
        id:         user._id,
        name:       user.name,
        email:      user.email,
        role:       user.role,
        isVerified: user.isVerified
      }
    });
  } catch (err) {
    console.error('❌ /me error:', err);
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
});


// POST /api/auth/signup
router.post('/signup', async (req, res) => {
  try {
    const {
      name, email, password,
      // role — 'farmer' (default) or 'officer'
      role = 'farmer',
      // Farmer-specific
      phone, district,
      // Officer-specific
      officerId, department
    } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    if (!['farmer', 'officer'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role. Must be farmer or officer.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Check if user already exists
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Officers start unverified; farmers are verified immediately
    const isVerified = role !== 'officer';

    const user = await User.create({
      name,
      email,
      passwordHash,
      role,
      isVerified,
      // Farmer fields
      phone:    phone    || '',
      district: district || '',
      // Officer fields
      officerId:  officerId  || '',
      department: department || '',
    });

    // For officers: return success but NO JWT (they can't log in until verified)
    if (!isVerified) {
      console.log('✅ Officer registration submitted (pending approval):', email);
      return res.status(201).json({
        message: 'Officer account created. Pending admin verification.',
        pending: true
      });
    }

    // Farmer: generate JWT and return immediately
    const token = jwt.sign(
      { sub: user._id, role: user.role, isVerified: user.isVerified },
      process.env.JWT_SECRET || 'dev_secret',
      { expiresIn: '7d' }
    );

    console.log('✅ New farmer registered:', email);
    res.status(201).json({
      token,
      user: {
        id:         user._id,
        name:       user.name,
        email:      user.email,
        role:       user.role,
        isVerified: user.isVerified
      }
    });
  } catch (err) {
    console.error('❌ Signup error:', err);
    res.status(500).json({ error: 'Signup failed. Please try again.' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Optional role mismatch guard
    if (role && user.role !== role) {
      return res.status(403).json({
        error: `This account is registered as a ${user.role}, not ${role}.`,
        code: 'ROLE_MISMATCH'
      });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Block officer login if not yet verified by admin
    if (user.role === 'officer' && !user.isVerified) {
      return res.status(403).json({
        error: 'Your officer account is pending admin approval.',
        code: 'OFFICER_PENDING'
      });
    }

    const token = jwt.sign(
      { sub: user._id, role: user.role, isVerified: user.isVerified },
      process.env.JWT_SECRET || 'dev_secret',
      { expiresIn: '7d' }
    );

    console.log('✅ User logged in:', email, '| role:', user.role);
    res.json({
      token,
      user: {
        id:         user._id,
        name:       user.name,
        email:      user.email,
        role:       user.role,
        isVerified: user.isVerified
      }
    });
  } catch (err) {
    console.error('❌ Login error:', err);
    res.status(500).json({ error: 'Login failed. Please try again.' });
  }
});

module.exports = router;
