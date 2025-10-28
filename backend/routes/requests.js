// backend/routes/requests.js
const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const Request = require("../models/Request");
const Member = require("../models/Member");
const Zone = require("../models/Zone");
const { createAudit } = require("../services/auditService");

// --- Helper Functions (from members.js, for data cleaning) ---
function toDateOrNull(v) {
  if (!v) return null;
  try {
    const d = v instanceof Date ? v : new Date(v);
    return isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
}

function calcAgeFromDOB(dob) {
  if (!(dob instanceof Date) || isNaN(dob.getTime())) return undefined;
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
  return age;
}

function normalizeFamilyMembers(input) {
  if (!Array.isArray(input)) return [];
  return input
    .filter((f) => f && (f.name || f.relation || f.birthdate || f.gender || f.age))
    .map((f) => {
      const birthdate = toDateOrNull(f.birthdate);
      const age =
        typeof f.age === "number"
          ? f.age
          : typeof f.age === "string" && f.age.trim() !== "" && !isNaN(Number(f.age))
          ? Number(f.age)
          : calcAgeFromDOB(birthdate);
      const gender =
        f.gender && ["male", "female", "other"].includes(String(f.gender).toLowerCase())
          ? String(f.gender).toLowerCase()
          : undefined;
      return {
        name: f.name || "",
        relation: f.relation || "",
        birthdate: birthdate || undefined,
        gender,
        age,
      };
    });
}

/*
 * @route   POST api/requests
 * @desc    Submit a new member registration request (Public)
 * @access  Public
 */
router.post("/", async (req, res) => {
  try {
    const {
      head,
      rationNo,
      address,
      city, // ✅ ADDED
      mobile,
      additionalMobiles, // ✅ ADDED
      pincode,
      zone,
      familyMembers,
    } = req.body;

    // Validate Zone
    const zoneDoc = await Zone.findById(zone);
    if (!zoneDoc) {
      return res.status(400).json({ error: "Invalid zone ID selected." });
    }
    
    // Validate Head
    if (!head || !head.name || !head.birthdate || !head.gender) {
         return res.status(400).json({ error: "Head member details are incomplete." });
    }
    
    const headBirthdate = toDateOrNull(head.birthdate);
    if (!headBirthdate) {
        return res.status(400).json({ error: "Invalid head birthdate." });
    }

    const newRequest = new Request({
      head: {
        name: head.name,
        birthdate: headBirthdate,
        gender: head.gender,
        age: calcAgeFromDOB(headBirthdate),
      },
      rationNo,
      address,
      city, // ✅ ADDED
      mobile,
      additionalMobiles: additionalMobiles || [], // ✅ ADDED
      pincode,
      zone,
      familyMembers: normalizeFamilyMembers(familyMembers), // Clean data
      status: "pending",
    });

    await newRequest.save();
    res.status(201).json({ message: "Request submitted successfully." });
  } catch (err) {
    console.error("POST /requests error:", err);
    res.status(400).json({ error: err.message || "Failed to submit request." });
  }
});

/*
 * @route   GET api/requests
 * @desc    Get all requests (Admin)
 * @access  Private (Auth)
 */
router.get("/", auth, async (req, res) => {
  try {
    const requests = await Request.find()
      .populate("zone", "name number")
      .sort({ createdAt: -1 });
    res.json(requests);
  } catch (err) {
    console.error("GET /requests error:", err);
    res.status(500).json({ error: "Failed to fetch requests." });
  }
});

/*
 * @route   POST api/requests/:id/approve
 * @desc    Approve a request and create a member (Admin)
 * @access  Private (Auth)
 */
router.post("/:id/approve", auth, async (req, res) => {
  const { uniqueNumber } = req.body;
  if (!uniqueNumber) {
    return res.status(400).json({ error: "Unique Number (સભ્ય નંબર) is required." });
  }

  try {
    const request = await Request.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ error: "Request not found." });
    }
    if (request.status === "approved") {
      return res.status(400).json({ error: "Request already approved." });
    }

    // Check if unique number is already taken
    const existingMember = await Member.findOne({ uniqueNumber });
    if (existingMember) {
      return res.status(400).json({ error: `Unique Number ${uniqueNumber} is already assigned.` });
    }

    // ✅ Create a new Member by copying the data directly
    // This is much cleaner now!
    const newMember = new Member({
      head: request.head,
      rationNo: request.rationNo,
      uniqueNumber: uniqueNumber,
      address: request.address,
      city: request.city, // ✅ ADDED
      mobile: request.mobile,
      additionalMobiles: request.additionalMobiles, // ✅ ADDED
      pincode: request.pincode,
      zone: request.zone,
      familyMembers: request.familyMembers,
      createdBy: req.user?.id,
      issueDate: new Date(), // Set issue date to now (can be edited later)
    });

    await newMember.save();

    // Update request status
    request.status = "approved";
    await request.save();

    // Create Audit Log
    await createAudit({
      action: "approve_request",
      entityType: "Member",
      entityId: newMember._id,
      memberId: newMember._id, // Link to the new member
      after: newMember.toObject(),
      notes: `Approved from request ${request._id}`,
      req,
    });

    res.status(201).json({ message: "Member created successfully.", member: newMember });
  } catch (err) {
    console.error("POST /requests/:id/approve error:", err);
    res.status(500).json({ error: err.message || "Failed to approve request." });
  }
});

/*
 * @route   DELETE api/requests/:id
 * @desc    Decline (delete) a request (Admin)
 * @access  Private (Auth)
 */
router.delete("/:id", auth, async (req, res) => {
  try {
    const request = await Request.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ error: "Request not found." });
    }

    // Instead of deleting, we set status to 'rejected'
    // If you truly want to delete, use:
    // await Request.findByIdAndDelete(req.params.id);
    
    request.status = "rejected";
    // you could add notes: request.reviewNotes = req.body.notes || "Rejected by admin";
    await request.save();


    res.json({ message: "Request rejected successfully." });
  } catch (err) {
    console.error("DELETE /requests/:id error:", err);
    res.status(500).json({ error: "Failed to reject request." });
  }
});

module.exports = router;