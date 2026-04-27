const express = require('express');
const router = express.Router();
const { auth, requireRole } = require('../middleware/auth');
const { ensureSheetHeaders, getCacheStats, invalidateCache } = require('../services/Sheetsadapter');
const { DEPARTMENTS } = require('../config/Sheetsmapping');
const User = require('../models/User');

// GET all department configs (schema overview)
router.get('/departments', auth, requireRole('admin', 'manager'), (req, res) => {
  const overview = Object.entries(DEPARTMENTS).map(([key, config]) => ({
    key,
    label: config.label,
    color: config.color,
    icon: config.icon,
    hasSpreadsheet: !!config.spreadsheetId,
    fieldCount: Object.keys(config.columns).length,
  }));
  res.json(overview);
});

// Setup sheet headers for a department
router.post('/setup-headers/:department', auth, requireRole('admin'), async (req, res) => {
  try {
    const { department } = req.params;
    const result = await ensureSheetHeaders(department);
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── FEATURE: Admin Dashboard ────────────────────────────────────────────────

// GET all users with full records (admin only)
// Returns managers, employees, and admins separately for the admin dashboard
router.get('/users', auth, requireRole('admin'), async (req, res) => {
  try {
    const users = await User.find({}, '-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET only managers (admin only) — useful for approval panel
router.get('/managers', auth, requireRole('admin'), async (req, res) => {
  try {
    const managers = await User.find({ role: 'manager' }, '-password').sort({ createdAt: -1 });
    res.json(managers);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET only employees (admin only)
router.get('/employees', auth, requireRole('admin'), async (req, res) => {
  try {
    const employees = await User.find({ role: 'employee' }, '-password').sort({ createdAt: -1 });
    res.json(employees);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET dashboard summary stats (admin only)
router.get('/stats', auth, requireRole('admin'), async (req, res) => {
  try {
    const [totalUsers, totalManagers, totalEmployees, pendingApprovals] = await Promise.all([
      User.countDocuments({ isActive: true }),
      User.countDocuments({ role: 'manager', isActive: true }),
      User.countDocuments({ role: 'employee', isActive: true }),
      User.countDocuments({ role: 'manager', isApproved: false, isActive: true }),
    ]);

    res.json({
      totalUsers,
      totalManagers,
      totalEmployees,
      pendingApprovals,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── FEATURE: Manager Approval System ───────────────────────────────────────

// GET all pending manager approvals (admin only)
router.get('/pending-managers', auth, requireRole('admin'), async (req, res) => {
  try {
    const pending = await User.find(
      { role: 'manager', isApproved: false, isActive: true },
      '-password'
    ).sort({ createdAt: -1 });
    res.json(pending);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
// 🔥 ADD THIS COMPATIBILITY ROUTE (DO NOT REMOVE EXISTING)

router.put('/approve/:id', auth, requireRole('admin'), async (req, res) => {
  try {
    const { approve, departments } = req.body;

    if (typeof approve !== 'boolean') {
      return res.status(400).json({ message: '"approve" (boolean) is required' });
    }

    const updateFields = { isApproved: approve };

    if (approve && departments && Array.isArray(departments)) {
      updateFields.departments = departments;
    }

    const user = await User.findOneAndUpdate(
      { _id: req.params.id, role: 'manager' },
      updateFields,
      { new: true, select: '-password' }
    );

    if (!user) {
      return res.status(404).json({ message: 'Manager not found' });
    }

    res.json({
      message: approve
        ? `Manager "${user.username}" approved`
        : `Manager "${user.username}" rejected`,
      user,
    });

  } catch (err) {
    console.error("APPROVE ERROR:", err);
    res.status(500).json({ message: err.message });
  }
});

// PATCH approve or reject a manager (admin only)
router.patch('/approve-manager/:id', auth, requireRole('admin'), async (req, res) => {
  try {
    const { approve, departments } = req.body;

    if (typeof approve !== 'boolean') {
      return res.status(400).json({ message: '"approve" (boolean) is required' });
    }

    const updateFields = { isApproved: approve };

    // Optionally set departments when approving
    if (approve && departments && Array.isArray(departments)) {
      updateFields.departments = departments;
    }

    const user = await User.findOneAndUpdate(
      { _id: req.params.id, role: 'manager' },
      updateFields,
      { new: true, select: '-password' }
    );

    if (!user) {
      return res.status(404).json({ message: 'Manager not found' });
    }

    console.log(`✅ [Admin] Manager "${user.username}" ${approve ? 'approved' : 'rejected'} by admin`);

    res.json({
      message: approve
        ? `Manager "${user.username}" has been approved and can now log in.`
        : `Manager "${user.username}" has been rejected.`,
      user,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// UPDATE user role/departments/isActive (admin only)
router.put('/users/:id', auth, requireRole('admin'), async (req, res) => {
  try {
    const { role, departments, isActive, isApproved } = req.body;
    const updated = await User.findByIdAndUpdate(
      req.params.id,
      { role, departments, isActive, isApproved },
      { new: true, select: '-password' }
    );
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Force cache clear
router.post('/clear-cache', auth, requireRole('admin'), (req, res) => {
  invalidateCache();
  res.json({ message: 'All caches cleared' });
});

// Health/status
router.get('/status', auth, requireRole('admin'), (req, res) => {
  res.json({
    cacheStats: getCacheStats(),
    departments: Object.keys(DEPARTMENTS),
    sheetsConfigured: Object.entries(DEPARTMENTS)
      .filter(([, c]) => c.spreadsheetId)
      .map(([k]) => k),
  });
});

module.exports = router;