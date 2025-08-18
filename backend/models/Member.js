const mongoose = require("mongoose");

// ✅ Family Member Sub-Schema
const familyMemberSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,   // required if family member exists
    trim: true
  },
  relation: {
    type: String,
    required: true,   // required if family member exists
    trim: true
  },
  age: {
    type: String,
    required: true    // required if family member exists
  }
});

const memberSchema = new mongoose.Schema({
  headName: {
    type: String,
    required: true,
    trim: true
  },
  rationNo: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  uniqueNumber: {    
    type: String,
    required: true,
    unique: true, // ensures MongoDB uniqueness
    trim: true
  },
  address: {
    type: String,
    required: true,
    trim: true
  },
  mobile: {
    type: String,
    trim: true
  },
  zone: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Zone',
    required: true
  },
  familyMembers: {
    type: [familyMemberSchema], // optional array
    default: []
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  issueDate: {
    type: Date,
    default: Date.now
  },
  cardId: {   // <-- QR Code ID
    type: String,
    unique: true,
    sparse: true,
    trim: true
  }
});

// ✅ Index for searching
memberSchema.index({ headName: 'text', rationNo: 'text', uniqueNumber: 'text' });

module.exports = mongoose.model("Member", memberSchema);
