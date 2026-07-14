const express = require("express");
const router = express.Router();
const inspectionReleaseNoteController = require("../controllers/poController/inspectionReleaseNoteController");
const { dynamicallyUpload } = require("../lib/fileUpload");
const { verifyAccessToken } = require("../services/jwt.services");

/* -------------------------------------------------------------
   INSPECTION RELEASE NOTE ROUTES
-------------------------------------------------------------- */

router.post(
  "/submitIRN",
  verifyAccessToken,
  dynamicallyUpload.single("file"),
  inspectionReleaseNoteController.inspectionReleaseNote
);

router.get(
  "/list",
  verifyAccessToken,
  inspectionReleaseNoteController.list
);

module.exports = router;
