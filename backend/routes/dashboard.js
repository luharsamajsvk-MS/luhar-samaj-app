const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Member = require('../models/Member');
const Zone = require('../models/Zone');

// 🔹 Helper: compute zone distribution with aggregation
async function getZoneDistribution() {
  return Member.aggregate([
    {
      $group: {
        _id: "$zone",
        totalPeople: {
          $sum: { $add: [1, { $size: { $ifNull: ["$familyMembers", []] } }] }
        }
      }
    },
    {
      $lookup: {
        from: "zones",
        localField: "_id",
        foreignField: "_id",
        as: "zone"
      }
    },
    { $unwind: "$zone" },
    {
      $project: {
        _id: 0,
        name: "$zone.name",
        totalPeople: 1
      }
    }
  ]);
}

// Main Dashboard Data
router.get('/', auth, async (req, res) => {
  try {
    const totalMembers = await Member.countDocuments();

    // Count family members only
    const totalFamilyAgg = await Member.aggregate([
      { $project: { familySize: { $size: { $ifNull: ["$familyMembers", []] } } } },
      { $group: { _id: null, count: { $sum: "$familySize" } } }
    ]);

    const totalZones = await Zone.countDocuments();
    const zoneDistribution = await getZoneDistribution();

    res.json({
      totalMembers,
      totalPeople: totalMembers + (totalFamilyAgg[0]?.count || 0),
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
    const data = await getZoneDistribution();
    res.json(data);
  } catch (err) {
    console.error('Error fetching zone distribution:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
