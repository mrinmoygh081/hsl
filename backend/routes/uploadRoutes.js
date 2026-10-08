const express = require("express");
const router = express.Router();

const {
  upload,
  uploadExcelData,
  uploadPdfZipFile,
  dynamicallyUpload,
} = require("../lib/fileUpload");

const uploadController = require("../controllers/uploadController");
const { verifyAccessToken } = require("../services/jwt.services");
const { uploaFileStreamController2 } = require("../controllers/uploadController2");
const { deleteSingleFile } = require("../lib/deleteFile");

/* -------------------------------------------------------------
   UPLOAD ROUTES (Express 5 Compatible)
-------------------------------------------------------------- */

router.post("/",
  verifyAccessToken,
  upload.single("file"),
  uploadController.uploadImage
);

router.post("/tncminutes",
  verifyAccessToken,
  dynamicallyUpload.single("file"),
  uploadController.uploadTNCMinuts
);

router.post("/excelFile",
  verifyAccessToken,
  uploadExcelData.single("file"),
  uploadController.updoadExcelFileController
);

router.post("/compliance-file",
  // checkServerAccess(NIC_SERVER),
  verifyAccessToken,
  // uploadPdfZipFile.single("file"),
  uploaFileStreamController2
);

router.post(
  "/fileStream",
  verifyAccessToken,
  uploaFileStreamController2
);

router.post(
  "/delete",
  verifyAccessToken,
  deleteSingleFile
);

module.exports = router;
