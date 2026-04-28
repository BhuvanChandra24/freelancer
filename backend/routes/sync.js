/**
 * sync.js — NEW ROUTE FILE
 * ============================================================
 * Mounts at /api/sync  (register in server.js)
 *
 * GET  /api/sync          → pull Sheets → DB (manual trigger)
 * POST /api/sync/push     → push DB → Sheets
 * GET  /api/sync/status   → last sync time + status summary
 * ============================================================
 */

const express = require('express');
const router = express.Router();
const { auth, requireRole } = require('../middleware/auth');
const { syncSheetToDB, syncDBToSheet } = require('../services/googleSheetsService');
const SyncLog = require('../models/SyncLog');
const { DEPARTMENTS } = require('../config/Sheetsmapping');

// ─── Helper: read optional ?departments= query param ──────────────────────────
function parseDepartments(query) {
  if (!query) return Object.keys(DEPARTMENTS);
  return query.split(',').map(d => d.trim()).filter(d => DEPARTMENTS[d]);
}

// ─── GET /api/sync  (Sheets → DB) ─────────────────────────────────────────────
router.get('/', auth, requireRole('admin', 'manager'), async (req, res) => {
  const departments = parseDepartments(req.query.departments);

  // Create an in-progress log entry so /status shows "In Progress" immediately
  const log = await SyncLog.create({
    direction: 'sheet_to_db',
    trigger: 'manual',
    status: 'in_progress',
  });

  // Run sync asynchronously so the HTTP response is immediate
  res.json({
    message: 'Sync started (Sheet → DB)',
    departments,
    logId: log._id,
  });

  try {
    const summary = await syncSheetToDB(departments);
    await SyncLog.findByIdAndUpdate(log._id, {
      status: summary.errors > 0 ? (summary.upserted > 0 ? 'partial' : 'failed') : 'success',
      upserted: summary.upserted,
      skipped: summary.skipped,
      errors: summary.errors,
      details: summary.details,
      completedAt: new Date(),
    });
    console.log(`✅ [GET /api/sync] Manual sync complete:`, summary);
  } catch (err) {
    await SyncLog.findByIdAndUpdate(log._id, {
      status: 'failed',
      details: [{ error: err.message }],
      completedAt: new Date(),
    });
    console.error(`❌ [GET /api/sync] Manual sync failed:`, err.message);
  }
});

// ─── POST /api/sync/push  (DB → Sheets) ───────────────────────────────────────
router.post('/push', auth, requireRole('admin', 'manager'), async (req, res) => {
  const departments = parseDepartments(req.body.departments || req.query.departments);

  const log = await SyncLog.create({
    direction: 'db_to_sheet',
    trigger: 'manual',
    status: 'in_progress',
  });

  res.json({
    message: 'Push started (DB → Sheet)',
    departments,
    logId: log._id,
  });

  try {
    const summary = await syncDBToSheet(departments);
    await SyncLog.findByIdAndUpdate(log._id, {
      status: summary.errors > 0 ? (summary.updated + summary.appended > 0 ? 'partial' : 'failed') : 'success',
      updated: summary.updated,
      appended: summary.appended,
      errors: summary.errors,
      details: summary.details,
      completedAt: new Date(),
    });
    console.log(`✅ [POST /api/sync/push] Push complete:`, summary);
  } catch (err) {
    await SyncLog.findByIdAndUpdate(log._id, {
      status: 'failed',
      details: [{ error: err.message }],
      completedAt: new Date(),
    });
    console.error(`❌ [POST /api/sync/push] Push failed:`, err.message);
  }
});

// ─── GET /api/sync/status ──────────────────────────────────────────────────────
router.get('/status', auth, async (req, res) => {
  try {
    // Last completed log of each direction
    const [lastPull, lastPush, inProgress] = await Promise.all([
      SyncLog.findOne({ direction: 'sheet_to_db', status: { $ne: 'in_progress' } })
        .sort({ createdAt: -1 }),
      SyncLog.findOne({ direction: 'db_to_sheet', status: { $ne: 'in_progress' } })
        .sort({ createdAt: -1 }),
      SyncLog.findOne({ status: 'in_progress' })
        .sort({ createdAt: -1 }),
    ]);

    // Recent 10 logs for history
    const recentLogs = await SyncLog.find({})
      .sort({ createdAt: -1 })
      .limit(10)
      .select('direction trigger status upserted updated appended errors createdAt completedAt');

    res.json({
      lastPull: lastPull
        ? {
            time: lastPull.createdAt,
            status: lastPull.status,
            upserted: lastPull.upserted,
            skipped: lastPull.skipped,
            errors: lastPull.errors,
          }
        : null,
      lastPush: lastPush
        ? {
            time: lastPush.createdAt,
            status: lastPush.status,
            updated: lastPush.updated,
            appended: lastPush.appended,
            errors: lastPush.errors,
          }
        : null,
      currentlySyncing: !!inProgress,
      recentLogs,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── GET /api/sync/logs  (optional: full history, admin only) ─────────────────
router.get('/logs', auth, requireRole('admin'), async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const logs = await SyncLog.find({})
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);
    const total = await SyncLog.countDocuments();
    res.json({ logs, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;