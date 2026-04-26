const { extractAndStoreRegimen } = require("../services/regimenService");

async function extractRegimenController(req, res) {
  try {
    const patientId = req.body.patientId;
    const pages = req.files?.pages || [];
    console.log(`[regimenController] patientId=${patientId} pages=${pages.length}`);

    const imageBuffers = pages.map((file) => ({
      buffer: file.buffer,
      mimetype: file.mimetype || "image/jpeg",
    }));

    const result = await extractAndStoreRegimen({ patientId, imageBuffers });
    res.status(200).json(result);
  } catch (err) {
    console.error("[regimenController] ERROR:", err.message);
    console.error(err.stack);
    res.status(500).json({ error: err.message });
  }
}

module.exports = { extractRegimenController };
