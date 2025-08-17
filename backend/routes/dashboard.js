// backend/routes/dashboard.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Member = require('../models/Member');
const Zone = require('../models/Zone');

// Main Dashboard Data
router.get('/', auth, async (req, res) => {
  try {
    const totalMembers = await Member.countDocuments();

    // Count family members
    const totalPeopleAgg = await Member.aggregate([
      { $match: { familyMembers: { $exists: true, $type: 'array' } } },
      { $unwind: '$familyMembers' },
      { $count: 'count' }
    ]);

    const totalZones = await Zone.countDocuments();

    // Zone distribution (total people per zone)
    const zones = await Zone.find().lean();
    const zoneDistribution = await Promise.all(
      zones.map(async (zone) => {
        const members = await Member.find({ zone: zone._id });
        const totalPeople = members.reduce(
          (sum, member) => sum + 1 + (member.familyMembers?.length || 0),
          0
        );

        return {
          name: zone.name,
          totalPeople
        };
      })
    );

    res.json({
      totalMembers,
      totalPeople: totalMembers + (totalPeopleAgg[0]?.count || 0),
      totalZones,
      zoneDistribution
    });
  } catch (err) {
    console.error('Dashboard fetch error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Separate API: People distribution by zone
router.get('/zones-distribution', auth, async (req, res) => {
  try {
    const zones = await Zone.find().lean();

    const data = await Promise.all(
      zones.map(async (zone) => {
        const members = await Member.find({ zone: zone._id });
        const totalPeople = members.reduce(
          (sum, member) => sum + 1 + (member.familyMembers?.length || 0),
          0
        );

        return {
          name: zone.name,
          totalPeople
        };
      })
    );

    res.json(data);
  } catch (err) {
    console.error('Error fetching zone distribution:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
