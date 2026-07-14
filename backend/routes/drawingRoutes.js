const express = require("express");
const { verifyAccessToken } = require("../services/jwt.services");
const drawingController = require("../controllers/poController/drawingController");
const { dynamicallyUpload } = require("../lib/fileUpload");

const router = express.Router();

/* -------------------------------------------------------------
   DRAWING ROUTES (Express 5 Compatible)
-------------------------------------------------------------- */

router.post(
  "/submit",
  verifyAccessToken,
  dynamicallyUpload.single("file"),
  drawingController.submitDrawingFn
);

router.post(
  "/update",
  verifyAccessToken,
  dynamicallyUpload.single("file"),
  drawingController.updateDrawingFn
);

router.get(
  "/drawingList",
  verifyAccessToken,
  drawingController.list
);

router.get(
  "/assigneeList",
  verifyAccessToken,
  drawingController.assigneeList
);

router.get(
  "/getCurrentAssignee",
  verifyAccessToken,
  drawingController.getCurrentAssignee
);

module.exports = router;
