const mongoose = require('mongoose');

const ALLOWED_DEPARTMENTS = ['CRM', 'Production', 'Store', 'Commercial', 'AfterSales'];

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
      enum: ALLOWED_DEPARTMENTS,
      required: true,
      set: v => v.trim(), // normalize
    },

    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    deadline: {
      type: Date,
      required: true,
    },

    status: {
      type: String,
      enum: ['pending', 'in-progress', 'completed'],
      default: 'pending',
      set: v => v.toLowerCase(),
    },

    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium',
      set: v => v.toLowerCase(), // 🔥 fixes "Medium" bug
    },

    extraFields: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    // ── Google Sheets sync fields ───────────────────────────
    sheetTaskId: {
      type: String,
      index: true,
    },

    sheetRowIndex: {
      type: Number,
    },

    assignedToUsername: {
      type: String,
      default: '',
    },

    createdByUsername: {
      type: String,
      default: '',
    },

    lastSyncedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

// 🔥 Auto-sync usernames (no manual work needed)
taskSchema.pre('save', async function (next) {
  try {
    if (this.isModified('assignedTo') || !this.assignedToUsername) {
      const user = await mongoose.model('User').findById(this.assignedTo);
      if (user) this.assignedToUsername = user.username;
    }

    if (this.isModified('createdBy') || !this.createdByUsername) {
      const user = await mongoose.model('User').findById(this.createdBy);
      if (user) this.createdByUsername = user.username;
    }

    next();
  } catch (err) {
    next(err);
  }
});

// 🔥 Index for fast lookup
taskSchema.index({ department: 1, sheetTaskId: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('Task', taskSchema);