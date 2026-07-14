const router = require("express").Router();
const { loginLimiter, verifyOtpLimiter, sendOtpLimiter, actionLimiter, browsingLimiter, updatePasswordLimiter, forgotPasswordOtpLimiter } = require("../config/rateLimiter");
const authController = require("../controllers/authConroller/authController");
const { verifyAccessToken } = require("../services/jwt.services");

// ------------ auth route --------------------------------------//
router.get("/captcha",
  actionLimiter,
  authController.captchaHandler);

router.post("/sendOtp", sendOtpLimiter, authController.sendOtp);


router.post("/forgotPasswordOtp", forgotPasswordOtpLimiter, authController.forgotPasswordOtp);

router.post("/otpVefify", verifyOtpLimiter, authController.otpVefify);

router.post("/setPassword", verifyOtpLimiter, authController.setPassword);

router.post("/updatePassword", updatePasswordLimiter, verifyAccessToken, authController.updatePassword);

router.get("/department-master-list", browsingLimiter, authController.getDepartmetList);
router.get("/getListPendingEmp", browsingLimiter, verifyAccessToken, authController.getListPendingEmp);
router.post("/acceptedPendingEmp", actionLimiter, verifyAccessToken, authController.acceptedPendingEmp);

router.post("/logout", authController.logout);
router.post("/login", loginLimiter, authController.login);
router.post("/verify-login-otp", verifyOtpLimiter, authController.verifyLoginOtp);

router.post("/refresh-token", browsingLimiter, authController.refreshToken);
// router.post("/send-otp", authController.sendOtp2);

module.exports = router;
