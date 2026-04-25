const mlResponse = require("./fixtures/mlAgentRegimenResponse.json");
const { mapAgentResponse } = require("../src/services/regimenService");

describe("ML contract compatibility", () => {
  test("maps Role 2 extraction envelope into backend shape", () => {
    const mapped = mapAgentResponse(mlResponse);
    expect(mapped.extractionPath).toBe("gemma_fallback");
    expect(mapped.extractionConfidence).toBeCloseTo(0.91, 5);
    expect(mapped.medications).toHaveLength(1);
    expect(mapped.medications[0].dose).toMatch(/mg/i);
  });
});
