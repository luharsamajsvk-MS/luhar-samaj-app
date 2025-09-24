// backend/services/auditService.js
const AuditLog = require("../models/AuditLog");

const IGNORED_FIELDS = new Set(['_id', '__v', 'createdAt', 'updatedAt', 'createdBy', 'issueDate', 'password']);

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

        // Handle array comparisons (like familyMembers)
        if (Array.isArray(beforeVal) && Array.isArray(afterVal)) {
            const beforeMap = new Map(beforeVal.map(item => [item.name || item, item]));
            const afterMap = new Map(afterVal.map(item => [item.name || item, item]));

            // Check for added/modified items
            for (const [name, item] of afterMap.entries()) {
                if (!beforeMap.has(name)) {
                    changes.push({ field: key, type: 'added', value: item.name || item });
                }
            }
            // Check for removed items
            for (const [name, item] of beforeMap.entries()) {
                if (!afterMap.has(name)) {
                    changes.push({ field: key, type: 'removed', value: item.name || item });
                }
            }
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

async function createAudit({ action, entityType, entityId, requestId, memberId, before, after, req }) {
  // Use the new detailedDiff function
  const changes = detailedDiff(before, after);

  if (changes.length === 0 && action === 'update') return null;

  return AuditLog.create({
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