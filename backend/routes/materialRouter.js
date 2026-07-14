const express = require("express");

const router = express.Router();
const controller = require("../controllers/poController/materialController");
const { verifyAccessToken } = require("../services/jwt.services");

router.post("/issue/list",
  verifyAccessToken,
  controller.materialIssue);


module.exports = router;