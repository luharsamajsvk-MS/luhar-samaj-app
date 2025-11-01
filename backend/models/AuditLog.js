const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema(
  {
    // 🔹 Renamed from auditNumber to requestNumber
    requestNumber: {
      type: Number,
      // unique: true,  <-- REMOVED
      // index: true,   <-- REMOVED
      // sparse: true,  <-- REMOVED
    },

    action: {
      type: String,
      required: true,
      enum: ["create", "update", "delete", "restore"], // This is correct from last time
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

//
// --- 🔻 ADD THIS INDEX 🔻 ---
//
// This creates a unique index *only* on documents where requestNumber is not null.
// It allows any number of documents to have a null/missing requestNumber.
auditLogSchema.index(
  { requestNumber: 1 },
  {
    unique: true,
    partialFilterExpression: { requestNumber: { $type: "number" } },
  }
);
//
// --- 🔺 END OF ADDITION 🔺 ---
//

module.exports = mongoose.model("AuditLog", auditLogSchema);