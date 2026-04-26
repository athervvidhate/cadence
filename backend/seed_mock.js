// Run: node seed_mock.js
const mongoose = require('mongoose');
const DailyLog = require('./src/models/DailyLog');
const Alert = require('./src/models/Alert');
const Regimen = require('./src/models/Regimen');

const PATIENT_ID = '69ed4e67f58a922799af8d3c';
const MONGO_URI = 'mongodb+srv://pranavrajaram_db_user:GuaGSYj6T5kSg3ZX@cadence-dev.hem9aov.mongodb.net/?appName=cadence-dev';

// Discharge date: April 25 2026
const discharge = new Date('2026-04-25T00:00:00Z');

function daysAfter(n) {
  const d = new Date(discharge);
  d.setDate(d.getDate() + n);
  return d;
}

const medications = [
  { drugName: 'Furosemide', rxNormCode: '4109', dose: '40 mg', frequency: 'Once daily', schedule: ['08:00'], instructions: 'Take in morning with water', duration: '30 days', indication: 'Fluid retention / CHF', sourceConfidence: 0.97 },
  { drugName: 'Carvedilol', rxNormCode: '20352', dose: '12.5 mg', frequency: 'Twice daily', schedule: ['08:00', '20:00'], instructions: 'Take with food', duration: '30 days', indication: 'Heart failure / rate control', sourceConfidence: 0.95 },
  { drugName: 'Lisinopril', rxNormCode: '29046', dose: '10 mg', frequency: 'Once daily', schedule: ['08:00'], instructions: 'Take on empty stomach', duration: '30 days', indication: 'ACE inhibitor / blood pressure', sourceConfidence: 0.96 },
  { drugName: 'Spironolactone', rxNormCode: '9997', dose: '25 mg', frequency: 'Once daily', schedule: ['08:00'], instructions: 'Take with food', duration: '30 days', indication: 'Potassium-sparing diuretic', sourceConfidence: 0.93 },
  { drugName: 'Aspirin', rxNormCode: '1191', dose: '81 mg', frequency: 'Once daily', schedule: ['08:00'], instructions: 'Take with food', duration: '30 days', indication: 'Antiplatelet / cardiac protection', sourceConfidence: 0.99 },
];

// med schedule per log entry
function medsTaken(day, allTaken = true) {
  return [
    { drugName: 'Furosemide', dose: '40 mg', scheduled: '08:00', taken: allTaken || day % 5 !== 0, actualTime: '08:14' },
    { drugName: 'Carvedilol (AM)', dose: '12.5 mg', scheduled: '08:00', taken: allTaken || day % 7 !== 0, actualTime: '08:14' },
    { drugName: 'Carvedilol (PM)', dose: '12.5 mg', scheduled: '20:00', taken: allTaken || day % 4 !== 0, actualTime: '20:22' },
    { drugName: 'Lisinopril', dose: '10 mg', scheduled: '08:00', taken: true, actualTime: '08:14' },
    { drugName: 'Spironolactone', dose: '25 mg', scheduled: '08:00', taken: allTaken || day % 6 !== 0, actualTime: '08:14' },
    { drugName: 'Aspirin', dose: '81 mg', scheduled: '08:00', taken: true, actualTime: '08:14' },
  ];
}

// Weight and symptom arc: stable → concerning rise → red alert → intervention → recovery
const logData = [
  // Day 1–3: stable, asymptomatic
  { day: 1, weight: 160.2, sob: 'none', swelling: 'none', chest: 'none', fatigue: 'mild', flag: 'green' },
  { day: 2, weight: 160.5, sob: 'none', swelling: 'none', chest: 'none', fatigue: 'mild', flag: 'green' },
  { day: 3, weight: 161.0, sob: 'none', swelling: 'none', chest: 'none', fatigue: 'mild', flag: 'green' },
  // Day 4–5: early warning — mild weight gain
  { day: 4, weight: 162.8, sob: 'exertion', swelling: 'mild', chest: 'none', fatigue: 'mild', flag: 'yellow' },
  { day: 5, weight: 164.3, sob: 'exertion', swelling: 'mild', chest: 'none', fatigue: 'moderate', flag: 'yellow' },
  // Day 6–8: rapid gain, red flag
  { day: 6, weight: 166.9, sob: 'exertion', swelling: 'moderate', chest: 'mild', fatigue: 'moderate', flag: 'red' },
  { day: 7, weight: 169.1, sob: 'rest', swelling: 'moderate', chest: 'mild', fatigue: 'moderate', flag: 'red' },
  { day: 8, weight: 170.4, sob: 'rest', swelling: 'severe', chest: 'mild', fatigue: 'severe', flag: 'red' },
  // Day 9–11: diuresis response — recovering
  { day: 9, weight: 167.2, sob: 'exertion', swelling: 'moderate', chest: 'none', fatigue: 'moderate', flag: 'yellow' },
  { day: 10, weight: 164.5, sob: 'exertion', swelling: 'mild', chest: 'none', fatigue: 'mild', flag: 'yellow' },
  { day: 11, weight: 162.1, sob: 'none', swelling: 'mild', chest: 'none', fatigue: 'mild', flag: 'green' },
  // Day 12–14: back to baseline
  { day: 12, weight: 161.0, sob: 'none', swelling: 'none', chest: 'none', fatigue: 'mild', flag: 'green' },
  { day: 13, weight: 160.3, sob: 'none', swelling: 'none', chest: 'none', fatigue: 'none', flag: 'green' },
  { day: 14, weight: 160.8, sob: 'none', swelling: 'none', chest: 'none', fatigue: 'none', flag: 'green' },
];

async function seed() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');

  // Clean up existing data for this patient
  await DailyLog.deleteMany({ patientId: PATIENT_ID });
  await Alert.deleteMany({ patientId: PATIENT_ID });
  await Regimen.deleteMany({ patientId: PATIENT_ID });
  console.log('Cleared existing data');

  // Insert regimen
  const regimen = await Regimen.create({
    patientId: PATIENT_ID,
    extractionPath: 'gemma_fallback',
    extractionConfidence: 0.94,
    medications,
    interactions: [
      { drugs: ['Lisinopril', 'Spironolactone'], severity: 'moderate', note: 'Monitor potassium levels — both agents can raise serum K+. Check BMP at 1-week follow-up.' },
      { drugs: ['Carvedilol', 'Furosemide'], severity: 'moderate', note: 'Beta-blocker may blunt compensatory response to diuresis. Monitor HR and BP.' },
    ],
    discrepancies: [
      { field: 'Furosemide dose', paperSays: '40 mg', bottleSays: '40 mg', recommendation: 'Consistent' },
    ],
    followUps: [
      { type: 'cardiology', daysFromDischarge: 7 },
      { type: 'primary_care', daysFromDischarge: 14 },
      { type: 'labs_BMP', daysFromDischarge: 7 },
    ],
  });
  console.log('Created regimen:', regimen._id);

  // Insert daily logs
  const logs = [];
  for (const d of logData) {
    const allTaken = d.flag === 'green';
    const log = await DailyLog.create({
      patientId: PATIENT_ID,
      date: daysAfter(d.day - 1),
      dayNumber: d.day,
      weightLbs: d.weight,
      weightDeltaFromYesterday: d.day === 1 ? 0 : d.weight - logData[d.day - 2].weight,
      weightDeltaFromBaseline: d.weight - 160,
      medsTaken: medsTaken(d.day, allTaken),
      symptoms: {
        shortnessOfBreath: d.sob,
        swelling: d.swelling,
        chestPain: d.chest,
        fatigue: d.fatigue,
        rawTranscript: `Day ${d.day} check-in complete.`,
      },
      flagLevel: d.flag,
      flagReasons: d.flag === 'red'
        ? ['Rapid weight gain >2 lb/day', 'Worsening shortness of breath', 'Increased swelling']
        : d.flag === 'yellow'
        ? ['Weight trending up from baseline', 'Mild symptom increase']
        : [],
    });
    logs.push(log);
  }
  console.log(`Created ${logs.length} daily logs`);

  // Insert alerts tied to the red/yellow days
  await Alert.create([
    {
      patientId: PATIENT_ID,
      dailyLogId: logs[3]._id, // Day 4
      level: 'yellow',
      summary: 'Weight up 2.6 lb from baseline in 4 days. Mild edema reported at ankles. Monitoring for decompensation.',
      actionsTaken: [{ type: 'sms', to: 'caregiver', status: 'sent' }],
      createdAt: daysAfter(3),
    },
    {
      patientId: PATIENT_ID,
      dailyLogId: logs[5]._id, // Day 6
      level: 'red',
      summary: 'Weight gain of 6.7 lb in 6 days. Shortness of breath on exertion. Moderate bilateral ankle swelling. Pattern consistent with early CHF decompensation — immediate intervention recommended.',
      actionsTaken: [
        { type: 'sms', to: 'caregiver', status: 'sent' },
        { type: 'email', to: 'caregiver', status: 'sent' },
      ],
      createdAt: daysAfter(5),
    },
    {
      patientId: PATIENT_ID,
      dailyLogId: logs[6]._id, // Day 7
      level: 'red',
      summary: 'Weight now 169 lb (+9 lb baseline). Dyspnea at rest. Severe lower extremity edema. Urgent cardiology contact advised.',
      actionsTaken: [
        { type: 'sms', to: 'caregiver', status: 'sent' },
        { type: 'call', to: 'caregiver', status: 'sent' },
        { type: 'email', to: 'provider', specialty: 'cardiology', status: 'sent' },
      ],
      createdAt: daysAfter(6),
    },
    {
      patientId: PATIENT_ID,
      dailyLogId: logs[8]._id, // Day 9
      level: 'yellow',
      summary: 'Weight declining after diuresis adjustment — down 3.2 lb from peak. Symptoms improving. Continue monitoring.',
      actionsTaken: [{ type: 'sms', to: 'caregiver', status: 'sent' }],
      resolvedAt: daysAfter(11),
      resolution: 'patient_recovered',
      createdAt: daysAfter(8),
    },
  ]);
  console.log('Created 4 alerts');

  await mongoose.disconnect();
  console.log('Done! Dashboard should now show rich mock data.');
}

seed().catch(e => { console.error(e); process.exit(1); });
