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

