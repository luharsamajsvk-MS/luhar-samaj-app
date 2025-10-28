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

    city: { type: String, trim: true },

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
// 🔹 REMOVED setAuditContext, diffObjects, pre('save') hook, and pre('remove') hook.
// This prevents duplicate logging, as audit logging is already
// handled manually in the routes (e.g., routes/members.js) via createAudit.

module.exports = mongoose.model("Member", memberSchema);