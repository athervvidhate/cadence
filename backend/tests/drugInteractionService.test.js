const { findInteractions } = require("../src/services/drugInteractionService");

describe("drugInteractionService", () => {
  test("sorts by severity and returns known pairs", () => {
    const interactions = findInteractions([
      { drugName: "Spironolactone" },
      { drugName: "Lisinopril" },
      { drugName: "Furosemide" },
    ]);
    expect(interactions.length).toBeGreaterThan(0);
    expect(interactions[0].severity).toBe("major");
  });
});
