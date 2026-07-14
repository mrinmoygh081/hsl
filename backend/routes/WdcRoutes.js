const express = require("express");
const router = express.Router();

const { wdcmw } = require("../services/wdcmw");
const { verifyAccessToken } = require("../services/jwt.services");

const WdcController = require("../controllers/poController/WdcController");
const wdcControllerV2 = require("../controllers/poController/wdcControllerV2");

/* -------------------------------------------------------------
   WDC ROUTES
-------------------------------------------------------------- */

const upload = wdcmw();

/* -------------------- WDC V1 -------------------- */

router.post(
  "/submitWdc",
  verifyAccessToken,
  upload,
  WdcController.wdc
);

router.get(
  "/wdcList",
  verifyAccessToken,
  WdcController.list
);

router.get(
  "/grseEmpList",
  verifyAccessToken,
  WdcController.grseEmpList
);

/* -------------------- WDC V2 -------------------- */

router.get(
  "/getOpenQty",
  wdcControllerV2.getOpenQty
);

router.post(
  "/v2/submitWdc",
  verifyAccessToken,
  upload,
  wdcControllerV2.submitByVendor
);

router.post(
  "/v2/cancel-request",
  verifyAccessToken,
  wdcControllerV2.submitCancelRequest
);

router.post(
  "/v2/cancel-by-grse",
  verifyAccessToken,
  wdcControllerV2.cancelledByGrse
);

router.post(
  "/v2/updateWdc",
  verifyAccessToken,
  upload,
  wdcControllerV2.submitByGrse
);

router.get(
  "/getWdc",
  verifyAccessToken,
  wdcControllerV2.getWdc
);

router.get(
  "/v2/wdcList",
  verifyAccessToken,
  wdcControllerV2.list
);

module.exports = router;
