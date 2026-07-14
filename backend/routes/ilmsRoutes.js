const express = require("express");
const router = express.Router();
const ilmsController = require("../controllers/poController/ilmsController");
const { verifyAccessToken } = require("../services/jwt.services");
const { dynamicallyUpload } = require("../lib/fileUpload");

/* -------------------------------------------------------------
   ILMS ROUTES
-------------------------------------------------------------- */

router.post(
  "/submitILMS",
  verifyAccessToken,
  dynamicallyUpload.single("file"),
  ilmsController.submitILMS
);

router.get(
  "/list",
  verifyAccessToken,
  ilmsController.list
);

module.exports = router;


// router.post("/sdbgSubmitByDealingOfficer", [verifyAccessToken], (req, res) => {
//   sdbgController.sdbgSubmitByDealingOfficer(req, res);
// });


// router.post("/sdbgUpdateByFinance", [verifyAccessToken], (req, res) => {
//   sdbgController.sdbgUpdateByFinance(req, res);
// });

// router.post("/unlock", [verifyAccessToken, unlockPrivilege], (req, res) => {
//   sdbgController.unlock(req, res);
// });

// router.get("/getSdbgEntry/", [verifyAccessToken], (req, res) => {
//   sdbgController.getSdbgEntry(req, res);
// });
// router.get("/getSDBGData", [verifyAccessToken], (req, res) => {
//   sdbgController.getSDBGData(req, res);
// });
// router.get("/assigneeList", [verifyAccessToken], (req, res) => {
//   sdbgController.assigneeList(req, res);
// });
// 

