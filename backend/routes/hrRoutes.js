const express = require("express");
const router = express.Router();
const hrController = require("../controllers/poController/hrController");
const {  uploadExcelData } = require("../lib/fileUpload");
const { verifyAccessToken } = require("../services/jwt.services");
const { NIC_SERVER } = require("../lib/constant");
const { checkServerAccess } = require("../middleware/gatekeeper");

/* -------------------------------------------------------------
   HR ROUTES
-------------------------------------------------------------- */

router.post(
  "/compliance/upload",
  verifyAccessToken,
  uploadExcelData.single("file"),
  hrController.updoadExcelFileController
);

router.post(
  "/compliance/entry",
  verifyAccessToken,
  hrController.updateHrComplients
);
/**
 * VENDOR SUBMIT API
 */
router.post(
  "/compliance",
  checkServerAccess(NIC_SERVER),
  verifyAccessToken,
  hrController.submitHrComplients
);

router.post(
  "/compliance/vendor-update",
  verifyAccessToken,
  hrController.updateHrComplients
);

router.post(
  "/compliance/update",
  verifyAccessToken,
  hrController.actionByHrRecepents
);

router.get(
  "/compliance",
  verifyAccessToken,
  hrController.complianceDetails
);

module.exports = router;
