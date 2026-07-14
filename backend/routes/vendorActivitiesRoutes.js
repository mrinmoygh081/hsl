
const express = require("express");
const router = express.Router();
const vendorActivitiesController = require("../controllers/poController/vendorActivitiesController");
const { dynamicallyUpload } = require("../lib/fileUpload");
const { verifyAccessToken, } = require("../services/jwt.services");


router.post("/vendorActivities",
    verifyAccessToken,
    dynamicallyUpload.single("file"),
    vendorActivitiesController.vendorActivities);

router.get("/list",
    verifyAccessToken,
    vendorActivitiesController.list);



module.exports = router;