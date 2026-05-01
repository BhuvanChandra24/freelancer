const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const ALLOWED_DEPARTMENTS = ['CRM', 'Production', 'Store', 'Commercial', 'AfterSales'];

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true, // normalize
  },

  email: {
    type: String,
    trim: true,
    default: '',
    lowercase: true,
  },

  password: {
    type: String,
    required: true,
  },

  role: {
    type: String,
    enum: ['employee', 'manager', 'admin'],
    default: 'employee',
  },

  departments: {
    type: [String],
    enum: ALLOWED_DEPARTMENTS,

    // 🔥 AUTO FIX INPUT
    set: function (value) {
      if (!value) return [];

      // Convert string → array
      if (typeof value === 'string') {
        value = [value];
      }

      // Clean data
      return value
        .map(d => (d || '').trim())
        .filter(d => d !== '');
    },

    // 🔥 VALIDATION
    validate: {
      validator: function (arr) {
        // Manager MUST have department
        if (this.role === 'manager') {
          return Array.isArray(arr) && arr.length > 0;
        }
        return true;
      },
      message: 'Manager must have at least one department',
    },

    default: [],
  },

  isActive: {
    type: Boolean,
    default: true,
  },

  // FEATURE: Manager Approval System
  isApproved: {
    type: Boolean,
    default: function () {
      // Managers need approval, others auto-approved
      return this.role !== 'manager';
    },
  },

}, { timestamps: true });


// 🔥 HASH PASSWORD
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});


// 🔥 PASSWORD COMPARE
userSchema.methods.comparePassword = async function (password) {
  return bcrypt.compare(password, this.password);
};


// 🔥 EXTRA SAFETY (optional but powerful)
userSchema.pre('validate', function (next) {
  // Normalize departments again (double safety)
  if (this.departments) {
    this.departments = this.departments
      .map(d => d.trim())
      .filter(d => d !== '');
  }
  next();
});


module.exports = mongoose.model('User', userSchema);