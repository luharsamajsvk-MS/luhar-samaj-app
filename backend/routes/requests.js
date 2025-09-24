const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { createAudit } = require('../services/auditService'); // ✅ Import audit service

const Request = require('../models/Request');
const Member = require('../models/Member');

/**
 * 🔓 PUBLIC: Submit a new membership request
 */
router.post('/', async (req, res) => {
  try {
    const {
      headName,
      headGender,
      headBirthday,
      headAge,
      rationNo,
      address,
      mobile,
      additionalMobiles, // ✅ Aligned with new form
      pincode,
      zone,
      familyMembers
    } = req.body;

    // Basic validation
    if (!headName || !headGender || !headBirthday || !rationNo || !address || !mobile || !zone) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const request = new Request({
      headName,
      headGender,
      headBirthday: new Date(headBirthday),
      headAge,
      rationNo,
      address,
      mobile,
      additionalMobiles: additionalMobiles || [], // Ensure it's an array
      pincode,
      zone,
      familyMembers: familyMembers || [],
      status: 'pending'
    });

    await request.save();

    res.status(201).json({
      message: 'Request submitted successfully',
      request: { id: request._id }
    });
  } catch (err) {
    console.error('POST /requests error:', err);
    res.status(500).json({ error: 'Failed to submit request' });
  }
});

/**
 * 🔒 ADMIN: Get all requests
 */
router.get('/', auth, async (req, res) => {
  try {
    const { status } = req.query;
    const filter = status ? { status } : {};
    
    const requests = await Request.find(filter)
      .populate('zone', 'number name')
      .sort({ createdAt: -1 })
      .lean();

    res.json(requests);
  } catch (err) {
    console.error('GET /requests error:', err);
    res.status(500).json({ error: 'Failed to fetch requests' });
  }
});

/**
 * 🔒 ADMIN: Approve a request → create Member
 */
router.post('/:id/approve', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { uniqueNumber, reviewNotes } = req.body;

    if (!uniqueNumber) {
      return res.status(400).json({ error: 'Unique number is required for approval.' });
    }

    // Check if uniqueNumber is already in use
    const existingMember = await Member.findOne({ uniqueNumber }).lean();
    if (existingMember) {
      return res.status(400).json({ error: 'This unique number is already assigned.' });
    }

    const request = await Request.findById(id);
    if (!request || request.status !== 'pending') {
      return res.status(404).json({ error: 'Request not found or has already been processed.' });
    }

    // ✅ Create Member directly from request data
    const newMember = await Member.create({
      head: {
        name: request.headName,
        birthdate: request.headBirthday,
        age: request.headAge,
        gender: request.headGender,
      },
      rationNo: request.rationNo,
      uniqueNumber: uniqueNumber,
      address: request.address,
      mobile: request.mobile,
      additionalMobiles: request.additionalMobiles,
      pincode: request.pincode,
      zone: request.zone,
      familyMembers: request.familyMembers,
      createdBy: req.user?.id,
      issueDate: new Date(),
    });

    // ✅ Create audit log for the new member
    await createAudit({
      action: 'create',
      entityType: 'Member',
      entityId: newMember._id,
      memberId: newMember._id,
      requestId: request._id, // Link to the original request
      after: newMember.toObject(),
      req,
    });

    // ✅ Update request status
    request.status = 'approved';
    request.assignedNumber = uniqueNumber;
    request.reviewedBy = req.user?.id;
    request.reviewNotes = reviewNotes;
    await request.save();

    res.json({ message: 'Request approved and member created successfully', member: newMember });
  } catch (err) {
    console.error('POST /requests/:id/approve error:', err);
    res.status(500).json({ error: 'Failed to approve request' });
  }
});

/**
 * 🔒 ADMIN: Reject a request
 */
router.post('/:id/reject', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { reviewNotes } = req.body;

    const request = await Request.findById(id);
    if (!request || request.status !== 'pending') {
      return res.status(404).json({ error: 'Request not found or not pending' });
    }

    const beforeUpdate = request.toObject();
    
    // Update request status
    request.status = 'rejected'; // Changed from 'declined' to 'rejected' for consistency
    request.reviewedBy = req.user?.id;
    request.reviewNotes = reviewNotes;
    await request.save();

    // ✅ Create audit log for rejection
    await createAudit({
        action: 'update',
        entityType: 'Request',
        entityId: id,
        requestId: id,
        before: beforeUpdate,
        after: request.toObject(),
        req
    });

    res.json({ message: 'Request rejected successfully' });
  } catch (err) {
    console.error('POST /requests/:id/reject error:', err);
    res.status(500).json({ error: 'Failed to reject request' });
  }
});

/**
 * 🔒 ADMIN: Delete a request
 */
router.delete('/:id', auth, async (req, res) => {
  try {
    const beforeDelete = await Request.findById(req.params.id).lean();
    if (!beforeDelete) {
      return res.status(404).json({ error: 'Request not found' });
    }

    await Request.findByIdAndDelete(req.params.id);

    // ✅ Create audit log for deletion
    await createAudit({
        action: 'delete',
        entityType: 'Request',
        entityId: beforeDelete._id,
        requestId: beforeDelete._id,
        before: beforeDelete,
        req
    });

    res.json({ message: 'Request deleted successfully' });
  } catch (err) {
    console.error('DELETE /requests/:id error:', err);
    res.status(500).json({ error: 'Failed to delete request' });
  }
});

module.exports = router;