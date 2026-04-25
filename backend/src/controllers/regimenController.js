const { extractAndStoreRegimen } = require("../services/regimenService");

async function extractRegimenController(req, res) {
  const patientId = req.body.patientId;
  const pages = req.files?.pages || [];
  const bottles = req.files?.bottles || [];
  const imageUrls = [...pages, ...bottles].map((file, index) => file.path || `uploaded://image/${index}`);

  const result = await extractAndStoreRegimen({ patientId, imageUrls });
  res.status(200).json(result);
}

module.exports = { extractRegimenController };
