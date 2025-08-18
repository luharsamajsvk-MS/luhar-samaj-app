const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Member = require('../models/Member');
const Zone = require('../models/Zone');
const { generateCard } = require('../services/pdf-service');
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

// ===============================
// GET /api/members → list all members
// ===============================
router.get('/', auth, async (req, res) => {
  try {
    const members = await Member.find().populate('zone');
    res.json(members);
  } catch (err) {
    console.error('GET /members error:', err);
    res.status(500).json({ error: 'Failed to fetch members' });
  }
});

// ===============================
// POST /api/members → create member
// ===============================
router.post('/', auth, async (req, res) => {
  try {
    const { headName, rationNo, uniqueNumber, address, mobile, zone, familyMembers } = req.body;

    // Validate zone exists
    const zoneDoc = await Zone.findById(zone);
    if (!zoneDoc) return res.status(400).json({ error: 'Invalid zone ID' });

    // ✅ Check if uniqueNumber already exists
    const existingNumber = await Member.findOne({ uniqueNumber });
    if (existingNumber) {
      return res.status(400).json({ error: `Unique Number ${uniqueNumber} is already assigned to ${existingNumber.headName}.` });
    }

    // ✅ Generate a UUID cardId for QR code
    const cardId = uuidv4();

    const member = new Member({
      headName,
      rationNo,
      uniqueNumber,
      address,
      mobile,
      zone,
      familyMembers: Array.isArray(familyMembers)
        ? familyMembers.map(f => ({
            name: f.name,
            relation: f.relation,
            age: f.age
          }))
        : [],
      createdBy: req.user?.id,
      cardId // ✅ saved here
    });

    await member.save();
    const populated = await Member.findById(member._id).populate('zone');
    res.status(201).json(populated);
  } catch (err) {
    console.error('POST /members error:', err);
    res.status(400).json({ error: err.message || 'Failed to create member' });
  }
});

// ===============================
// PUT /api/members/:id → update member
// ===============================
router.put('/:id', auth, async (req, res) => {
  try {
    const { headName, rationNo, uniqueNumber, address, mobile, zone, familyMembers } = req.body;

    // Validate zone if updated
    if (zone) {
      const zoneDoc = await Zone.findById(zone);
      if (!zoneDoc) return res.status(400).json({ error: 'Invalid zone ID' });
    }

    const member = await Member.findById(req.params.id);
    if (!member) return res.status(404).json({ error: 'Member not found' });

    // ✅ Check if updated uniqueNumber is already assigned to another member
    if (uniqueNumber) {
      const existingNumber = await Member.findOne({ uniqueNumber, _id: { $ne: req.params.id } });
      if (existingNumber) {
        return res.status(400).json({ error: `Unique Number ${uniqueNumber} is already assigned to ${existingNumber.headName}.` });
      }
    }

    // Update fields
    member.headName = headName;
    member.rationNo = rationNo;
    member.uniqueNumber = uniqueNumber;
    member.address = address;
    member.mobile = mobile;
    member.zone = zone;

    // Map family members including age
    member.familyMembers = Array.isArray(familyMembers)
      ? familyMembers.map(f => ({
          name: f.name,
          relation: f.relation,
          age: f.age
        }))
      : [];

    await member.save();
    const populated = await Member.findById(member._id).populate('zone');
    res.json(populated);
  } catch (err) {
    console.error('PUT /members/:id error:', err);
    res.status(400).json({ error: err.message || 'Failed to update member' });
  }
});

// ===============================
// DELETE /api/members/:id → delete member
// ===============================
router.delete('/:id', auth, async (req, res) => {
  try {
    const deleted = await Member.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Member not found' });
    res.json({ message: 'Member deleted' });
  } catch (err) {
    console.error('DELETE /members/:id error:', err);
    res.status(500).json({ error: 'Failed to delete member' });
  }
});

// ===============================
// GET /api/members/:id/pdf → preview PDF inline
// ===============================
router.get('/:id/pdf', auth, async (req, res) => {
  try {
    const pdfBuffer = await generateCard(req.params.id);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'inline', // ✅ preview in browser
    });
    res.send(pdfBuffer);
  } catch (err) {
    console.error('PDF generation error:', err);
    res.status(500).json({ error: err.message || 'Failed to generate PDF' });
  }
});

// ===============================
// ✅ GET /api/members/verify/:id → verify QR code
// ===============================
router.get('/verify/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Build OR query dynamically
    const query = [
      { cardId: id },
      { uniqueNumber: id }
    ];

    // ✅ Only add _id if it's a valid ObjectId
    if (mongoose.Types.ObjectId.isValid(id)) {
      query.push({ _id: id });
    }

    const member = await Member.findOne({ $or: query }).populate('zone');

    if (!member) {
      return res.status(404).json({
        valid: false,
        message: "આ સભ્ય કાર્ડ અમાન્ય છે"
      });
    }

    res.json({
      valid: true,
      message: "આ સભ્ય કાર્ડ માન્ય છે",
      trust: "લુહાર સમાજ સાવરકુંડલા ટ્રસ્ટ રજી નં. ૧૧૪૫ એ",
      dateOfIssue: member.issueDate
        ? member.issueDate.toISOString().split("T")[0]
        : null,
      સભ્યનં: member.uniqueNumber
    });
  } catch (err) {
    console.error("QR verify error:", err);
    res.status(500).json({
      valid: false,
      message: "સર્વર ભૂલ"
    });
  }
});

module.exports = router;
