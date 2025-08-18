// backend/routes/requests.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');

const Request = require('../models/Request');
const Member = require('../models/Member');

// 🔓 PUBLIC: submit a new membership request
router.post('/', async (req, res) => {
  try {
    const body = req.body || {};

    // Try to extract common fields
    const name = body.headName || body.name || '';
    const mobile = body.mobile || body.phone || '';
    const zone = body.zone || null;

    const doc = await Request.create({
      payload: body,       // full form
      name,
      mobile,
      zone,
      createdByIp: req.ip,
      status: 'pending',
    });

    res.status(201).json({
      message: 'Request submitted successfully',
      id: doc._id,
    });
  } catch (err) {
    console.error('POST /requests error:', err);
    res.status(500).json({ error: 'Failed to submit request' });
  }
});

// 🔒 ADMIN: list all pending requests
router.get('/', auth, async (req, res) => {
  try {
    const items = await Request.find({ status: 'pending' })
      .sort({ createdAt: -1 })
      .lean();

    res.json(items);
  } catch (err) {
    console.error('GET /requests error:', err);
    res.status(500).json({ error: 'Failed to fetch requests' });
  }
});

// 🔒 ADMIN: approve a pending request -> create real Member
router.post('/:id/approve', auth, async (req, res) => {
  try {
    console.log("📩 Approve request body:", req.body);
    const { id } = req.params;
    const { uniqueNumber } = req.body || {};

    if (!uniqueNumber || String(uniqueNumber).trim() === '') {
      return res.status(400).json({ error: 'uniqueNumber is required' });
    }

    // ensure uniqueNumber is not already used
    const existing = await Member.findOne({ uniqueNumber: String(uniqueNumber).trim() }).lean();
    if (existing) {
      return res.status(400).json({ error: 'uniqueNumber already in use' });
    }

    const requestDoc = await Request.findById(id);
    if (!requestDoc || requestDoc.status !== 'pending') {
      return res.status(404).json({ error: 'Request not found or not pending' });
    }

    const payload = requestDoc.payload || {};

    // ✅ Build Member object mapping required fields
    const memberData = {
      headName: payload.headName || payload.name || '',
      rationNo: payload.rationNo || '',
      uniqueNumber: String(uniqueNumber).trim(),
      address: payload.address || '',
      mobile: payload.mobile || payload.phone || '',
      zone: payload.zone,  // must be a valid Zone ObjectId
      familyMembers: payload.familyMembers || [],
      createdBy: req.user?.id, // from auth middleware
      issueDate: new Date(),
    };

    // validate required fields
    if (!memberData.headName || !memberData.rationNo || !memberData.address || !memberData.zone) {
      return res.status(400).json({
        error: 'Missing required fields: headName, rationNo, address, zone',
      });
    }

    // ✅ Create new Member
    const newMember = await Member.create(memberData);

    // ✅ Delete request after approval
    await Request.deleteOne({ _id: id });

    res.json({
      message: 'Request approved and member created',
      member: newMember,
    });
  } catch (err) {
    console.error('POST /requests/:id/approve error:', err);
    res.status(500).json({ error: 'Failed to approve request' });
  }
});

// 🔒 ADMIN: decline a pending request -> do NOT create Member
router.post('/:id/decline', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const requestDoc = await Request.findById(id);

    if (!requestDoc || requestDoc.status !== 'pending') {
      return res.status(404).json({ error: 'Request not found or not pending' });
    }

    await Request.deleteOne({ _id: id });
    res.json({ message: 'Request declined and removed' });
  } catch (err) {
    console.error('POST /requests/:id/decline error:', err);
    res.status(500).json({ error: 'Failed to decline request' });
  }
});

module.exports = router;
