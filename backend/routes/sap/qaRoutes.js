const router = require("express").Router();
const controller = require("../../controllers/sapController/qaController");

/* -------------------------------------------------------------
   SAP QA ROUTES (Express 5 compatible)
-------------------------------------------------------------- */

router.post("/qals", controller.qals);
router.post("/qals-pull", controller.qalsTableDataInsert);
router.post("/qave-pull", controller.qaveTableDataInsert);

router.post("/icgrn/report", controller.qalsReport);

module.exports = router;
