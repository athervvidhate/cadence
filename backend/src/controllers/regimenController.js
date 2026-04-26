const { extractAndStoreRegimen } = require("../services/regimenService");

async function extractRegimenController(req, res) {
  const patientId = req.body.patientId;
  const pages = req.files?.pages || [];
  const bottles = req.files?.bottles || [];
  const imageBuffers = [...pages, ...bottles].map((file) => ({
    buffer: file.buffer,
    mimetype: file.mimetype || "image/jpeg",
  }));

  const result = await extractAndStoreRegimen({ patientId, imageBuffers });
  res.status(200).json(result);
}

module.exports = { extractRegimenController };
