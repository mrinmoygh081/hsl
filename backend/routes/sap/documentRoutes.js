const express = require("express");
const router = express.Router();

const controller = require("../../controllers/sapController/docViewController");
const { verifyAccessToken } = require("../../services/jwt.services");

/* -------------------------------------------------------------
   SAP DOCUMENT VIEW ROUTES
-------------------------------------------------------------- */

router.post(
  "/serviceEntryReport",
  verifyAccessToken,
  controller.serviceEntryReport
);

router.post(
  "/grnReport",
  verifyAccessToken,
  controller.grnReport
);

router.post(
  "/matIssueReport",
  verifyAccessToken,
  controller.materialIssue
);

router.post(
  "/icgrnReport",
  verifyAccessToken,
  controller.icgrnReport
);

router.post(
  "/gateentryReport",
  verifyAccessToken,
  controller.gateEntryReport
);

module.exports = router;
