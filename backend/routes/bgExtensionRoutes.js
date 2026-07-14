const express = require("express");
const router = express.Router();
const bgExtensionController = require("../controllers/bgExtensionController");

router.get("/", (req, res) => {
  bgExtensionController.getBgExtensionList(req, res);
});
router.get("/:file_no", (req, res) => {
  bgExtensionController.getBgExtensionDetails(req, res);
});

router.post("/", (req, res) => {
  bgExtensionController.submitBgExtension(req, res);
});
router.post("/do", (req, res) => {
  bgExtensionController.submitBgExtensionByDo(req, res);
});
router.post("/do-action", (req, res) => {
  bgExtensionController.submitBgExtensionRecomendationByDo(req, res);
});
router.post("/fi-action", (req, res) => {
  bgExtensionController.submitBgExtensionRecomendationByFi(req, res);
});
router.post("/fi", (req, res) => {
  bgExtensionController.submitBgExtensionByFinance(req, res);
});
// router.post("/hrComplianceUpload", (req, res) => {
//   // hrController.hrComplianceUpload(req, res);
// });


module.exports = router;
