const { z } = require("zod");

const symptomSchema = z.object({
  shortnessOfBreath: z.enum(["none", "exertion", "rest"]),
  swelling: z.enum(["none", "mild", "moderate", "severe"]),
  chestPain: z.enum(["none", "mild", "moderate", "severe"]),
  fatigue: z.enum(["none", "mild", "moderate", "severe"]),
  rawTranscript: z.string(),
});

const medTakenSchema = z.object({
  drugName: z.string().optional(),
  medicationName: z.string().optional(),
  dose: z.string().optional(),
  scheduled: z.string().optional(),
  taken: z.boolean(),
  actualTime: z.string().optional(),
});

const createDailyLogSchema = z.object({
  patientId: z.string().min(1),
  dayNumber: z.number().int().positive(),
  weightLbs: z.number(),
  medsTaken: z.array(medTakenSchema).default([]),
  symptoms: symptomSchema,
});

module.exports = { createDailyLogSchema };
