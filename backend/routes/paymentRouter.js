// const express = require("express");
// const { verifyAccessToken, authorizeRoute } = require("../services/jwt.services");
// const router = express.Router();
// const paymentControllers = require("../controllers/paymentControllers");
// const { uploadExcelFile } = require("../lib/fileUpload");


// router.post("/add", [], [verifyAccessToken, authorizeRoute], (req, res) => {
//     paymentControllers.newPayment(req, res);
//   });
  
//   router.post("/update/:pId", [], [verifyAccessToken, authorizeRoute], (req, res) => {
//     paymentControllers.updatePayment(req, res);
//   });
  
//   router.post("/delete/:pId", [], [verifyAccessToken, authorizeRoute], (req, res) => {
//     paymentControllers.deletePayment(req, res);
//   });
  
//   router.get("/all", [], [verifyAccessToken, authorizeRoute], (req, res) => {
//     paymentControllers.allPaymentList(req, res);
//   });

//   router.post("/addByXLS",
//   [verifyAccessToken, authorizeRoute],
//   uploadExcelFile.single("file"),
//   paymentControllers.updoadExcelFileController);


//   module.exports = router;