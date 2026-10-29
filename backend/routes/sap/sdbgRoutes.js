const express = require("express");
const router = express.Router();
const sdbgController = require("../../controllers/sapController/sdbgController");
const { verifyAccessToken } = require("../../services/jwt.services");

/**
 * SDBG – PAYMENT ADVICE ROUTES
 */

// Inline the final path instead
router.post("/paymentAdvice/ZFI_BGM_1", (req, res) => {
  sdbgController.sdbgPaymentAdvice(req, res);
});

// SAP PO replication: per-PO BG terms / warranty / closure
router.post("/poBgTerms", (req, res) => {
  sdbgController.poBgTerms(req, res);
});

router.post("/bgList", verifyAccessToken, (req, res) => {
  sdbgController.bgList(req, res);
});

module.exports = router;
