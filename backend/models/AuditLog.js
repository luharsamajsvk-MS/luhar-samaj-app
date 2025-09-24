const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema(
  {
    // 🔹 Unique Audit Number (auto-increment)
    auditNumber: {
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

// 🔹 Auto-increment auditNumber
auditLogSchema.pre("save", async function (next) {
  if (this.auditNumber) return next(); // already set

  try {
    const last = await this.constructor
      .findOne({})
      .sort({ auditNumber: -1 })
      .select("auditNumber")
      .lean();

    this.auditNumber = last ? last.auditNumber + 1 : 1;
    next();
  } catch (err) {
    next(err);
  }
});

module.exports = mongoose.model("AuditLog", auditLogSchema);
