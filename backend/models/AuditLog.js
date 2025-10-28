const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema(
  {
    // 🔹 Renamed from auditNumber to requestNumber
    requestNumber: {
      type: Number,
      unique: true,
      index: true,
    },

    action: {
      type: String,
      required: true,
      enum: ["create", "update", "delete"],
    },
    entityType: {
      type: String,
      required: true,
      enum: ["Member", "User", "Zone", "Request"],
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    memberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Member",
      index: true,
    },
    requestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Request",
      sparse: true, // ✅ multiple null values allowed
    },
    changes: [
      {
        field: String,
        before: mongoose.Schema.Types.Mixed,
        after: mongoose.Schema.Types.Mixed,
      },
    ],
    user: {
      id: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      name: String,
      email: String,
    },
    ipAddress: String,
    userAgent: String,
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// 🔹 Indexes for performance
auditLogSchema.index({ entityType: 1, entityId: 1 });
auditLogSchema.index({ "user.id": 1 });
auditLogSchema.index({ timestamp: -1 });

// 🔹 Auto-increment requestNumber
auditLogSchema.pre("save", async function (next) {
  if (this.requestNumber) return next(); // already set

  try {
    const last = await this.constructor
      .findOne({})
      .sort({ requestNumber: -1 }) // 🔹 Updated to sort by requestNumber
      .select("requestNumber")     // 🔹 Updated to select requestNumber
      .lean();

    this.requestNumber = last ? last.requestNumber + 1 : 1; // 🔹 Updated to set requestNumber
    next();
  } catch (err) {
    next(err);
  }
});

module.exports = mongoose.model("AuditLog", auditLogSchema);