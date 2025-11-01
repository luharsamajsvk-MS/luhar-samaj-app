const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Member = require('../models/Member');
const Zone = require('../models/Zone');

// 🔹 Helper: compute zone distribution with aggregation
// This is used by your /zones-distribution route
async function getZoneDistribution() {
  return Member.aggregate([
    // 🔻 --- FIX 1: Filter out deleted members --- 🔻
    {
      $match: { isDeleted: { $ne: true } }
    },
    // 🔺 --- END FIX --- 🔺
    {
      $group: {
        _id: "$zone",
        // This helper still counts head + family, as it's a separate route
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
    // 🔻 --- FIX 2: Filtered total member (family) count --- 🔻
    const totalMembers = await Member.countDocuments({ isDeleted: { $ne: true } });
    // 🔺 --- END FIX --- 🔺
    const totalZones = await Zone.countDocuments();

    // Single aggregation for all other stats
    const statsAgg = await Member.aggregate([
    // 🔻 --- FIX 3: Filter out deleted members at the start --- 🔻
      {
        $match: { isDeleted: { $ne: true } }
      },
    // 🔺 --- END FIX --- 🔺
      { 
        $addFields: {
          // Create a single array of ONLY family members (as requested)
          allPeople: { 
            $ifNull: ["$familyMembers", []]
          }
        }
      },
      {
        $facet: {
          // Pipeline 1: Get counts for male, female (from family members)
          "genderCounts": [
            { $unwind: "$allPeople" },
            { 
              $group: {
                _id: "$allPeople.gender",
                count: { $sum: 1 }
              }
            }
          ],
          // Pipeline 2: Get total people count (from family members)
          "totalPeopleCount": [
            { $unwind: "$allPeople" },
            { $count: "count" }
          ],
          // Pipeline 3: Get zone distribution (from family members)
          "zoneDistribution": [
            {
              $group: {
                _id: "$zone",
                totalPeople: { $sum: { $size: "$allPeople" } }
              }
            },
            { $lookup: { from: "zones", localField: "_id", foreignField: "_id", as: "zone" } },
            { $unwind: { path: "$zone", preserveNullAndEmptyArrays: true } },
            { 
              $project: { 
                _id: 0,
                name: { $ifNull: ["$zone.name", "Unknown"] }, 
                totalPeople: 1 
              }
            }
          ]
        }
      }
    ]);

    // --- Process the results from the $facet pipeline ---
    const results = statsAgg[0];

    let totalMales = 0;
    let totalFemales = 0;
    results.genderCounts.forEach(group => {
      if (group._id === 'male') {
        totalMales = group.count;
      } else if (group._id === 'female') {
        totalFemales = group.count;
      }
    });
    
    const totalPeople = results.totalPeopleCount[0]?.count || 0;
    const zoneDistribution = results.zoneDistribution; 

    // Send the final JSON response
    res.json({
      totalMembers, // Total *active* families
      totalPeople,  // Total people from *active* familyMembers
      totalZones,
      totalMales,     // Total males from *active* familyMembers
      totalFemales,   // Total females from *active* familyMembers
      zoneDistribution // Zone distribution based on *active* familyMembers
  });

  } catch (err) {
    console.error('Dashboard fetch error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Separate API: People distribution by zone (from your original code)
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