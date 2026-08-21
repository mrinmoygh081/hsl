const express = require("express");
const router = express.Router();

const {
  submitBTN,
  fetchBTNByNum,
  getBTNData,
  submitBTNByDO,
  fetchBTNByNumForDO,
  getGrnIcgrnByInvoice,
  fetchBTNList,
  assignToFiStaffHandler,
  getFinanceEmpList,
  checkInvoceFile,
  getExtractedData,
} = require("../controllers/btnControllers");

const {
  submitBtnServiceHybrid,
  getWdcInfoServiceHybrid,
  initServiceHybrid,
  getBtnData,
  actionByCertifyAuthority,
  serviceBtnAssignToFiStaff,
} = require("../controllers/btnServiceHybridControllers");

const jccBtnController = require("../controllers/btnJccController");
const abhController = require("../controllers/btnAdvPaymentAgainstBgController");
const btnPbgControllers = require("../controllers/btnPbgControllers");
const {
  submitIncorrectDuct,
  getGstnByPo,
  getIncorrectDeductionData,
} = require("../controllers/btnIncorrectDuctControllers");
const {
  btnmw,
  btnAdvanceBillHybridUploadFile,
  serviceBtnFilesUpload,
  btnJccUploadFile,
} = require("../services/btnmw");
const { verifyAccessToken } = require("../services/jwt.services");
const {
  checkVendorLogin,
  checkServerAccess,
} = require("../middleware/gatekeeper");
const { NIC_SERVER, LAN_SERVER } = require("../lib/constant");
const { uploadSinglePdf } = require("../lib/fileUpload");

/* -------------------- MATERIAL BTN -------------------- */
router.get("/", verifyAccessToken, fetchBTNList);
router.get("/check-invoice", verifyAccessToken, checkInvoceFile);
router.get("/getBTNData", verifyAccessToken, getBTNData);
router.get("/btn_num", verifyAccessToken, fetchBTNByNum);
router.get("/btn_do", verifyAccessToken, fetchBTNByNumForDO);

const upload = btnmw();

// VENDOR SUBMIT BTN
router.post(
  "/BillsMaterialHybrid",
  verifyAccessToken,
  checkServerAccess(NIC_SERVER),
  submitBTN,
);

// DO SUBMIT BTN
router.post("/BillsMaterialHybridByDO", verifyAccessToken, submitBTNByDO);
// FINANCE ACTIVITY
router.post(
  "/assignToFiStaff",
  verifyAccessToken,
  checkServerAccess(LAN_SERVER),
  assignToFiStaffHandler,
);

router.get("/getFinanceEmpList", verifyAccessToken, getFinanceEmpList);

router.post(
  "/extractInvoice",
  verifyAccessToken,
  uploadSinglePdf.single("file"),
  getExtractedData,
);



router.post(
  "/getGrnIcgrnByInvoice",
  verifyAccessToken,
  getGrnIcgrnByInvoice
);

/* -------------------- SERVICE BTN -------------------- */
router.post(
  "/submitServiceHybrid",
  verifyAccessToken,
  checkServerAccess(NIC_SERVER),
  serviceBtnFilesUpload(),
  submitBtnServiceHybrid
);

router.get("/initServiceHybrid", verifyAccessToken, initServiceHybrid);
router.post(
  "/submitSBtnByCAuthorty",
  verifyAccessToken,
  checkServerAccess(LAN_SERVER),
  actionByCertifyAuthority
);
router.post(
  "/submitSBtnByFAuthorty",
  verifyAccessToken,
  checkServerAccess(LAN_SERVER),
  serviceBtnAssignToFiStaff
);
router.post("/getWdcInfoServiceHybrid", getWdcInfoServiceHybrid);
router.get("/getServiceBtnData", getBtnData);

/* -------------------- BTN PBG -------------------- */
router.post(
  "/pbg",
  verifyAccessToken,
  checkServerAccess(NIC_SERVER),
  upload,
  btnPbgControllers.submitPbgBTN
);

router.post(
  "/btnPbgSubmitByDO",
  verifyAccessToken,
  checkServerAccess(LAN_SERVER),
  upload,
  btnPbgControllers.btnPbgSubmitByDO
);

router.get("/pbg", verifyAccessToken, btnPbgControllers.getPBGData);

/* -------------------- ADVANCE BILL HYBRID BTN -------------------- */
router.get(
  "/adv-bill-against-bg",
  verifyAccessToken,
  abhController.getAdvBillAgainstBgData
);

router.post(
  "/submit-adv-bill-against-bg",
  verifyAccessToken,
  btnAdvanceBillHybridUploadFile(),
  abhController.submitAdvanceBillHybrid
);

router.post(
  "/submit-adv-bill-against-bg-do",
  verifyAccessToken,
  abhController.sbhSubmitBTNByDO
);

router.post(
  "/submit-adv-bill-against-bg-fi",
  verifyAccessToken,
  abhController.sbhAssignToFiStaff
);

/* -------------------- INCORRECT DUCT BTN -------------------- */
router.post(
  "/submitIncorrectDuct",
  verifyAccessToken,
  checkServerAccess(NIC_SERVER),
  checkVendorLogin,
  upload,
  submitIncorrectDuct
);

router.get("/getGstnByPo", verifyAccessToken, getGstnByPo);
router.get("/incorrect-dect", verifyAccessToken, getIncorrectDeductionData);

/* -------------------- BTN JCC -------------------- */
router.post(
  "/submit-jcc",
  verifyAccessToken,
  checkServerAccess(NIC_SERVER),
  btnJccUploadFile(),
  jccBtnController.submitJccBtn
);

router.get("/jcc", verifyAccessToken, jccBtnController.getJccBtnData);
router.post(
  "/submit-jcc-ca",
  verifyAccessToken,
  checkServerAccess(LAN_SERVER),
  jccBtnController.jccBtnforwordToFinace
);

module.exports = router;
