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

// ... (The routes for /members, /requests, and /audit are correct and unchanged) ...
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

router.get('/audit', auth, async (req, res) => {
    try {
        const logs = await AuditLog.find()
            .populate("memberId", "head.name uniqueNumber")
            .populate("user.id", "name email")
            .sort({ timestamp: -1 })
            .lean();
        const formattedData = formatAuditLogsForExcel(logs);
        const buffer = generateExcelBuffer(formattedData, 'Audit Logs');
        res.setHeader('Content-Disposition', 'attachment; filename="audit_logs.xlsx"');
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(buffer);
    } catch (err) {
        console.error("Failed to export audit logs:", err);
        res.status(500).json({ error: 'Failed to export audit log data.' });
    }
});


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