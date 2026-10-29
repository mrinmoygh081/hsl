const express = require("express");
const router = express.Router();
const holidayController = require("../controllers/holidayController");
const { uploadExcelData } = require("../lib/fileUpload");
const { verifyAccessToken } = require("../services/jwt.services");

/* -------------------------------------------------------------
   HOLIDAY CALENDAR ROUTES (maintained by HR, visible to all)
-------------------------------------------------------------- */

router.get("/", verifyAccessToken, holidayController.getHolidays);
router.post("/", verifyAccessToken, holidayController.addHoliday);
router.post("/upload", verifyAccessToken, uploadExcelData.single("file"), holidayController.uploadHolidays);
router.delete("/:id", verifyAccessToken, holidayController.deleteHoliday);

module.exports = router;
