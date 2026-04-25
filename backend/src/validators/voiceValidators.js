const { z } = require("zod");

const synthesizeVoiceSchema = z.object({
  patientId: z.string().min(1),
  text: z.string().min(1),
  language: z.enum(["en", "es"]).default("en"),
});

module.exports = { synthesizeVoiceSchema };
