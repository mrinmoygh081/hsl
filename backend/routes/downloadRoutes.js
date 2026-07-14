const express = require("express");
const router = express.Router();
const downloadController = require("../controllers/poController/poDownloadController");
const { verifyAccessToken } = require("../services/jwt.services");

/* -------------------------------------------------------------
   PO DOWNLOAD ROUTES
-------------------------------------------------------------- */

// router.get(
//   "/",
//   verifyAccessToken,
//   downloadController.download
// );

router.get(
  "/tnc",
  verifyAccessToken,
  downloadController.tncdownload
);

router.get(
  "/latestDocFile",
  verifyAccessToken,
  downloadController.downloadLatest
);

router.get(
  "/getPoFileList",
  verifyAccessToken,
  downloadController.getPoFileList
);

router.post(
  "/paymentAdvice",
  verifyAccessToken,
  downloadController.getPaymentAdvliceList
);

router.post(
  "/paymentAdvices",
  verifyAccessToken,
  downloadController.getPaymentAdvController
);

module.exports = router;
