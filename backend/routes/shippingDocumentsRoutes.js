const express = require("express");
const router = express.Router();
const controllers = require("../controllers/poController/shippingDocumentsController");
const { dynamicallyUpload } = require("../lib/fileUpload");
const { verifyAccessToken } = require("../services/jwt.services");

/* -------------------------------------------------------------
   SHIPPING DOCUMENTS ROUTES
-------------------------------------------------------------- */

router.post(
  "/sdoc",
  verifyAccessToken,
  dynamicallyUpload.single("file"),
  controllers.shippingDocuments
);

router.get(
  "/list",
  verifyAccessToken,
  controllers.List
);

module.exports = router;
