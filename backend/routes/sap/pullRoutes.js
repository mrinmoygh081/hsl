const router = require("express").Router();
const controller = require("../../controllers/sapController/pullController");
const { LAN_SERVER } = require("../../lib/constant");
const { checkServerAccess } = require("../../middleware/gatekeeper");
const { verifyAccessToken } = require("../../services/jwt.services");

/* -------------------------------------------------------------
   SAP PULL APIs
-------------------------------------------------------------- */

router.post(
  "/po",
  verifyAccessToken,
  checkServerAccess(LAN_SERVER),
  controller.pullPo
);
router.get(
  "/store-actions",
  // verifyAccessToken,
  // checkServerAccess(LAN_SERVER),
  controller.pullStoreAction
);

module.exports = router;
