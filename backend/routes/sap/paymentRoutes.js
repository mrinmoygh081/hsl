const express = require("express");
const router = express.Router();

const paymentController = require("../../controllers/sapController/paymentController");
const btnController = require("../../controllers/sapController/btnControllers");
const { dynamicallyUpload } = require("../../lib/fileUpload");

/* -------------------------------------------------------------
   SAP PAYMENT ROUTES
-------------------------------------------------------------- */

router.post(
  "/voucher",
  dynamicallyUpload.single("file"),
  paymentController.addPaymentVoucher
);

router.post(
  "/advise",
  paymentController.newPaymentAdvice
);

router.post(
  "/ztfi_bil_deface",
  paymentController.ztfi_bil_deface
);

router.post(
  "/ztfi_bil_deface_report",
  paymentController.ztfi_bil_deface_report
);

router.post(
  "/advise/report",
  paymentController.adviceDownload
);

router.post(
  "/zbts_st",
  btnController.zbts_st
);

router.post(
  "/zbts_bstatus",
  btnController.zbts_bstatus_update
);

module.exports = router;
