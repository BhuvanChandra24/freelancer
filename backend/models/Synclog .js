/**
 * SyncLog.js
 * ============================================================
 * Mongoose model to record every sync operation.
 * Drop into backend/models/
 * ============================================================
 */

const mongoose = require('mongoose');

const syncLogSchema = new mongoose.Schema(
  {
    direction: {
      type: String,
      enum: ['sheet_to_db', 'db_to_sheet'],
      required: true,
    },
    trigger: {
      type: String,
      enum: ['cron', 'manual', 'api'],
      default: 'cron',
    },
    status: {
      type: String,
      enum: ['success', 'partial', 'failed', 'in_progress'],
      default: 'in_progress',
    },
    // Counters — names vary by direction; unused ones default to 0
    upserted:  { type: Number, default: 0 },
    skipped:   { type: Number, default: 0 },
    updated:   { type: Number, default: 0 },
    appended:  { type: Number, default: 0 },
    errors:    { type: Number, default: 0 },

    // Per-department or per-task error detail
    details: { type: mongoose.Schema.Types.Mixed, default: [] },

    // Time the sync completed (set manually so we can track duration)
    completedAt: { type: Date },
  },
  { timestamps: true }
);

// Virtual: duration in ms
syncLogSchema.virtual('durationMs').get(function () {
  if (this.completedAt) {
    return this.completedAt - this.createdAt;
  }
  return null;
});

syncLogSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('SyncLog', syncLogSchema);