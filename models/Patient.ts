import { Schema, model, models } from "mongoose";

type PatientDocument = {
  voiceId?: string;
};

const patientSchema = new Schema<PatientDocument>(
  {
    voiceId: {
      type: String,
    },
  },
  {
    timestamps: true,
    strict: false,
  },
);

const Patient = models.Patient || model<PatientDocument>("Patient", patientSchema);

export default Patient;
