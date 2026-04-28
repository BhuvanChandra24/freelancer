/**
 * Task.js — MODIFIED
 * ============================================================
 * Added Google Sheets sync fields:
 *   - sheetTaskId      : the "id" value from Col A of the sheet
 *   - sheetRowIndex    : the 1-based row number in the sheet
 *   - assignedToUsername / createdByUsername : string copies
 *     kept alongside the ObjectId refs so sync logic can
 *     write back to sheets without resolving references.
 *   - lastSyncedAt     : timestamp of last successful sync
 *
 * Every other field is unchanged.
 * ============================================================
 */

const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
    },
    department: {
      type: String,
      enum: ['CRM', 'Production', 'Store', 'Commercial', 'AfterSales'],
      required: true,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    deadline: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'in-progress', 'completed'],
      default: 'pending',
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium',
    },
    extraFields: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    // ── Google Sheets sync fields (NEW) ──────────────────────
    /** Value from Col A of the department sheet (e.g. "TASK-CRM-1714300000000") */
    sheetTaskId: {
      type: String,
      index: true,
    },
    /** 1-based row number in the department sheet */
    sheetRowIndex: {
      type: Number,
    },
    /** Username string — kept in sync with sheet Col D (assignedTo) */
    assignedToUsername: {
      type: String,
      default: '',
    },
    /** Username string — kept in sync with sheet Col J (createdBy) */
    createdByUsername: {
      type: String,
      default: '',
    },
    /** Timestamp when this task was last successfully synced to/from Sheets */
    lastSyncedAt: {
      type: Date,
    },
    // ─────────────────────────────────────────────────────────
  },
  { timestamps: true }
);

// Compound index: fast lookup by department + sheetTaskId
taskSchema.index({ department: 1, sheetTaskId: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('Task', taskSchema);