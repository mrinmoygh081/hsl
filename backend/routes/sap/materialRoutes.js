const express = require("express");
const router = express.Router();

const controller = require("../../controllers/sapController/materialController");

/* -------------------------------------------------------------
   SAP MATERIAL ROUTES
-------------------------------------------------------------- */

router.post(
  "/makt",
  controller.makt
);

router.post(
  "/mseg",
  controller.mseg
);

router.post(
  "/mkpf",
  controller.mkpf
);

module.exports = router;
