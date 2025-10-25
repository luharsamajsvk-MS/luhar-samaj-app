const express = require('express');
const router = express.Router(); // <--- FIX 1: Defines the router
const auth = require('../middleware/auth');
const Member = require('../models/Member');
const Zone = require('../models/Zone');

// 🔹 Helper: compute zone distribution with aggregation
// This is used by your /zones-distribution route
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
// FIX 2: This route uses the efficient aggregation for all stats
router.get('/', auth, async (req, res) => {
  try {
    // These two counts are fast
    const totalMembers = await Member.countDocuments(); // Total families
    const totalZones = await Zone.countDocuments();

    // Single aggregation for all other stats
    const statsAgg = await Member.aggregate([
      { 
        $addFields: {
          // Create a single array of all people (head + family)
          allPeople: { 
            $concatArrays: [ 
              ["$head"], // Put head in its own array
              { $ifNull: ["$familyMembers", []] } // Add the family members
            ] 
          }
        }
      },
      {
        $facet: {
          // Pipeline 1: Get counts for male, female
          "genderCounts": [
            { $unwind: "$allPeople" }, // Create one doc per person
            { 
              $group: {
                _id: "$allPeople.gender", // Group by 'male' or 'female'
                count: { $sum: 1 }
              }
            }
          ],
          // Pipeline 2: Get total people count
          "totalPeopleCount": [
            { $unwind: "$allPeople" },
            { $count: "count" }
          ],
          // Pipeline 3: Get zone distribution
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
// If a member has no zone, label it 'Unknown'
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
    // FIX 3: Removed the 'a' typo from this line
    const zoneDistribution = results.zoneDistribution; 

    // Send the final JSON response
    res.json({
      totalMembers, // Total families
      totalPeople,
      totalZones,
      totalMales,
      totalFemales,
      zoneDistribution
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