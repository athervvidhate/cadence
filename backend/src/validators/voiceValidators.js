const { z } = require("zod");

const synthesizeVoiceSchema = z
  .object({
    patientId: z.string().min(1).optional(),
    voiceId: z.string().min(1).optional(),
    text: z.string().min(1),
    language: z.enum(["en", "es"]).default("en"),
  })
  .refine((value) => Boolean(value.patientId || value.voiceId), {
    message: "Either patientId or voiceId is required",
  });

module.exports = { synthesizeVoiceSchema };
