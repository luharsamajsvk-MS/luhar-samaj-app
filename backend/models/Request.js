// backend/models/Request.js
const mongoose = require('mongoose');

/**
 * We store the full public form in `payload` (flexible),
 * plus a few denormalized fields (name/mobile/zone) to make listing easier.
 */
const requestSchema = new mongoose.Schema(
  {
    payload: {
      type: mongoose.Schema.Types.Mixed,
      required: true, // the entire public form body
    },

    // Useful top-level fields for admin list/search
    name: { type: String, trim: true },
    mobile: { type: String, trim: true },
    zone: { type: mongoose.Schema.Types.ObjectId, ref: 'Zone', required: false },

    status: {
      type: String,
      enum: ['pending', 'approved', 'declined'],
      default: 'pending',
    },

    // Optional metadata
    createdByIp: { type: String, trim: true },
    notes: { type: String, trim: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Request', requestSchema);
