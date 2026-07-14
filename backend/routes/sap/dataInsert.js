const express = require("express");
const router = express.Router();
const dataInsert = require("../../controllers/dataInsertControllers");

/* -------------------------------------------------------------
   DATA INSERT ROUTES
-------------------------------------------------------------- */

router.post(
  "/po",
  dataInsert.insertPOData
);

module.exports = router;
