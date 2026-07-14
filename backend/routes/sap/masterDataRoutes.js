const express = require("express");
const router = express.Router();

const controller = require("../../controllers/sapController/masterDataController");

/* -------------------------------------------------------------
   SAP MASTER DATA ROUTES
-------------------------------------------------------------- */

router.post(
  "/lfa1",
  controller.lfa1
);

router.post(
  "/addUser",
  controller.addUser
);

module.exports = router;
