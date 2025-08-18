const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Member = require('../models/Member');
const Zone = require('../models/Zone');

// 🔹 PUBLIC: Get all zones (basic info only, for dropdowns)
router.get('/public', async (req, res) => {
  try {
    const zones = await Zone.find({}, { number: 1, name: 1 }); // only essential fields
    res.json(zones);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// 🔹 ADMIN: Create zone
router.post('/', auth, async (req, res) => {
  try {
    const { number, name } = req.body;
    const zone = new Zone({
      number,
      name,
      createdBy: req.user.id
    });
    await zone.save();
    res.status(201).json(zone);
  } catch (err) {
    console.error(err);
    if (err.code === 11000 && err.keyPattern?.number) {
      return res.status(400).json({ error: 'Zone number already exists' });
    }
    res.status(500).json({ error: 'Server error' });
  }
});

// 🔹 ADMIN: Get all zones with people counts
router.get('/', auth, async (req, res) => {
  try {
    const zones = await Zone.find().populate('createdBy', 'email');

    const zonesWithCount = await Promise.all(
      zones.map(async zone => {
        const members = await Member.find({ zone: zone._id });
        const totalPeople = members.reduce(
          (sum, member) => sum + 1 + (member.familyMembers?.length || 0),
          0
        );
        return {
          ...zone.toObject(),
          totalPeople
        };
      })
    );

    res.json(zonesWithCount);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// 🔹 ADMIN: Update zone
router.put('/:id', auth, async (req, res) => {
  try {
    const { number, name } = req.body;
    const updatedZone = await Zone.findByIdAndUpdate(
      req.params.id,
      { number, name },
      { new: true, runValidators: true }
    );
    if (!updatedZone) {
      return res.status(404).json({ error: 'Zone not found' });
    }
    res.json(updatedZone);
  } catch (err) {
    console.error(err);
    if (err.code === 11000 && err.keyPattern?.number) {
      return res.status(400).json({ error: 'Zone number already exists' });
    }
    res.status(500).json({ error: 'Server error' });
  }
});

// 🔹 ADMIN: Delete zone
router.delete('/:id', auth, async (req, res) => {
  try {
    const members = await Member.find({ zone: req.params.id });
    if (members.length > 0) {
      return res.status(400).json({
        error: 'Cannot delete zone with assigned members'
      });
    }
    await Zone.findByIdAndDelete(req.params.id);
    res.json({ message: 'Zone deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// 🔹 ADMIN: Get only head names in a specific zone
router.get('/:id/people', auth, async (req, res) => {
  try {
    const heads = await Member.find({ zone: req.params.id }, '_id headName');
    res.json(heads.map(h => ({ _id: h._id, name: h.headName })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
