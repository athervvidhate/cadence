const request = require("supertest");
const app = require("../src/app");

describe("request validators", () => {
  test("rejects invalid patient payload", async () => {
    const res = await request(app).post("/api/patients").send({ patientName: "" });
    expect(res.status).toBe(400);
  });

  test("rejects invalid daily log payload", async () => {
    const res = await request(app).post("/api/daily-logs").send({ patientId: "x" });
    expect(res.status).toBe(400);
  });
});
