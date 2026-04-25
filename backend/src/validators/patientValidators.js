const { z } = require("zod");

const createPatientSchema = z.object({
  patientName: z.string().min(1),
  preferredName: z.string().min(1),
  ageYears: z.number().int().min(1),
  language: z.enum(["en", "es"]).default("en"),
  baselineWeightLbs: z.number().positive(),
  caregiver: z.object({
    name: z.string().min(1),
    relationship: z.string().min(1),
    phone: z.string().min(1),
    email: z.string().email(),
  }),
});

module.exports = { createPatientSchema };
