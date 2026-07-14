const express = require("express");
const router = express.Router();
const controller = require("../../controllers/sapController/storeControllers");

/**
 * STORE ROUTES
 */

router.post("/gateentry", (req, res) => {
  controller.insertGateEntryData(req, res);
});
router.post("/geh-pull", (req, res) => {
  controller.gateEngryHeaderTableDataInsert(req, res);
});
router.post("/ged-pull", (req, res) => {
  controller.gateEngryDataTableDataInsert(req, res);
});

router.post("/gateentryReport", (req, res) => {
  controller.gateEntryReport(req, res);
});

router.get("/storeActionList", (req, res) => {
  controller.storeActionList(req, res);
});

module.exports = router;
