
const { statusConfig } = require("../lib/statusConfig");
/**
 * ANY PAYLOAD VALIDATION,
 * DOCUMANTATION INSIDE THE FUNCTION
 * @param {*} payload 
 * @param {*} rules 
 * @returns 
 */
function validatePayload(payload, rules = {}) {

    const errors = [];

    for (const [field, rule] of Object.entries(rules)) {
        const value = payload[field];

        // 1. Required check
        if (rule.required && (value === undefined || value === null || value === "")) {
            errors.push(`${field} is required`);
            continue; // Skip further checks if missing
        }

        // Skip further checks if value is not provided and not required
        if (value === undefined || value === null || value === "") {
            continue;
        }

        // 2. Type check
        if (rule.type) {
            if (rule.type === "number" && isNaN(Number(value))) {
                errors.push(`${field} must be a valid number`);
            }
            if (rule.type === "string" && typeof value !== "string") {
                errors.push(`${field} must be a string`);
            }
            if (rule.type === "date" && isNaN(Date.parse(value))) {
                errors.push(`${field} must be a valid date`);
            }
            if (rule.type === "boolean" && typeof value !== "boolean") {
                errors.push(`${field} must be a boolean`);
            }
        }

        // 3. Min/Max checks
        if (rule.type === "string") {
            if (rule.min && value.length < rule.min) {
                errors.push(`${field} must have at least ${rule.min} characters`);
            }
            if (rule.max && value.length > rule.max) {
                errors.push(`${field} must not exceed ${rule.max} characters`);
            }
        }

        if (rule.type === "number") {
            const num = Number(value);
            if (rule.min !== undefined && num < rule.min) {
                errors.push(`${field} must be >= ${rule.min}`);
            }
            if (rule.max !== undefined && num > rule.max) {
                errors.push(`${field} must be <= ${rule.max}`);
            }
        }

        if (rule.type === "date") {
            const date = new Date(value);
            if (rule.min && date < new Date(rule.min)) {
                errors.push(`${field} must be after ${rule.min}`);
            }
            if (rule.max && date > new Date(rule.max)) {
                errors.push(`${field} must be before ${rule.max}`);
            }
        }
    }

    return {
        isValid: errors.length === 0,
        message: "Check Validation",
        errors
    };
}

/**
 * 
 */

function validateStatusTransition(moduleName, currentStatus, newStatus) {
  const moduleRules = statusConfig[moduleName];
  if (!moduleRules) {
    return { isValid: false, message: `Unknown module: ${moduleName}` };
  }

  // First-time submission (no current status)
  if (!currentStatus) {
    return newStatus === moduleRules.firstStatus
      ? { isValid: true, message: "Valid first status." }
      : { isValid: false, message: `First status must be ${moduleRules.firstStatus}` };
  }

  // Validate transition sequence
  const { allowedFlows } = moduleRules;
  const isValid = allowedFlows.some(flow => {
    const currentIndex = flow.indexOf(currentStatus);
    const nextIndex = flow.indexOf(newStatus);
    return currentIndex !== -1 && nextIndex === currentIndex + 1;
  });

  return isValid
    ? { isValid: true, message: "Valid transition." }
    : { isValid: false, message: `Invalid transition from ${currentStatus} → ${newStatus}` };
}

module.exports = { validatePayload, validateStatusTransition }

