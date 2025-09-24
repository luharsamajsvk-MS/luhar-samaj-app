const mongoose = require("mongoose");

// -------------------- Family Member Schema --------------------
const familyMemberSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  relation: { type: String, required: true, trim: true },
  birthdate: { type: Date },
  gender: { type: String, enum: ["male", "female", "other"] },
  age: { type: Number },
});

// -------------------- Member Schema --------------------
const memberSchema = new mongoose.Schema(
  {
    head: {
      name: { type: String, required: true, trim: true },
      birthdate: { type: Date, required: true },
      gender: { type: String, enum: ["male", "female", "other"], required: true },
      age: { type: Number, required: true },
    },

    rationNo: { type: String, trim: true, required: true },

    // 🔹 Unique number assigned after approval
    uniqueNumber: { type: Number, unique: true, sparse: true, index: true },

    address: { type: String, required: true },

    // 🔹 Primary + Additional numbers
    mobile: {
      type: String,
      trim: true,
      required: true,
      validate: {
        validator: (v) => /^\d{10}$/.test(v),
        message: (props) => `${props.value} is not a valid 10-digit mobile number!`,
      },
    },
    additionalMobiles: [
      {
        type: String,
        trim: true,
        validate: {
          validator: (v) => /^\d{10}$/.test(v),
          message: (props) => `${props.value} is not a valid 10-digit additional mobile number!`,
        },
      },
    ],

    pincode: {
      type: String,
      validate: {
        validator: (v) => !v || /^\d{6}$/.test(v),
        message: (props) => `${props.value} is not a valid 6-digit pincode!`,
      },
    },

    zone: { type: mongoose.Schema.Types.ObjectId, ref: "Zone", required: true },

    familyMembers: [familyMemberSchema],

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    issueDate: Date,
  },
  { timestamps: true }
);

// -------------------- Audit Helpers --------------------
memberSchema.methods.setAuditContext = function (userId, name, email, ip, ua) {
  this._auditContext = { userId, name, email, ip, ua };
};

function diffObjects(oldObj, newObj) {
  const changes = [];
  Object.keys(newObj).forEach((field) => {
    if (String(newObj[field]) !== String(oldObj?.[field])) {
      changes.push({ field, before: oldObj?.[field], after: newObj[field] });
    }
  });
  return changes;
}

// -------------------- Hooks --------------------
memberSchema.pre("save", async function (next) {
  if (!this._auditContext) return next();

  try {
    const AuditLog = mongoose.model("AuditLog"); // avoid circular dep
    const isNew = this.isNew;
    let changes = [];

    if (!isNew) {
      const existing = await this.constructor.findById(this._id).lean();
      if (existing) {
        changes = diffObjects(existing, this._doc);
      }
    }

    await AuditLog.create({
      action: isNew ? "create" : "update",
      entityType: "Member",
      entityId: this._id,
      memberId: this._id,
      changes,
      user: {
        id: this._auditContext.userId,
        name: this._auditContext.name,
        email: this._auditContext.email,
      },
      ipAddress: this._auditContext.ip,
      userAgent: this._auditContext.ua,
    });

    next();
  } catch (err) {
    console.error("Audit log error:", err);
    next(err);
  }
});

// 🔹 DELETE hook
memberSchema.pre("remove", async function (next) {
  if (!this._auditContext) return next();

  try {
    const AuditLog = mongoose.model("AuditLog");

    await AuditLog.create({
      action: "delete",
      entityType: "Member",
      entityId: this._id,
      memberId: this._id,
      changes: [{ before: this.toObject() }],
      user: {
        id: this._auditContext.userId,
        name: this._auditContext.name,
        email: this._auditContext.email,
      },
      ipAddress: this._auditContext.ip,
      userAgent: this._auditContext.ua,
    });

    next();
  } catch (err) {
    console.error("Audit log error:", err);
    next(err);
  }
});

module.exports = mongoose.model("Member", memberSchema);
