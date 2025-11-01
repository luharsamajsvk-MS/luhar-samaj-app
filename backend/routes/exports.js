// backend/routes/exports.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Member = require('../models/Member');
const Request = require('../models/Request');
const AuditLog = require('../models/AuditLog');
const { 
    generateExcelBuffer,
    formatMembersForExcel,
    formatRequestsForExcel,
    formatAuditLogsForExcel,
} = require('../services/excel-service');
const mongoose = require('mongoose'); // Import mongoose

// ... (The routes for /members and /requests are correct and unchanged) ...
router.get('/members', auth, async (req, res) => {
    try {
        const members = await Member.find().populate('zone').lean();
        const formattedData = formatMembersForExcel(members);
        const buffer = generateExcelBuffer(formattedData, 'Members');
        res.setHeader('Content-Disposition', 'attachment; filename="members.xlsx"');
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(buffer);
    } catch (err) {
        console.error("Failed to export members:", err);
        res.status(500).json({ error: 'Failed to export member data.' });
    }
});

router.get('/requests', auth, async (req, res) => {
    try {
        const requests = await Request.find().populate('zone').lean();
        const formattedData = formatRequestsForExcel(requests);
        const buffer = generateExcelBuffer(formattedData, 'Requests');
        res.setHeader('Content-Disposition', 'attachment; filename="requests.xlsx"');
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(buffer);
    } catch (err) {
        console.error("Failed to export requests:", err);
        res.status(500).json({ error: 'Failed to export request data.' });
    }
});

//
// --- 🔻🔻 MODIFIED /audit ROUTE 🔻🔻 ---
//
router.get('/audit', auth, async (req, res) => {
    try {
        // --- ADDED FILTER LOGIC ---
        const { search, action, entityType } = req.query;
        const query = {};

        if (action) query.action = action;
        if (entityType) query.entityType = entityType;

        if (search) {
            const searchRegex = { $regex: search, $options: 'i' };
            const searchNum = parseInt(search, 10);
            
            const orQuery = [
                { 'user.name': searchRegex },
                { 'action': searchRegex },
                { 'entityType': searchRegex },
            ];

            if (!isNaN(searchNum)) {
                orQuery.push({ requestNumber: searchNum });
            }
            
            // Add member search if it's a valid ObjectId
            if (mongoose.Types.ObjectId.isValid(search)) {
                orQuery.push({ memberId: search });
                orQuery.push({ entityId: search });
            }

            query.$or = orQuery;
        }
        // --- END OF FILTER LOGIC ---

        const logs = await AuditLog.find(query) // Apply the filter query
            .populate("memberId", "head.name uniqueNumber")
            .populate("user.id", "name email") // This populate is likely for user.id, not user.name
            .sort({ timestamp: -1 })
            .lean();
            
        const formattedData = formatAuditLogsForExcel(logs);
        const buffer = generateExcelBuffer(formattedData, 'Audit Logs');
        
        // --- UPDATED FILENAME TO .xlsx ---
        res.setHeader('Content-Disposition', 'attachment; filename="audit_logs.xlsx"');
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(buffer);
    } catch (err) {
        console.error("Failed to export audit logs:", err);
        res.status(500).json({ error: 'Failed to export audit log data.' });
    }
});
//
// --- 🔺🔺 END OF MODIFIED ROUTE 🔺🔺 ---
//

// ✅ **FIXED**: This route now safely encodes filenames with special characters.
router.get('/zone/:zoneId', auth, async (req, res) => {
    try {
        const { zoneId } = req.params;
        const members = await Member.find({ zone: zoneId }).populate('zone').lean();
        
        if (members.length === 0) {
            return res.status(404).json({ error: 'No members found in this zone.' });
        }

        const zoneName = members[0].zone.name;
        const formattedData = formatMembersForExcel(members);
        const buffer = generateExcelBuffer(formattedData, `Zone ${zoneName} Members`);

        // Create a safe, URL-encoded filename for the header
        const encodedFilename = encodeURIComponent(`zone_${zoneName}_members.xlsx`);
        // Provide a simple ASCII-only name for older systems
        const fallbackFilename = `zone_${zoneId}_members.xlsx`; 

        res.setHeader('Content-Disposition', `attachment; filename="${fallbackFilename}"; filename*=UTF-8''${encodedFilename}`);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(buffer);

    } catch (err) {
        console.error("Failed to export zone members:", err);
        res.status(500).json({ error: 'Failed to export zone data.' });
    }
});

module.exports = router;