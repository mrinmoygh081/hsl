const express = require("express");
const router = express.Router();
const demandeManagementController = require("../controllers/poController/demandeManagementController");
const { verifyAccessToken } = require("../services/jwt.services");

/* -------------------------------------------------------------
   DEMANDE MANAGEMENT ROUTES
-------------------------------------------------------------- */

router.post(
  "/insert",
  verifyAccessToken,
  demandeManagementController.insert
);

router.get(
  "/list",
  verifyAccessToken,
  demandeManagementController.list
);

router.get(
  "/getRestAmount",
  verifyAccessToken,
  demandeManagementController.getRestAmount
);

module.exports = router;
