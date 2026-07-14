const express = require("express");
const router = express.Router();
const controller = require("../../controllers/sapController/userController");
// const { basicAuthVerification } = require("../../services/jwt.services");

/* -------------------------------------------------------------
   USER / SAP ROUTES
-------------------------------------------------------------- */

router.post("/reservation", controller.reservation);

// router.get(
//   "/reservation",
//   basicAuthVerification,
//   controller.reservationList
// );

router.post("/reservationReport", controller.reservationList);

router.post("/serviceEntry", controller.serviceEntry);

router.post("/serviceEntryElss", controller.serviceEntryLineItem);

module.exports = router;
