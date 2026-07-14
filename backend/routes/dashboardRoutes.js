const express = require("express");
const { verifyAccessToken } = require("../services/jwt.services");
const router = express.Router();
const dashboardController = require("../controllers/poController/dashboardController");


router.post("/", verifyAccessToken, dashboardController.dashboard);
router.get("/subdeptlist", verifyAccessToken, dashboardController.subDeptList);
router.post("/empList", verifyAccessToken, dashboardController.subDeptEmp);


module.exports = router;