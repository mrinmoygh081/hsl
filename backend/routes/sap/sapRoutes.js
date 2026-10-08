const router = require("express").Router();
const sdbgRoutes =  require("./sdbgRoutes");
const paymentRoutes =  require("./paymentRoutes");
const poGeneralRoutes =  require("./poGeneralRoutes");
const sapTestRoutes =  require("./testRoutes");
const materialRoutes =  require("./materialRoutes");
const qaRoutes =  require("./qaRoutes");
const masterDataRoutes =  require("./masterDataRoutes");
const storeRoutes =  require("./storeRoutes");
const userRoutes =  require("./userRoutes");
const docRoutes =  require("./documentRoutes");
const pullRoutes =  require("./pullRoutes");

/**
 * SAP API START 
 * 
 */

router.use("/sdbg", sdbgRoutes);
router.use("/payment", paymentRoutes);
router.use("/po", poGeneralRoutes);
router.use("/test", sapTestRoutes);
router.use("/material", materialRoutes);
router.use("/mdata", masterDataRoutes);
router.use("/store",storeRoutes );
router.use("/qa", qaRoutes);
router.use("/user", userRoutes);
router.use("/document", docRoutes);
router.use("/pull", pullRoutes);

module.exports = router;