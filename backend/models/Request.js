const mongoose = require("mongoose");

// ✅ Family Member Schema
const familyMemberSchema = new mongoose.Schema({
  name: { type: String, required: true },
  relation: { type: String, required: true },
  birthdate: { type: Date },
  age: { type: Number },
  gender: { type: String, enum: ["male", "female", "other"] },
});

// ✅ Main Request Schema
const requestSchema = new mongoose.Schema(
  {
    // Head of Household
    headName: { type: String, required: true },
    headGender: {
      type: String,
      enum: ["male", "female", "other"],
      required: true,
    },
    headBirthday: { type: Date, required: true },
    headAge: { type: Number, required: true },

    // Household details
    rationNo: { type: String, required: true },
    address: { type: String, required: true },

    // Primary Mobile (always required, 10 digits only)
    mobile: {
      type: String,
      required: true,
      validate: {
        validator: (v) => /^\d{10}$/.test(v),
        message: (props) => `${props.value} is not a valid 10-digit mobile number!`,
      },
    },

    // ✅ Multiple Extra Mobiles (optional, must be 10 digits if present)
    additionalMobiles: [
      {
        type: String,
        validate: {
          validator: (v) => /^\d{10}$/.test(v),
          message: (props) =>
            `${props.value} is not a valid 10-digit additional mobile number!`,
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

    // Zone reference
    zone: { type: mongoose.Schema.Types.ObjectId, ref: "Zone", required: true },

    // Family Members
    familyMembers: [familyMemberSchema],

    // Workflow
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },

    // Number assigned only after approval
    assignedNumber: { type: String, default: null },

    // Review Info
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // admin who approved/rejected
    },
    reviewNotes: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Request", requestSchema);
