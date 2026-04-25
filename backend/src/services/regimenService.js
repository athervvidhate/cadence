const Regimen = require("../models/Regimen");
const { extractRegimen } = require("./agentClient");
const { findInteractions } = require("./drugInteractionService");

function mapAgentResponse(agentResponse) {
  return {
    extractionPath: agentResponse.extractionPath || "gemma_fallback",
    extractionConfidence: Number(agentResponse.confidence || agentResponse.extractionConfidence || 0),
    medications: agentResponse.medications || [],
    discrepancies: agentResponse.discrepancies || [],
    followUps: agentResponse.followUps || [],
  };
}

async function extractAndStoreRegimen({ patientId, imageUrls }) {
  const agentResponse = await extractRegimen({
    type: "extract_regimen",
    patientId,
    imageUrls,
  });

  const mapped = mapAgentResponse(agentResponse);
  const medications = mapped.medications;
  const interactions = findInteractions(medications);

  const regimen = await Regimen.create({
    patientId,
    extractedAt: new Date(),
    extractionPath: mapped.extractionPath,
    extractionConfidence: mapped.extractionConfidence,
    medications,
    interactions,
    discrepancies: mapped.discrepancies,
    followUps: mapped.followUps,
  });

  return {
    regimenId: regimen._id.toString(),
    extractionPath: regimen.extractionPath,
    confidence: regimen.extractionConfidence,
    medications: regimen.medications,
    interactions: regimen.interactions,
    discrepancies: regimen.discrepancies,
    needsReview: regimen.extractionConfidence < 0.7,
  };
}

module.exports = { extractAndStoreRegimen, mapAgentResponse };
