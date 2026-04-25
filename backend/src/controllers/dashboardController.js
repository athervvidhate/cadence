const { getDashboard } = require("../services/dashboardService");

async function getDashboardController(req, res) {
  const result = await getDashboard(req.params.id);
  res.status(200).json(result);
}

module.exports = { getDashboardController };
