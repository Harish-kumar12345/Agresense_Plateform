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

    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanName = (name || '').trim();

    // Check if user already exists (case-insensitive)
    const escapedEmail = cleanEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const existing = await User.findOne({ 
      email: { $regex: new RegExp(`^${escapedEmail}$`, 'i') } 
    });
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Officers start unverified; farmers are verified immediately
    const isVerified = role !== 'officer';

    const user = await User.create({
      name: cleanName,
      email: cleanEmail,
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
      console.log('✅ Officer registration submitted (pending approval):', cleanEmail);
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

    console.log('✅ New farmer registered:', cleanEmail);
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

    const cleanEmail = String(email).trim().toLowerCase();
    const cleanPassword = String(password);

    console.log(`🔑 Login attempt for: "${cleanEmail}" (role requested: ${role || 'any'})`);

    // Case-insensitive user lookup
    const escapedEmail = cleanEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const user = await User.findOne({ 
      email: { $regex: new RegExp(`^${escapedEmail}$`, 'i') } 
    });

    if (!user) {
      console.warn(`⚠️ Login failed: User "${cleanEmail}" not found in database.`);
      return res.status(401).json({ 
        error: `No account found with email "${cleanEmail}". Please check your email address or click Sign Up to create an account.` 
      });
    }

    // Optional role mismatch guard
    if (role && user.role !== role) {
      return res.status(403).json({
        error: `This account is registered as a ${user.role}, not ${role}. Please select the ${user.role} portal to log in.`,
        code: 'ROLE_MISMATCH'
      });
    }

    // Check password (also test trimmed in case accidental trailing space was submitted)
    let valid = await bcrypt.compare(cleanPassword, user.passwordHash);
    if (!valid && cleanPassword.trim() !== cleanPassword) {
      valid = await bcrypt.compare(cleanPassword.trim(), user.passwordHash);
    }

    if (!valid) {
      console.warn(`⚠️ Login failed: Incorrect password for user "${cleanEmail}".`);
      return res.status(401).json({ 
        error: 'Incorrect password. Please verify your password or use "Reset Password".' 
      });
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

    console.log('✅ User logged in successfully:', user.email, '| role:', user.role);
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

// POST /api/auth/reset-password — allows user to reset password with email
router.post('/reset-password', async (req, res) => {
  try {
    const { email, newPassword } = req.body;

    if (!email || !newPassword) {
      return res.status(400).json({ error: 'Email and new password are required' });
    }

    if (String(newPassword).length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const escapedEmail = cleanEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const user = await User.findOne({ 
      email: { $regex: new RegExp(`^${escapedEmail}$`, 'i') } 
    });

    if (!user) {
      return res.status(404).json({ error: `No account found with email "${cleanEmail}".` });
    }

    user.passwordHash = await bcrypt.hash(String(newPassword).trim(), 10);
    await user.save();

    console.log('✅ Password successfully reset for:', user.email);
    res.json({
      success: true,
      message: `Password has been reset successfully for ${user.email}. You can now log in!`
    });
  } catch (err) {
    console.error('❌ Reset password error:', err);
    res.status(500).json({ error: 'Failed to reset password. Please try again.' });
  }
});

module.exports = router;
