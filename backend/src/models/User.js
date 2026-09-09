const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name:         { type: String, required: true },
    email:        { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    role:         { type: String, enum: ['farmer', 'officer'], default: 'farmer' },

    /**
     * isVerified:
     *   - true  (default) for farmers — they can log in immediately after signup
     *   - false for officers — an admin must approve them before first login
     */
    isVerified: { type: Boolean, default: true },

    // Farmer-specific optional fields
    phone:    { type: String, default: '' },
    district: { type: String, default: '' },

    // Officer-specific optional fields
    officerId:  { type: String, default: '' },
    department: { type: String, default: '' },
  },
  { timestamps: true }
);

const User = mongoose.model('User', userSchema);
module.exports = { User };
