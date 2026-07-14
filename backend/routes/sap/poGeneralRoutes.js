const router = require("express").Router();
const dataInsert = require("../../controllers/dataInsertControllers");

/* -------------------------------------------------------------
   SAP PO APIs
-------------------------------------------------------------- */

router.post(
  "/new",
  dataInsert.insertPOData
);

router.post(
  "/archive",
  dataInsert.archivePo
);

module.exports = router;
