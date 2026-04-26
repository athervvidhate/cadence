const TOTAL_PLAN_DAYS = 30;
const ENHANCED_DAYS = new Set([3, 7, 14, 21, 28]);
const CANONICAL_TASKS = new Set([
  "weight",
  "breathing",
  "morning_meds",
  "symptom_review",
  "evening_meds",
  "enhanced_questionnaire",
]);

const EMAIL_RE = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
const PHONE_RE = /\b(?:\+?\d[\d .\-()]{7,}\d)\b/;
const SSN_RE = /\b\d{3}-\d{2}-\d{4}\b/;

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function hasPii(text) {
  if (typeof text !== "string") return false;
  return EMAIL_RE.test(text) || PHONE_RE.test(text) || SSN_RE.test(text);
}

function validateCheckIn(checkIn, dayNumber, errors) {
  if (!checkIn || typeof checkIn !== "object") {
    errors.push(`day ${dayNumber}: checkIn entry must be an object`);
    return;
  }
  if (!Array.isArray(checkIn.tasks)) {
    errors.push(`day ${dayNumber}: checkIn.tasks must be an array`);
  } else {
    for (const task of checkIn.tasks) {
      if (!CANONICAL_TASKS.has(task)) {
        errors.push(`day ${dayNumber}: invalid task code "${task}"`);
      }
    }
  }

  if (!checkIn.script || typeof checkIn.script !== "object") {
    errors.push(`day ${dayNumber}: checkIn.script must be an object`);
    return;
  }

  for (const value of Object.values(checkIn.script)) {
    if (hasPii(value)) {
      errors.push(`day ${dayNumber}: PII-like content detected in checkIn script`);
      break;
    }
  }
}

function validateMedicationReminder(reminder, dayNumber, errors) {
  if (!reminder || typeof reminder !== "object") {
    errors.push(`day ${dayNumber}: medicationReminders entry must be an object`);
    return;
  }

  const required = ["time", "drugName", "dose", "instructions", "reminderText"];
  for (const key of required) {
    if (typeof reminder[key] !== "string") {
      errors.push(`day ${dayNumber}: medication reminder missing string field "${key}"`);
    }
  }

  if (typeof reminder.reminderText === "string") {
    if (hasPii(reminder.reminderText)) {
      errors.push(`day ${dayNumber}: PII-like content detected in reminder text`);
    }
    const words = reminder.reminderText.trim().split(/\s+/).filter(Boolean).length;
    if (words > 18) {
      errors.push(`day ${dayNumber}: reminderText exceeds 18 words`);
    }
  }
}

export function validateCarePlan(plan, { language, startDateIso }) {
  const errors = [];

  if (!plan || typeof plan !== "object") {
    return { valid: false, errors: ["plan must be an object"] };
  }

  if (!Array.isArray(plan.days)) {
    return { valid: false, errors: ["days must be an array"] };
  }

  if (plan.days.length !== TOTAL_PLAN_DAYS) {
    errors.push(`days length must be ${TOTAL_PLAN_DAYS}`);
  }

  if (typeof plan.language !== "string" || plan.language !== language) {
    errors.push(`language must be "${language}"`);
  }

  const start = new Date(`${startDateIso}T00:00:00Z`);
  if (Number.isNaN(start.getTime())) {
    errors.push("invalid startDateIso used for validation");
    return { valid: false, errors };
  }

  plan.days.forEach((day, idx) => {
    const expectedDay = idx + 1;
    if (!day || typeof day !== "object") {
      errors.push(`day index ${idx} must be an object`);
      return;
    }

    if (day.dayNumber !== expectedDay) {
      errors.push(`day ${expectedDay}: dayNumber must be ${expectedDay}`);
    }

    const expectedDate = new Date(start);
    expectedDate.setUTCDate(start.getUTCDate() + idx);
    const expectedIso = expectedDate.toISOString().slice(0, 10);
    if (day.date !== expectedIso) {
      errors.push(`day ${expectedDay}: date must be ${expectedIso}`);
    }

    const expectedEnhanced = ENHANCED_DAYS.has(expectedDay);
    if (day.isEnhancedCheckIn !== expectedEnhanced) {
      errors.push(`day ${expectedDay}: isEnhancedCheckIn must be ${expectedEnhanced}`);
    }

    const checkIns = safeArray(day.checkIns);
    if (checkIns.length !== 2) {
      errors.push(`day ${expectedDay}: checkIns must contain morning and evening entries`);
    }
    checkIns.forEach((entry) => validateCheckIn(entry, expectedDay, errors));

    if (expectedEnhanced) {
      const morning = checkIns.find((entry) => entry?.type === "morning");
      if (morning && !morning.tasks?.includes("enhanced_questionnaire")) {
        errors.push(`day ${expectedDay}: morning tasks must include enhanced_questionnaire`);
      }
      if (
        morning?.script &&
        (typeof morning.script.weighWeekAsk !== "string" ||
          typeof morning.script.appetiteAsk !== "string")
      ) {
        errors.push(`day ${expectedDay}: enhanced script fields are required`);
      }
    }

    safeArray(day.medicationReminders).forEach((reminder) =>
      validateMedicationReminder(reminder, expectedDay, errors)
    );
  });

  return { valid: errors.length === 0, errors };
}

export function summarizeValidationErrors(errors, max = 3) {
  const list = safeArray(errors).slice(0, max);
  if (!list.length) return "Unknown validation error";
  return list.join("; ");
}
