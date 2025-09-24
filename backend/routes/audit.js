const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const AuditLog = require("../models/AuditLog");
const mongoose = require("mongoose");

// --- Helper Functions ---

const validatePaginationParams = (page, limit) => {
  const pageNum = Math.max(1, parseInt(page) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 25)); // Cap at 100, default 25
  return { pageNum, limitNum };
};

const validateDateRange = (startDate, endDate) => {
  const start = startDate ? new Date(startDate) : null;
  const end = endDate ? new Date(endDate) : null;
  if (start && isNaN(start.getTime())) throw new Error("Invalid start date format");
  if (end && isNaN(end.getTime())) throw new Error("Invalid end date format");
  if (start && end && start > end) throw new Error("Start date cannot be after end date");
  return { start, end };
};

// ✅ Helper to format the 'changes' array for CSV export
const formatChangesForCSV = (changes) => {
    if (!changes || changes.length === 0) return "No detailed changes.";
    // Create a simple string summary of changes
    const summary = changes.map(c => `[${c.field}: "${c.before}" -> "${c.after}"]`).join('; ');
    // Escape double quotes for CSV
    return summary.replace(/"/g, '""');
};


// --- API Routes ---

/**
 * GET all audit logs with pagination and filtering
 */
router.get("/", auth, async (req, res) => {
  try {
    const { page = 1, limit = 25, entityType, action, userId, startDate, endDate, search } = req.query;

    const { pageNum, limitNum } = validatePaginationParams(page, limit);
    const { start, end } = validateDateRange(startDate, endDate);

    const filter = {};
    if (entityType) filter.entityType = entityType;
    if (action) filter.action = action;
    if (userId && mongoose.Types.ObjectId.isValid(userId)) filter["user.id"] = userId;
    
    if (start || end) {
      filter.timestamp = {};
      if (start) filter.timestamp.$gte = start;
      if (end) filter.timestamp.$lte = end;
    }

    // ✅ Updated search logic to query correct fields
    if (search) {
        const searchRegExp = new RegExp(search, 'i');
        filter.$or = [
            { "user.name": searchRegExp },
            { "user.email": searchRegExp },
            { "action": searchRegExp },
            { "entityType": searchRegExp }
        ];
        // If the search term is a number, also search the auditNumber
        if (!isNaN(parseInt(search, 10))) {
            filter.$or.push({ auditNumber: parseInt(search, 10) });
        }
    }

    const skip = (pageNum - 1) * limitNum;
    const [logs, total] = await Promise.all([
      AuditLog.find(filter)
        .populate("memberId", "head.name uniqueNumber") // Populates member info
        .populate("user.id", "name email") // Populates user who made the change
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      AuditLog.countDocuments(filter)
    ]);

    res.json({
      logs,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(total / limitNum),
        totalLogs: total,
      }
    });
  } catch (err) {
    console.error("GET /audit error:", err);
    res.status(err.message.includes("Invalid") ? 400 : 500).json({ 
      error: err.message || "Failed to fetch audit logs" 
    });
  }
});


/**
 * GET audit logs for a specific member
 */
router.get("/member/:memberId", auth, async (req, res) => {
  try {
    const { memberId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(memberId)) {
      return res.status(400).json({ error: "Invalid member ID format" });
    }

    const logs = await AuditLog.find({ memberId })
      .populate("user.id", "name email")
      .sort({ timestamp: -1 })
      .lean();

    res.json(logs);
  } catch (err) {
    console.error(`GET /audit/member/${req.params.memberId} error:`, err);
    res.status(500).json({ error: "Failed to fetch member audit logs" });
  }
});

/**
 * GET audit logs export (CSV or JSON format)
 */
router.get("/export", auth, async (req, res) => {
  try {
    const { entityType, action, userId, startDate, endDate, format = "json" } = req.query;

    // Build filter object (same as main GET route)
    const filter = {};
    if (entityType) filter.entityType = entityType;
    if (action) filter.action = action;
    if (userId && mongoose.Types.ObjectId.isValid(userId)) filter["user.id"] = userId;
    const { start, end } = validateDateRange(startDate, endDate);
    if (start || end) {
      filter.timestamp = {};
      if (start) filter.timestamp.$gte = start;
      if (end) filter.timestamp.$lte = end;
    }

    const logs = await AuditLog.find(filter)
      .populate("memberId", "head.name uniqueNumber")
      .populate("user.id", "name email")
      .sort({ timestamp: -1 })
      .lean();

    if (format.toLowerCase() === "csv") {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="audit_logs.csv"');
      
      // ✅ Updated CSV conversion to use correct fields and formatter
      const csvHeader = "Audit Number,Timestamp,Action,Entity,User,Member Name,Member Number,Changes Summary\n";
      const csvData = logs.map(log => [
        log.auditNumber,
        log.timestamp.toISOString(),
        log.action,
        log.entityType,
        log.user?.name || 'N/A',
        log.memberId?.head?.name || 'N/A',
        log.memberId?.uniqueNumber || 'N/A',
        `"${formatChangesForCSV(log.changes)}"` // Quote the summary
      ].join(",")).join("\n");
      
      res.send(csvHeader + csvData);
    } else {
      res.json(logs);
    }
  } catch (err) {
    console.error("GET /audit/export error:", err);
    res.status(500).json({ error: "Failed to export audit logs" });
  }
});

module.exports = router;