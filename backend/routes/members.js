const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const Member = require("../models/Member");
const Zone = require("../models/Zone");
const mongoose = require("mongoose");
const { createAudit } = require("../services/auditService"); 
const { generateCard } = require("../services/pdf-service");

// ----------------- Helper Functions -----------------
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

// ✅ NEW HTML HELPER FUNCTION
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

    const beforeUpdate = await Member.findById(id).lean();
    if (!beforeUpdate) return res.status(404).json({ error: "Member not found" });

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

// DELETE member
router.delete("/:id", auth, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id))
      return res.status(400).json({ error: "Invalid member ID format" });

    const beforeDelete = await Member.findById(id).lean();
    if (!beforeDelete) return res.status(404).json({ error: "Member not found" });

    await Member.findByIdAndDelete(id);

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


// ✅ UPDATED VERIFY ROUTE
router.get("/verify/:id", async (req, res) => {
  try {
    const { id } = req.params;
    let query = [];

    if (!isNaN(parseInt(id, 10))) {
      query.push({ uniqueNumber: parseInt(id, 10) });
    }
    if (mongoose.Types.ObjectId.isValid(id)) {
      query.push({ _id: id });
    }
    
    if (query.length === 0) {
      const errorData = { valid: false, message: "Invalid identifier provided." };
      
      // CHECKING ACCEPT HEADER
      if (req.accepts("html")) {
        const body = `
          <div class="card error">
            <h2>❌ અમાન્ય આઈડી</h2>
            <p>તમે જે આઈડી દાખલ કરી છે તે અમાન્ય છે.</p>
          </div>`;
        return sendHtmlResponse(res, 400, "અમાન્ય આઈડી", body);
      } else {
        return res.status(400).json(errorData);
      }
    }

    const member = await Member.findOne({ $or: query }).populate("zone");

    if (!member) {
      const errorData = { valid: false, message: "આ સભ્ય કાર્ડ અમાન્ય છે" };
      
      // CHECKING ACCEPT HEADER
      if (req.accepts("html")) {
        const body = `
          <div class="card error">
            <h2>❌ કાર્ડ મળ્યું નથી</h2>
            <p>${errorData.message}</p>
          </div>`;
        return sendHtmlResponse(res, 404, "અમાન્ય કાર્ડ", body);
      } else {
        return res.status(404).json(errorData);
      }
    }

    // PREPARE SUCCESS DATA
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
    
    // CHECKING ACCEPT HEADER
    if (req.accepts("html")) {
      const body = `
        <div class="card success">
          <h2>✅ ${successData.message}</h2>
          <p>${successData.trust}</p>
          <hr style="border:0; border-top:1px solid #eee; margin: 1.5rem 0;">
          <p class="data-item"><strong>સભ્યનં:</strong> ${successData.સભ્યનં}</p>
          <p class="data-item"><strong>ઇશ્યુ તારીખ:</strong> ${successData.dateOfIssue}</p>
        </div>`;
      return sendHtmlResponse(res, 200, "માન્ય કાર્ડ", body);
    } else {
      return res.json(successData);
    }

  } catch (err) {
    console.error("QR verify error:", err);
    const errorData = { valid: false, message: "સર્વર ભૂલ" };
    
    // CHECKING ACCEPT HEADER
    if (req.accepts("html")) {
        const body = `
          <div class="card error">
            <h2>❌ સર્વર ભૂલ</h2>
            <p>ચકાસણી કરતી વખતે એક ભૂલ આવી. કૃપા કરી ફરી પ્રયાસ કરો.</p>
          </div>`;
        return sendHtmlResponse(res, 500, "સર્વર ભૂલ", body);
    } else {
        return res.status(500).json(errorData);
    }
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