const { generateCarePlanDays } = require("../src/services/carePlanGenerator");

describe("carePlanGenerator", () => {
  test("generates 30 deterministic days", () => {
    const days = generateCarePlanDays({ startDate: new Date("2026-04-26T00:00:00.000Z"), medications: [] });
    expect(days).toHaveLength(30);
    expect(days[0].dayNumber).toBe(1);
    expect(days[29].dayNumber).toBe(30);
    expect(days[2].appointments).toContain("enhanced_check_in");
    expect(days[6].appointments).toContain("clinical_follow_up");
    expect(days[29].appointments).toContain("clinical_follow_up");
  });
});
