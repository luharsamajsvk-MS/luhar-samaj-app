// backend/services/auditService.js
const AuditLog = require("../models/AuditLog");

// 🔹 MODIFIED: Added 'requestNumber' to the ignore list for diffing
const IGNORED_FIELDS = new Set(['_id', '__v', 'createdAt', 'updatedAt', 'createdBy', 'issueDate', 'password', 'requestNumber']);

/**
 * A powerful function to find detailed differences between two objects,
 * including changes within arrays of objects.
 * @param {Object} before - The original object.
 * @param {Object} after - The updated object.
 * @returns {Array} - A list of specific changes.
 */
function detailedDiff(before = {}, after = {}) {
    const changes = [];
    const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);

    for (const key of allKeys) {
        if (IGNORED_FIELDS.has(key)) continue;

        const beforeVal = before[key];
        const afterVal = after[key];

        if (JSON.stringify(beforeVal) === JSON.stringify(afterVal)) continue;

        // 🔹 MODIFIED: This logic now correctly logs the *entire* 'before' and 'after'
        // array for fields like 'familyMembers' or 'additionalMobiles'.
        // This is what your frontend is expecting.
        if (Array.isArray(beforeVal) || Array.isArray(afterVal)) {
            changes.push({ 
                field: key, 
                before: beforeVal, 
                after: afterVal, 
                type: 'modified' 
            });
        } 
        // Handle nested object comparisons (like 'head')
        else if (typeof beforeVal === 'object' && beforeVal !== null && typeof afterVal === 'object' && afterVal !== null) {
            const nestedChanges = detailedDiff(beforeVal, afterVal);
            changes.push(...nestedChanges.map(c => ({ ...c, field: `${key}.${c.field}` })));
        } 
        // Handle simple value changes
        else {
            changes.push({ field: key, before: beforeVal, after: afterVal, type: 'modified' });
        }
    }
    return changes;
}

// 🔹 MODIFIED: Added 'requestNumber' to the function parameters
async function createAudit({ action, entityType, entityId, requestId, memberId, before, after, req, requestNumber }) {
  // Use the new detailedDiff function
  const changes = detailedDiff(before, after);

  if (changes.length === 0 && action === 'update') return null;

  return AuditLog.create({
    requestNumber, // 🔹 MODIFIED: Add this line to save the manual request number
    action, entityType, entityId,
    requestId: requestId || undefined,
    memberId: memberId || undefined,
    changes,
    user: { id: req.user?.id, name: req.user?.name || "", email: req.user?.email || "" },
    ipAddress: req.ip,
    userAgent: req.get("User-Agent"),
    timestamp: new Date(),
  });
}

module.exports = { createAudit };