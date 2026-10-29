const express = require("express");
const { verifyAccessToken } = require("../services/jwt.services");
const sdbgController = require("../controllers/poController/sdbgController");

const router = express.Router();

/* -------------------------------------------------------------
   SDBG ROUTES (Express 5 Compatible)
-------------------------------------------------------------- */

router.post(
  "/submitSDBG",
  verifyAccessToken,
  sdbgController.submitSDBG
);

router.post(
  "/sdbgSubmitByDealingOfficer",
  verifyAccessToken,
  sdbgController.sdbgSubmitByDealingOfficer
);

router.post(
  "/sdbgUpdateByFinance",
  verifyAccessToken,
  sdbgController.sdbgUpdateByFinance
);

router.get(
  "/getSdbgEntry",
  verifyAccessToken,
  sdbgController.getSdbgEntry
);

router.get(
  "/getSDBGData",
  verifyAccessToken,
  sdbgController.getSDBGData
);

router.get(
  "/poBgTerms",
  verifyAccessToken,
  sdbgController.getPoBgTermsDetails
);

router.get(
  "/assigneeList",
  verifyAccessToken,
  sdbgController.assigneeList
);

router.get(
  "/getCurrentAssignee",
  verifyAccessToken,
  sdbgController.getCurrentAssignee
);

router.post(
  "/getspecificbg",
  verifyAccessToken,
  sdbgController.GetspecificBG
);

router.post(
  "/insertSdbgSave",
  verifyAccessToken,
  sdbgController.insertSdbgSave
);

router.get(
  "/getSdbgSave",
  verifyAccessToken,
  sdbgController.getSdbgSave
);

router.get(
  "/getingFileNo",
  verifyAccessToken,
  sdbgController.getingFileNo
);

router.get(
  "/checkIsDEO",
  verifyAccessToken,
  sdbgController.checkIsDEO
);

module.exports = router;
