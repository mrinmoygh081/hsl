const express = require("express");
const router = express.Router();
const { getFilteredData } = require("../controllers/genralControlles");
const qapController = require("../controllers/poController/qapController");
const generalController = require("../controllers/poController/poGeneralController");
const shippingDocumentsController = require("../controllers/poController/shippingDocumentsController");
const { dynamicallyUpload } = require("../lib/fileUpload");
const { verifyAccessToken } = require("../services/jwt.services");
const sdbgRoutes = require("./sdbgRoutes");
const drawingRoutes = require("./drawingRoutes");
const wdcRoutes = require("./WdcRoutes");
const ilmsRoutes = require("./ilmsRoutes");
const demandeManagementRoutes = require("./demandeManagementRoutes");

const dashboardRoutes = require("./dashboardRoutes");
const downloadRoutes = require("./downloadRoutes");
const inspectionCallLetterRoutes = require("./inspectionCallLetterRoutes");
const inspectionReleaseNoteRoutes = require("./inspectionReleaseNoteRoutes");

const hrRoutes = require("./hrRoutes");
const vendorActivitiesRoutes = require("./vendorActivitiesRoutes");
const btnRoutes = require("./btnRoutes");
const bgExtensionRoutes = require("./bgExtensionRoutes");

const shippingDocumentsRoutes = require("./shippingDocumentsRoutes");
const materialRoutes = require("./materialRouter");
const { taskController } = require("../controllers/taskControllers");
const { getMyNotifications } = require("../controllers/notificationController");
const { browsingLimiter } = require("../config/rateLimiter");

// --------------------- START ROUTES ---------------------------------------------- //

// FOR CHECHING SERVER IS RUNNING ...
router.get("/ping", async (req, res) => {
  res.status(200).json({
    success: true,
    data: { queryData: req.query },
    message: "SERVER IS RUNNING ",
  });
});

// GENERAL GET API

router.get("/getFilteredData",
  verifyAccessToken,
  getFilteredData);

/**
 * PO APIS - - - START
 */
const poPrefix = "/po";
router.use(poPrefix + "/sdbg", sdbgRoutes);
router.use(poPrefix + "/drawing", drawingRoutes);
router.use(poPrefix + "/wdc", wdcRoutes);
router.use(poPrefix + "/ilms", ilmsRoutes);

router.use(poPrefix + "/dashboard", dashboardRoutes);
router.use(poPrefix + "/download", downloadRoutes);
router.use(poPrefix + "/inspectionCallLetter", inspectionCallLetterRoutes);
router.use(poPrefix + "/inspectionReleaseNote", inspectionReleaseNoteRoutes);

// DEMAND MANAGEMENT
router.use(poPrefix + "/demandeManagement", demandeManagementRoutes);
/**------------------------------------------------------------------------------------
 * HR ROUTES
--------------------------------------------------------------------------------------- */
router.use(poPrefix + "/hr", hrRoutes);
/**---------------------------------------------------------------------------------------
 * VENDOR ACTIVITY
--------------------------------------------------------------------------------------- */
router.use(poPrefix + "/vendor", vendorActivitiesRoutes);

/**---------------------------------------------------------------------------------------
 * SHIPPING DOCS
--------------------------------------------------------------------------------------- */
router.use(poPrefix + "/shippingDocuments", shippingDocumentsRoutes);

/**---------------------------------------------------------------------------------------
 * MATERIAL ROUTES
--------------------------------------------------------------------------------------- */
router.use(poPrefix + "/material", materialRoutes);

/**---------------------------------------------------------------------------------------
 * ALL BTN ROUTES
--------------------------------------------------------------------------------------- */
router.use(poPrefix + "/btn", btnRoutes);

/**-------------------------------------------------------------------------------
 * PO GENERAL ROUTES
 -------------------------------------------------------------------------------*/

router.get(poPrefix + "/poList",
  browsingLimiter,
  verifyAccessToken,
  generalController.poList);

router.get(poPrefix + "/details",
  browsingLimiter,
  verifyAccessToken,
  generalController.details);

/**-------------------------------------------------------------------------------
 * SHIPPING DETAILS
 -------------------------------------------------------------------------------*/
router.post(poPrefix + "/shippingDocuments",
  verifyAccessToken,
  [dynamicallyUpload.single("file")],
  shippingDocumentsController.shippingDocuments
);
router.get(
  poPrefix + "/ListOfShippingDocuments",
  verifyAccessToken,
  shippingDocumentsController.List
);

/**-------------------------------------------------------------------------------
 * QAP ROUTES
 -------------------------------------------------------------------------------*/

router.post(poPrefix + "/qap",
  verifyAccessToken,
  qapController.submitQAP);
  
router.get(poPrefix + "/qapList",
  verifyAccessToken,
  qapController.list
);

// QAP SAVE getQapSave deleteQapSave
router.post(poPrefix + "/insertQapSave",
  verifyAccessToken,
  dynamicallyUpload.single("file"),
  qapController.insertQapSave
);

router.get(poPrefix + "/deleteQapSave",
  verifyAccessToken,
  qapController.deleteQapSave
);

router.get(poPrefix + "/getQapSave",
  verifyAccessToken,
  qapController.getQapSave);

//internalDepartmentList
router.get(poPrefix + "/internalDepartmentList",
  verifyAccessToken,
  qapController.internalDepartmentList
);

router.get(poPrefix + "/internalDepartmentEmpList",
  verifyAccessToken,
  qapController.internalDepartmentEmpList
);

/**-------------------------------------------------------------------------------
 * MY TASK
 -------------------------------------------------------------------------------*/
router.get(poPrefix + "/task", [verifyAccessToken], (req, res) => {
  taskController(req, res);
});

/**-------------------------------------------------------------------------------
 * NOTIFICATION
 -------------------------------------------------------------------------------*/
router.get(
  poPrefix + "/notifications",
  [verifyAccessToken],
  (req, res) => {
    getMyNotifications(req, res);
  }
);

/**---------------------------------------------------------------------------------------
 * BG EXTENSION
 ---------------------------------------------------------------------------------------*/
router.use("/bg-extension", [verifyAccessToken], bgExtensionRoutes);

module.exports = router;
