const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const Member = require("../models/Member");
const Zone = require("../models/Zone");
const mongoose = require("mongoose");
const { createAudit } = require("../services/auditService"); // ✅ Import audit service
const { generateCard } = require("../services/pdf-service");

// ----------------- Helper Functions -----------------
// (These helpers are kept as they are still useful for data cleaning)
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

// ----------------- Routes -----------------

// GET all members
router.get("/", auth, async (req, res) => {
  try {
    const members = await Member.find()
      .populate("zone")
      .populate("createdBy", "name email");
    res.json(members);
  } catch (err) {
    console.error("GET /members error:", err);
    res.status(500).json({ error: "Failed to fetch members" });
  }
});

// CREATE member
router.post("/", auth, async (req, res) => {
  try {
    const {
      head, // object with name, birthdate, gender
      rationNo,
      uniqueNumber,
      address,
      mobile,
      additionalMobiles, // ✅ Aligned with new schema
      pincode,
      zone,
      familyMembers,
    } = req.body;

    // Validate zone
    const zoneDoc = await Zone.findById(zone);
    if (!zoneDoc) return res.status(400).json({ error: "Invalid zone ID" });

    // Validate uniqueNumber
    let parsedUnique = null;
    if (uniqueNumber) {
        parsedUnique = parseInt(uniqueNumber, 10);
        const existing = await Member.findOne({ uniqueNumber: parsedUnique });
        if (existing) {
            return res.status(400).json({ error: `Unique Number ${parsedUnique} is already assigned.` });
        }
    }
    
    const headBirthdate = toDateOrNull(head.birthdate);

    const member = new Member({
      head: {
        name: head.name,
        birthdate: headBirthdate,
        gender: head.gender,
        age: calcAgeFromDOB(headBirthdate), // ✅ Auto-calculate age
      },
      rationNo,
      uniqueNumber: parsedUnique,
      address,
      mobile,
      additionalMobiles: additionalMobiles || [],
      pincode,
      zone,
      familyMembers: normalizeFamilyMembers(familyMembers),
      createdBy: req.user?.id,
      issueDate: new Date(),
    });

    await member.save();

    // ✅ Create audit log for creation
    await createAudit({
      action: "create",
      entityType: "Member",
      entityId: member._id,
      memberId: member._id,
      after: member.toObject(),
      req,
    });

    const populated = await Member.findById(member._id).populate("zone");
    res.status(201).json({ member: populated });
  } catch (err) {
    console.error("POST /members error:", err);
    res.status(400).json({ error: err.message || "Failed to create member" });
  }
});

// UPDATE member
router.put("/:id", auth, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id))
      return res.status(400).json({ error: "Invalid member ID format" });

    // ✅ Capture state *before* update for audit log
    const beforeUpdate = await Member.findById(id).lean();
    if (!beforeUpdate) return res.status(404).json({ error: "Member not found" });

    const {
      head,
      rationNo,
      uniqueNumber,
      address,
      mobile,
      additionalMobiles,
      pincode,
      zone,
      familyMembers,
    } = req.body;

    const updateData = { ...req.body };
    
    // Recalculate age if birthdate changes
    if (head && head.birthdate) {
        const headBirthdate = toDateOrNull(head.birthdate);
        updateData.head.age = calcAgeFromDOB(headBirthdate);
    }
    
    // Re-normalize family members
    if (familyMembers) {
        updateData.familyMembers = normalizeFamilyMembers(familyMembers);
    }

    const updatedMember = await Member.findByIdAndUpdate(id, updateData, { new: true });

    // ✅ Create audit log for update
    await createAudit({
      action: "update",
      entityType: "Member",
      entityId: id,
      memberId: id,
      before: beforeUpdate,
      after: updatedMember.toObject(),
      req,
    });

    const populated = await Member.findById(id).populate("zone");
    res.json({ member: populated });
  } catch (err) {
    console.error("PUT /members/:id error:", err);
    res.status(400).json({ error: err.message || "Failed to update member" });
  }
});

// DELETE member
router.delete("/:id", auth, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id))
      return res.status(400).json({ error: "Invalid member ID format" });

    // ✅ Capture state *before* delete for audit log
    const beforeDelete = await Member.findById(id).lean();
    if (!beforeDelete) return res.status(404).json({ error: "Member not found" });

    await Member.findByIdAndDelete(id);

    // ✅ Create audit log for deletion
    await createAudit({
      action: "delete",
      entityType: "Member",
      entityId: id,
      memberId: id,
      before: beforeDelete,
      req,
    });

    res.json({ message: "Member deleted successfully" });
  } catch (err) {
    console.error("DELETE /members/:id error:", err);
    res.status(500).json({ error: "Failed to delete member" });
  }
});


// VERIFY member card
router.get("/verify/:id", async (req, res) => {
  try {
    const { id } = req.params;
    let query = [];

    if (!isNaN(parseInt(id, 10))) {
      query.push({ uniqueNumber: parseInt(id, 10) });
    }
    if (mongoose.Types.ObjectId.isValid(id)) query.push({ _id: id });
    
    if (query.length === 0) {
        return res.status(400).json({ valid: false, message: "Invalid identifier provided." });
    }

    const member = await Member.findOne({ $or: query }).populate("zone");

    if (!member) {
      return res
        .status(404)
        .json({ valid: false, message: "આ સભ્ય કાર્ડ અમાન્ય છે" });
    }

    res.json({
      valid: true,
      message: "આ સભ્ય કાર્ડ માન્ય છે",
      trust: "લુહાર સમાજ સાવરકુંડલા ટ્રસ્ટ રજી નં. ૧૧૪૫ એ",
      dateOfIssue: member.issueDate
        ? member.issueDate.toISOString().split("T")[0]
        : null,
      સભ્યનં: member.uniqueNumber,
    });
  } catch (err) {
    console.error("QR verify error:", err);
    res.status(500).json({ valid: false, message: "સર્વર ભૂલ" });
  }
});

// GENERATE PDF
router.get("/:id/pdf", auth, async (req, res) => {
  try {
    const pdfBuffer = await generateCard(req.params.id);
    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": "inline",
    });
    res.send(pdfBuffer);
  } catch (err) {
    console.error("PDF generation error:", err);
    res.status(500).json({ error: err.message || "Failed to generate PDF" });
  }
});

module.exports = router;