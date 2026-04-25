const { z } = require("zod");

const generateCarePlanSchema = z.object({
  patientId: z.string().min(1),
  regimenId: z.string().min(1),
  startDate: z.string().min(1),
});

module.exports = { generateCarePlanSchema };
