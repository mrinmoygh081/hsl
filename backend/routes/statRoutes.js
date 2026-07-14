const express = require("express");
const router = express.Router();
const { statsForBG, statsForBTN, statsForQA, stats, statsForWDC, statsForDrawing } = require("../controllers/statControllers");
const { verifyAccessToken } = require("../services/jwt.services");

/* -------------------------------------------------------------
   STAT ROUTES
-------------------------------------------------------------- */

router.get("/bg", verifyAccessToken, statsForBG);
router.get("/btn", verifyAccessToken, statsForBTN);
router.get("/qap", verifyAccessToken, statsForQA);
router.get("/drawing", verifyAccessToken, statsForDrawing);
router.get("/wdc", verifyAccessToken,  statsForWDC);

router.get("/", verifyAccessToken, stats);
// router.get("/bg-extension",  statsForBgExtension);

module.exports = router;
