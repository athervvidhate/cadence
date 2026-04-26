const axios = require("axios");
const env = require("../config/env");

async function sendToAgent(path, payload) {
  const url = `${env.agentShimUrl}${path}`;
  const response = await axios.post(url, payload, { timeout: 20000 });
  return response.data;
}

async function extractRegimen(payload) {
  return sendToAgent("/agents/regimen/extract_regimen", payload);
}

async function buildPlan(payload) {
  return sendToAgent("/agents/care-plan/build_plan", payload);
}

async function evaluateLog(payload) {
  return sendToAgent("/agents/escalation/evaluate_log", payload);
}

module.exports = { extractRegimen, buildPlan, evaluateLog };
