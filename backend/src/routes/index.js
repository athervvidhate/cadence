const express = require("express");
const multer = require("multer");
const { asyncHandler } = require("../utils/asyncHandler");
const { validateRequest } = require("../middleware/validateRequest");
const { createPatientSchema } = require("../validators/patientValidators");
const { generateCarePlanSchema } = require("../validators/carePlanValidators");
const { createDailyLogSchema } = require("../validators/dailyLogValidators");
const { synthesizeVoiceSchema } = require("../validators/voiceValidators");
const { createPatientController, uploadVoiceController } = require("../controllers/patientController");
const { extractRegimenController } = require("../controllers/regimenController");
const { generateCarePlanController } = require("../controllers/carePlanController");
const { createDailyLogController } = require("../controllers/dailyLogController");
const { getDashboardController } = require("../controllers/dashboardController");
const {
  cloneVoiceController,
  streamTemplateAudioController,
  streamTextAudioController,
  synthesizeVoiceController,
} = require("../controllers/voiceController");

const upload = multer({ storage: multer.memoryStorage() });
const router = express.Router();

router.post(
  "/patients",
  validateRequest(createPatientSchema),
  asyncHandler(createPatientController)
);

router.post(
  "/patients/:id/voice",
  upload.single("audio"),
  asyncHandler(uploadVoiceController)
);

router.post(
  "/regimens/extract",
  upload.fields([{ name: "pages" }, { name: "bottles" }]),
  asyncHandler(extractRegimenController)
);

router.post(
  "/care-plans/generate",
  validateRequest(generateCarePlanSchema),
  asyncHandler(generateCarePlanController)
);

router.post(
  "/daily-logs",
  validateRequest(createDailyLogSchema),
  asyncHandler(createDailyLogController)
);

router.get("/patients/:id/dashboard", asyncHandler(getDashboardController));

router.get("/patients/:id/alerts/:alertId", asyncHandler(async (req, res) => {
  const Alert = require("../models/Alert");
  const alert = await Alert.findOne({ _id: req.params.alertId, patientId: req.params.id }).lean();
  if (!alert) return res.status(404).json({ error: "Alert not found" });
  res.json(alert);
}));

router.get("/audio", asyncHandler(streamTextAudioController));
router.get("/voice/stream", asyncHandler(streamTextAudioController));

router.post("/audio/template", asyncHandler(streamTemplateAudioController));

router.post(
  "/voice/clone",
  upload.single("audio"),
  asyncHandler(cloneVoiceController)
);

router.post(
  "/voice/synthesize",
  validateRequest(synthesizeVoiceSchema),
  asyncHandler(synthesizeVoiceController)
);

module.exports = router;
