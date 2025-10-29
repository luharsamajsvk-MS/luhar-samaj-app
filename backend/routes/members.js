const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const Member = require("../models/Member");
const Zone = require("../models/Zone");
const mongoose = require("mongoose");
const { createAudit } = require("../services/auditService"); 
const { generateCard } = require("../services/pdf-service");

// ----------------- Helper Functions -----------------
// ... (keep all helper functions: toDateOrNull, calcAgeFromDOB, normalizeFamilyMembers, sendHtmlResponse)
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

function sendHtmlResponse(res, statusCode, title, bodyContent) {
  const html = `
    <!DOCTYPE html>
    <html lang="gu">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title}</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          display: grid;
          place-items: center;
          min-height: 90vh;
          background-color: #f4f7f6;
          margin: 0;
          color: #333;
        }
        .card {
          background-color: #ffffff;
          border-radius: 12px;
          box-shadow: 0 6px 16px rgba(0, 0, 0, 0.07);
          padding: 2rem;
          max-width: 450px;
          width: 90%;
          text-align: center;
          border-top: 8px solid;
        }
        .card.success { border-color: #28a745; }
        .card.error { border-color: #dc3545; }
        h2 {
          font-size: 1.75rem;
          margin-top: 0;
          font-weight: 600;
        }
        .card.success h2 { color: #28a745; }
        .card.error h2 { color: #dc3545; }
        p {
          font-size: 1.1rem;
          line-height: 1.6;
          margin: 1rem 0;
        }
        .data-item {
          font-weight: 500;
          color: #555;
        }
        .data-item strong {
          color: #000;
        }
      </style>
    </head>
    <body>
      ${bodyContent}
    </body>
    </html>
  `;
  res.status(statusCode).type("html").send(html);
}
// ----------------- Routes -----------------

// GET all (active) members
router.get("/", auth, async (req, res) => {
  try {
    const members = await Member.find({ isDeleted: { $ne: true } }) // ✅ MODIFIED
      .populate("zone")
      .populate("createdBy", "name email");
    res.json(members);
  } catch (err) {
    console.error("GET /members error:", err);
    res.status(500).json({ error: "Failed to fetch members" });
  }
});

// ✅ --- NEW ROUTE: GET all DELETED members ---
router.get("/deleted", auth, async (req, res) => {
  try {
    const members = await Member.find({ isDeleted: true }) // ✅ NEW
      .populate("zone")
      .populate("createdBy", "name email");
    res.json(members);
  } catch (err) {
    console.error("GET /members/deleted error:", err);
    res.status(500).json({ error: "Failed to fetch deleted members" });
  }
});


// CREATE member
router.post("/", auth, async (req, res) => {
  try {
    const {
      head, 
      rationNo,
      uniqueNumber,
      address,
      city,
      mobile,
      additionalMobiles, 
      pincode,
      zone,
      familyMembers,
      issueDate 
    } = req.body;

    // Validate zone
    const zoneDoc = await Zone.findById(zone);
    if (!zoneDoc) return res.status(400).json({ error: "Invalid zone ID" });

    // Validate uniqueNumber
    let parsedUnique = null;
    if (uniqueNumber) {
        parsedUnique = parseInt(uniqueNumber, 10);
        // ✅ MODIFIED: Check only against non-deleted members
        const existing = await Member.findOne({ uniqueNumber: parsedUnique, isDeleted: { $ne: true } });
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
        age: calcAgeFromDOB(headBirthdate),
      },
      rationNo,
      uniqueNumber: parsedUnique,
      address,
      city, 
      mobile,
      additionalMobiles: additionalMobiles || [],
      pincode,
      zone,
      familyMembers: normalizeFamilyMembers(familyMembers),
      createdBy: req.user?.id,
      issueDate: toDateOrNull(issueDate) || new Date(), 
      isDeleted: false, // Explicitly set
    });

    await member.save();

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

    // ✅ MODIFIED: Ensure we are not updating a deleted member
    const beforeUpdate = await Member.findOne({ _id: id, isDeleted: { $ne: true } }).lean();
    if (!beforeUpdate) return res.status(404).json({ error: "Member not found or has been deleted" });

    const {
      head,
      familyMembers,
    } = req.body;

    const updateData = { ...req.body }; 
    
    if (head && head.birthdate) {
        const headBirthdate = toDateOrNull(head.birthdate);
        updateData.head.age = calcAgeFromDOB(headBirthdate);
    }
    
    if (familyMembers) {
        updateData.familyMembers = normalizeFamilyMembers(familyMembers);
    }

    if (updateData.hasOwnProperty('issueDate')) {
        updateData.issueDate = toDateOrNull(updateData.issueDate);
    }
    
    // Ensure isDeleted is not accidentally modified here
    delete updateData.isDeleted;
    delete updateData.deletedAt;

    const updatedMember = await Member.findByIdAndUpdate(id, updateData, { new: true });

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

// ✅ MODIFIED: SOFT DELETE member
router.delete("/:id", auth, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id))
      return res.status(400).json({ error: "Invalid member ID format" });

    const beforeDelete = await Member.findById(id).lean();
    if (!beforeDelete || beforeDelete.isDeleted) {
        return res.status(404).json({ error: "Member not found" });
    }

    // ✅ MODIFIED: Perform soft delete instead of permanent delete
    const softDeletedMember = await Member.findByIdAndUpdate(
        id, 
        { isDeleted: true, deletedAt: new Date() },
        { new: true }
    );

    await createAudit({
      action: "delete", // The action is still 'delete' from the user's perspective
      entityType: "Member",
      entityId: id,
      memberId: id,
      before: beforeDelete,
      after: softDeletedMember.toObject(), // Log the state *after* soft delete
      req,
    });

    res.json({ message: "Member deleted successfully" });
  } catch (err) {
    console.error("DELETE /members/:id error:", err);
    res.status(500).json({ error: "Failed to delete member" });
  }
});

// ✅ --- NEW ROUTE: RESTORE a deleted member ---
router.post("/:id/restore", auth, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id))
      return res.status(400).json({ error: "Invalid member ID format" });

    const beforeRestore = await Member.findById(id).lean();
    if (!beforeRestore) return res.status(404).json({ error: "Member not found" });
    if (!beforeRestore.isDeleted) return res.status(400).json({ error: "Member is not deleted" });
    
    // ✅ MODIFIED: Check for uniqueNumber conflicts before restoring
    if (beforeRestore.uniqueNumber) {
        const existing = await Member.findOne({
            uniqueNumber: beforeRestore.uniqueNumber,
            isDeleted: { $ne: true },
            _id: { $ne: id }
        });
        if (existing) {
            return res.status(400).json({ error: `Cannot restore: Unique Number ${beforeRestore.uniqueNumber} is now assigned to another active member.` });
        }
    }

    const restoredMember = await Member.findByIdAndUpdate(
      id,
      { isDeleted: false, deletedAt: null },
      { new: true }
    );

    await createAudit({
      action: "restore",
      entityType: "Member",
      entityId: id,
      memberId: id,
      before: beforeRestore,
      after: restoredMember.toObject(),
      req,
    });

    res.json({ message: "Member restored successfully" });

  } catch (err) {
    console.error("POST /members/:id/restore error:", err);
    res.status(500).json({ error: err.message || "Failed to restore member" });
  }
});


// ✅ UPDATED VERIFY ROUTE
router.get("/verify/:id", async (req, res) => {
  try {
    const { id } = req.params;
    let query = [];

    // ✅ MODIFIED: All queries must also check that member is not deleted
    if (!isNaN(parseInt(id, 10))) {
      query.push({ uniqueNumber: parseInt(id, 10), isDeleted: { $ne: true } });
    }
    if (mongoose.Types.ObjectId.isValid(id)) {
      query.push({ _id: id, isDeleted: { $ne: true } });
    }
    
    if (query.length === 0) {
      // ... (error handling as before)
      const errorData = { valid: false, message: "Invalid identifier provided." };
      if (req.accepts("html")) {
        const body = `...`; // HTML error
        return sendHtmlResponse(res, 400, "અમાન્ય આઈડી", body);
      } else {
        return res.status(400).json(errorData);
      }
    }

    const member = await Member.findOne({ $or: query }).populate("zone");

    if (!member) { // This now correctly handles 'not found' or 'is deleted'
      const errorData = { valid: false, message: "આ સભ્ય કાર્ડ અમાન્ય છે" };
      
      if (req.accepts("html")) {
         const body = `...`; // HTML error
        return sendHtmlResponse(res, 404, "અમાન્ય કાર્ડ", body);
      } else {
        return res.status(404).json(errorData);
      }
    }

    // ... (success response as before)
    const issueDate = member.issueDate
      ? member.issueDate.toISOString().split("T")[0]
      : "N/A";
      
    const successData = {
      valid: true,
      message: "આ સભ્ય કાર્ડ માન્ય છે",
      trust: "લુહાર સમાજ સાવરકુંડલા ટ્રસ્ટ રજી નં. ૧૧૪૫ એ",
      dateOfIssue: issueDate,
      સભ્યનં: member.uniqueNumber,
    };
    
    if (req.accepts("html")) {
      const body = `...`; // HTML success
      return sendHtmlResponse(res, 200, "માન્ય કાર્ડ", body);
    } else {
      return res.json(successData);
    }

  } catch (err) {
    // ... (catch block as before)
    console.error("QR verify error:", err);
    const errorData = { valid: false, message: "સર્વર ભૂલ" };
    if (req.accepts("html")) {
        const body = `...`; // HTML error
        return sendHtmlResponse(res, 500, "સર્વર ભૂલ", body);
    } else {
        return res.status(500).json(errorData);
    }
  }
});

// GENERATE PDF
router.get("/:id/pdf", auth, async (req, res) => {
  try {
    // ✅ MODIFIED: Check if member is deleted
    const member = await Member.findById(req.params.id);
    if (!member || member.isDeleted) {
        return res.status(404).json({ error: "Member not found or has been deleted" });
    }

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