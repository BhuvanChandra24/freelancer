const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { auth, requireRole } = require('../middleware/auth');

const generateToken = (user) =>
  jwt.sign(
    { id: user._id, username: user.username, role: user.role, departments: user.departments },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );


// ================= LOGIN =================
router.post('/login', async (req, res) => {
  try {
    console.log("🔐 LOGIN BODY:", req.body);

    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password required' });
    }

    const user = await User.findOne({
      username: username.trim(),
      isActive: true
    });

    console.log("👤 USER FOUND:", user ? user.username : "NOT FOUND");

    if (!user || !(await user.comparePassword(password.trim()))) {
      console.log("❌ PASSWORD MISMATCH");
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // FEATURE: Manager Approval System
    // Block managers who have not been approved by admin yet
    if (user.role === 'manager' && !user.isApproved) {
      console.log("⏳ MANAGER NOT APPROVED:", user.username);
      return res.status(403).json({
        message: 'Your manager account is pending admin approval. Please wait for an administrator to approve your account.',
        pendingApproval: true,
      });
    }

    const token = generateToken(user);

    console.log("✅ LOGIN SUCCESS:", user.username);

    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        role: user.role,
        departments: user.departments,
        isApproved: user.isApproved,
      },
    });

  } catch (err) {
    console.error("❌ LOGIN ERROR:", err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});


// ================= SIGNUP =================
router.post('/signup', async (req, res) => {
  try {
    console.log("🟡 SIGNUP BODY:", req.body);

    let { username, password, role, departments, email } = req.body;

    username = username?.trim();
    password = password?.trim();
    email = email?.trim();

    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password required' });
    }

    if (email && !/^\S+@\S+\.\S+$/.test(email)) {
      return res.status(400).json({ message: 'Invalid email format' });
    }

    const existing = await User.findOne({ username });
    if (existing) {
      console.log("⚠️ USER EXISTS:", username);
      return res.status(400).json({ message: 'Username already exists' });
    }

    const assignedRole = role || 'employee';

    // FEATURE: Manager Approval System
    // Managers are created with isApproved: false and must be approved by admin
    // Employees and admins are auto-approved (isApproved: true)
    const isApproved = assignedRole !== 'manager';

    const newUser = new User({
      username,
      password,
      role: assignedRole,
      departments: departments || [],
      email: email || '',
      isActive: true,
      isApproved,
    });

    await newUser.save();

    console.log(`✅ USER CREATED: ${newUser.username} (role=${assignedRole}, approved=${isApproved})`);

    // FEATURE: Manager Approval System
    // Do NOT issue a token for unapproved managers — they must wait for admin approval
    if (assignedRole === 'manager') {
      return res.status(201).json({
        message: 'Manager account created. Your account is pending admin approval before you can log in.',
        pendingApproval: true,
      });
    }

    const token = generateToken(newUser);

    res.status(201).json({
      message: 'Account created successfully',
      token,
      user: {
        id: newUser._id,
        username: newUser.username,
        role: newUser.role,
        departments: newUser.departments,
        isApproved: newUser.isApproved,
      },
    });

  } catch (err) {
    console.error("❌ SIGNUP ERROR:", err);

    if (err.code === 11000) {
      return res.status(400).json({ message: 'Duplicate field error (username/email already exists)' });
    }

    res.status(500).json({ message: 'Server error', error: err.message });
  }
});


// ================= GET USERS (for task assignment dropdowns) =================
router.get('/users', auth, requireRole('admin', 'manager'), async (req, res) => {
  try {
    const users = await User.find({ isActive: true }, '-password').sort({ username: 1 });
    res.json(users);
  } catch (err) {
    console.error("❌ GET USERS ERROR:", err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});


// ================= GET CURRENT USER =================
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id, '-password');
    res.json(user);
  } catch (err) {
    console.error("❌ PROFILE ERROR:", err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;