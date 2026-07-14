const express = require("express");
const router = express.Router();
const inspCallLetterController = require("../controllers/poController/inspectionCallLetterController");
const { verifyAccessToken } = require("../services/jwt.services");
const { dynamicallyUpload } = require("../lib/fileUpload");

/* -------------------------------------------------------------
   INSPECTION CALL LETTER ROUTES
-------------------------------------------------------------- */

router.post(
  "/insp",
  verifyAccessToken,
  dynamicallyUpload.single("file"),
  inspCallLetterController.inspectionCallLetter
);

router.get(
  "/list",
  verifyAccessToken,
  inspCallLetterController.List
);

module.exports = router;
