const ENHANCED_CHECK_IN_DAYS = new Set([3, 7, 14, 21, 28]);
const TOTAL_PLAN_DAYS = 30;
const MORNING_TIME = "08:00";
const EVENING_TIME = "20:00";

const PLAIN_INDICATION_MAP_EN = {
  diuretic: "water pill",
  "blood pressure": "blood pressure pill",
  ace: "blood pressure pill",
  beta: "heart pill",
};

function safeString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeLanguage(value) {
  return safeString(value).toLowerCase() === "es" ? "es" : "en";
}

function parseStartDate(startDateIso) {
  const raw = safeString(startDateIso);
  const target = raw || new Date().toISOString().slice(0, 10);
  const date = new Date(`${target}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function addDaysIso(baseDate, offsetDays) {
  const dt = new Date(baseDate);
  dt.setUTCDate(dt.getUTCDate() + offsetDays);
  return dt.toISOString().slice(0, 10);
}

function parseDurationDays(duration) {
  const value = safeString(duration).toLowerCase();
  if (!value || value.includes("ongoing")) return null;

  const dayMatch = value.match(/(\d+)\s*(day|days|dia|dias|d[ií]as)/i);
  if (dayMatch) return Number(dayMatch[1]);

  const weekMatch = value.match(/(\d+)\s*(week|weeks|semana|semanas)/i);
  if (weekMatch) return Number(weekMatch[1]) * 7;

  return null;
}

function normalizeSchedule(medication) {
  const listed = Array.isArray(medication?.schedule)
    ? medication.schedule.filter((time) => /^\d{2}:\d{2}$/.test(String(time || "").trim()))
    : [];
  if (listed.length) return listed;

  const frequency = safeString(medication?.frequency).toLowerCase();
  if (frequency.includes("twice") || frequency.includes("bid")) return [MORNING_TIME, EVENING_TIME];
  if (frequency.includes("three") || frequency.includes("tid")) return ["08:00", "14:00", "20:00"];
  if (frequency.includes("qhs") || frequency.includes("night")) return [EVENING_TIME];
  return [MORNING_TIME];
}

function normalizeFollowUpDay(value) {
  const day = Number(value);
  if (!Number.isInteger(day) || day < 1 || day > TOTAL_PLAN_DAYS) return null;
  return day;
}

function plainIndicationLabel(indication) {
  const raw = safeString(indication).toLowerCase();
  if (!raw) return "";
  for (const [key, label] of Object.entries(PLAIN_INDICATION_MAP_EN)) {
    if (raw.includes(key)) return label;
  }
  return "";
}

function clampWords(text, maxWords = 18) {
  const words = String(text || "")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean);
  if (words.length <= maxWords) return words.join(" ");
  return `${words.slice(0, maxWords).join(" ").replace(/[.,;:!?]+$/, "")}.`;
}

function buildReminderText(language, preferredName, time, medication) {
  const drugName = safeString(medication?.drugName) || "Medication";
  const dose = safeString(medication?.dose) || "";
  const dosePart = dose ? ` ${dose}` : "";

  if (language === "es") {
    const raw = `${preferredName}, toma ${drugName}${dosePart} a las ${time}.`;
    return clampWords(raw, 18);
  }

  const plainType = plainIndicationLabel(medication?.indication);
  const hint = plainType ? ` (${plainType})` : "";
  const raw = `${time} reminder, ${preferredName}: ${drugName}${dosePart}${hint}.`;
  return clampWords(raw, 18);
}

function buildMorningScript(language, preferredName, dayNumber, isEnhanced) {
  if (language === "es") {
    const script = {
      greeting: `Buenos dias, ${preferredName}. Hoy es el dia ${dayNumber} en casa.`,
      weightAsk: "Puedes subirte a la bascula y decirme el numero?",
      breathAsk: "Como esta tu respiracion esta manana, igual o peor?",
      medsAsk: "Ya tomaste tus pastillas de la manana?",
      signoff: `Gracias, ${preferredName}. Te escribo esta noche.`,
    };
    if (isEnhanced) {
      script.weighWeekAsk = "Comparado con la semana pasada, como te has sentido estos dias?";
      script.appetiteAsk = "Como ha estado tu apetito en los ultimos dias?";
    }
    return script;
  }

  const script = {
    greeting: `Good morning, ${preferredName}. It's day ${dayNumber} at home.`,
    weightAsk: "Can you step on the scale and tell me the number?",
    breathAsk: "How is your breathing this morning, any tightness?",
    medsAsk: "Have you taken your morning pills yet?",
    signoff: `Thank you, ${preferredName}. I'll check back tonight.`,
  };
  if (isEnhanced) {
    script.weighWeekAsk = "How does this week feel compared with last week?";
    script.appetiteAsk = "How has your appetite been over the last few days?";
  }
  return script;
}

function buildEveningScript(language, preferredName, dayNumber) {
  if (language === "es") {
    return {
      greeting: `Hola ${preferredName}, cerrando el dia ${dayNumber}.`,
      symptomAsk: "Notaste hinchazon o falta de aire hoy?",
      medsAsk: "Tomaste tus pastillas de la noche?",
      encouragement: "Vas muy bien. Seguimos manana.",
      signoff: `Buenas noches, ${preferredName}.`,
    };
  }

  return {
    greeting: `Hi ${preferredName}, it's evening of day ${dayNumber}.`,
    symptomAsk: "Any swelling in your ankles or trouble catching your breath today?",
    medsAsk: "Did you take your evening pills?",
    encouragement: "You're doing great. Keep going one day at a time.",
    signoff: `Goodnight, ${preferredName}.`,
  };
}

function buildAppointmentsByDay(regimen, language) {
  const byDay = new Map();
  const followUps = Array.isArray(regimen?.followUps) ? regimen.followUps : [];

  for (const item of followUps) {
    const day = normalizeFollowUpDay(item?.daysFromDischarge);
    if (!day) continue;
    const current = byDay.get(day) || [];
    const type = safeString(item?.type) || "follow_up";
    const label =
      language === "es" ? `Control clinico: ${type}` : `Clinical follow-up: ${type}`;
    current.push({ type, label });
    byDay.set(day, current);
  }

  for (const day of [7, 14, 30]) {
    if (byDay.has(day)) continue;
    byDay.set(day, [
      {
        type: "standard_follow_up",
        label:
          language === "es"
            ? "Recordatorio de seguimiento clinico"
            : "Standard clinical follow-up reminder",
      },
    ]);
  }

  return byDay;
}

function buildMedicationRemindersForDay(language, preferredName, medications, dayNumber) {
  const reminders = [];
  for (const medication of medications) {
    const drugName = safeString(medication?.drugName);
    const dose = safeString(medication?.dose);
    if (!drugName || !dose) continue;

    const cutoff = parseDurationDays(medication?.duration);
    if (cutoff && dayNumber > cutoff) continue;

    const schedule = normalizeSchedule(medication);
    for (const time of schedule) {
      reminders.push({
        time,
        drugName,
        dose,
        instructions: safeString(medication?.instructions),
        reminderText: buildReminderText(language, preferredName, time, medication),
      });
    }
  }
  reminders.sort((a, b) => a.time.localeCompare(b.time) || a.drugName.localeCompare(b.drugName));
  return reminders;
}

function buildEmptyPlan(language, generationNote) {
  return {
    totalDays: TOTAL_PLAN_DAYS,
    language,
    generationNote,
    days: [],
  };
}

const PLACEHOLDER_DAY = /__DAY__/g;
const PLACEHOLDER_DATE = /__DATE__/g;

function applyDayPlaceholders(text, dayNumber, dateIso) {
  return String(text)
    .replace(PLACEHOLDER_DAY, String(dayNumber))
    .replace(PLACEHOLDER_DATE, String(dateIso));
}

function mergeVoiceScripts(
  { language, preferredName, dayNumber, dateIso, isEnhanced },
  llmScripts
) {
  const mBase = buildMorningScript(language, preferredName, dayNumber, isEnhanced);
  const eBase = buildEveningScript(language, preferredName, dayNumber);
  let mScript = { ...mBase };
  if (llmScripts?.morning && typeof llmScripts.morning === "object") {
    for (const k of Object.keys(mBase)) {
      const t = safeString(llmScripts.morning[k]);
      if (t) mScript[k] = applyDayPlaceholders(t, dayNumber, dateIso);
    }
  }
  if (isEnhanced && llmScripts?.enhanced && typeof llmScripts.enhanced === "object") {
    const w = safeString(llmScripts.enhanced.weighWeekAsk);
    const a = safeString(llmScripts.enhanced.appetiteAsk);
    if (w) mScript.weighWeekAsk = applyDayPlaceholders(w, dayNumber, dateIso);
    if (a) mScript.appetiteAsk = applyDayPlaceholders(a, dayNumber, dateIso);
  }
  let eScript = { ...eBase };
  if (llmScripts?.evening && typeof llmScripts.evening === "object") {
    for (const k of Object.keys(eBase)) {
      const t = safeString(llmScripts.evening[k]);
      if (t) eScript[k] = applyDayPlaceholders(t, dayNumber, dateIso);
    }
  }
  return { morning: mScript, evening: eScript };
}

/**
 * `compact` is the model JSON. Expected shape: { language, generationNote, scripts?: { morning, evening, enhanced } }.
 * Daily check-in task codes, medicationReminders, dates, and appointments are added in code from the regimen.
 */
export function buildCarePlanFromLlmCompact({ patientProfile, regimen, startDateIso, compact }) {
  const language = normalizeLanguage(patientProfile?.language ?? compact?.language);
  const preferredName =
    safeString(patientProfile?.preferredName) || (language === "es" ? "Familia" : "there");
  const startDate = parseStartDate(startDateIso);
  const llmScripts = compact && typeof compact.scripts === "object" ? compact.scripts : null;
  const generationNote =
    compact && typeof compact.generationNote === "string" ? compact.generationNote : null;

  if (!startDate) {
    return buildEmptyPlan(language, "Invalid START_DATE. Expected ISO date.");
  }

  const medications = Array.isArray(regimen?.medications) ? regimen.medications : [];
  if (!medications.length) {
    return buildEmptyPlan(
      language,
      safeString(compact?.generationNote) || "Regimen malformed: medications array is empty."
    );
  }

  const appointmentsByDay = buildAppointmentsByDay(regimen, language);
  const days = [];

  for (let dayNumber = 1; dayNumber <= TOTAL_PLAN_DAYS; dayNumber += 1) {
    const isEnhanced = ENHANCED_CHECK_IN_DAYS.has(dayNumber);
    const dateIso = addDaysIso(startDate, dayNumber - 1);
    const morningTasks = ["weight", "breathing", "morning_meds"];
    if (isEnhanced) morningTasks.push("enhanced_questionnaire");
    const { morning: mScript, evening: eScript } = mergeVoiceScripts(
      { language, preferredName, dayNumber, dateIso, isEnhanced },
      llmScripts
    );

    days.push({
      dayNumber,
      date: dateIso,
      isEnhancedCheckIn: isEnhanced,
      appointments: appointmentsByDay.get(dayNumber) || [],
      checkIns: [
        {
          time: MORNING_TIME,
          type: "morning",
          tasks: morningTasks,
          script: mScript,
        },
        {
          time: EVENING_TIME,
          type: "evening",
          tasks: ["symptom_review", "evening_meds"],
          script: eScript,
        },
      ],
      medicationReminders: buildMedicationRemindersForDay(
        language,
        preferredName,
        medications,
        dayNumber
      ),
    });
  }

  return {
    totalDays: TOTAL_PLAN_DAYS,
    language,
    generationNote,
    days,
  };
}

export function isLegacyFull30DayPlan(obj) {
  return Boolean(obj && Array.isArray(obj.days) && obj.days.length === TOTAL_PLAN_DAYS);
}

export function buildDeterministicCarePlan({ patientProfile, regimen, startDateIso }) {
  const language = normalizeLanguage(patientProfile?.language);
  const preferredName = safeString(patientProfile?.preferredName) || (language === "es" ? "Familia" : "there");
  const startDate = parseStartDate(startDateIso);

  if (!startDate) {
    return buildEmptyPlan(language, "Invalid START_DATE. Expected ISO date.");
  }

  const medications = Array.isArray(regimen?.medications) ? regimen.medications : [];
  if (!medications.length) {
    return buildEmptyPlan(language, "Regimen malformed: medications array is empty.");
  }

  const appointmentsByDay = buildAppointmentsByDay(regimen, language);
  const days = [];

  for (let dayNumber = 1; dayNumber <= TOTAL_PLAN_DAYS; dayNumber += 1) {
    const isEnhanced = ENHANCED_CHECK_IN_DAYS.has(dayNumber);
    const morningTasks = ["weight", "breathing", "morning_meds"];
    if (isEnhanced) morningTasks.push("enhanced_questionnaire");

    days.push({
      dayNumber,
      date: addDaysIso(startDate, dayNumber - 1),
      isEnhancedCheckIn: isEnhanced,
      appointments: appointmentsByDay.get(dayNumber) || [],
      checkIns: [
        {
          time: MORNING_TIME,
          type: "morning",
          tasks: morningTasks,
          script: buildMorningScript(language, preferredName, dayNumber, isEnhanced),
        },
        {
          time: EVENING_TIME,
          type: "evening",
          tasks: ["symptom_review", "evening_meds"],
          script: buildEveningScript(language, preferredName, dayNumber),
        },
      ],
      medicationReminders: buildMedicationRemindersForDay(
        language,
        preferredName,
        medications,
        dayNumber
      ),
    });
  }

  return {
    totalDays: TOTAL_PLAN_DAYS,
    language,
    generationNote: null,
    days,
  };
}

export function buildCarePlanCacheKey({ regimenId, regimen, startDateIso, language }) {
  const prefix = safeString(regimenId) || safeString(regimen?.id) || safeString(regimen?._id);
  if (prefix) return `${prefix}:${startDateIso}:${language}`;
  const compactRegimen = JSON.stringify(regimen || {});
  return `${compactRegimen}:${startDateIso}:${language}`;
}
