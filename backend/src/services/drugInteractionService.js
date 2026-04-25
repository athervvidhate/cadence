const INTERACTION_TABLE = [
  {
    key: ["Furosemide", "Lisinopril"],
    severity: "moderate",
    note: "Monitor potassium; risk of hypotension",
  },
  {
    key: ["Spironolactone", "Lisinopril"],
    severity: "major",
    note: "Risk of hyperkalemia; monitor potassium closely",
  },
  {
    key: ["Aspirin", "Lisinopril"],
    severity: "moderate",
    note: "NSAID effect can reduce antihypertensive efficacy",
  },
];

function normalizeName(name) {
  return String(name || "").trim().toLowerCase();
}

function findInteractions(medications) {
  const names = medications.map((m) => m.drugName);
  const normalized = names.map(normalizeName);
  const interactions = [];

  for (const item of INTERACTION_TABLE) {
    const [a, b] = item.key.map(normalizeName);
    if (normalized.includes(a) && normalized.includes(b)) {
      interactions.push({
        drugs: item.key,
        severity: item.severity,
        note: item.note,
      });
    }
  }

  const severityOrder = { contraindicated: 0, major: 1, moderate: 2 };
  interactions.sort((left, right) => severityOrder[left.severity] - severityOrder[right.severity]);
  return interactions;
}

module.exports = { findInteractions };
