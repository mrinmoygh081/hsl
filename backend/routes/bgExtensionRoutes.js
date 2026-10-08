const express = require("express");
const router = express.Router();
const bgExtensionController = require("../controllers/bgExtensionController");

router.get("/", (req, res) => {
  bgExtensionController.getBgExtensionList(req, res);
});
router.get("/:reference_no", (req, res) => {
  bgExtensionController.getBgExtensionDetails(req, res);
});

router.post("/", (req, res) => {
  bgExtensionController.submitBgExtension(req, res);
});
router.post("/do", (req, res) => {
  bgExtensionController.submitBgExtensionByDo(req, res);
});
router.post("/fi", (req, res) => {
  bgExtensionController.submitBgExtensionByFinance(req, res);
});

module.exports = router;
