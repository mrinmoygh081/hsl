/* eslint-disable no-undef */
const rateLimit = require('express-rate-limit');
const Message = require("../utils/messages");
const { resSend } = require("../lib/resSend");
const LIMIT_TIME_IN_MS = 1 * 60 * 1000;
const MAX_REQUEST = parseInt(process.env.MAX_REQUEST, 10) || 100;


const globalRateLimiter = rateLimit({
  windowMs: LIMIT_TIME_IN_MS,
  max: MAX_REQUEST,
  message: `Too many requests from this IP, please try again after ${LIMIT_TIME_IN_MS / (60 * 1000)} minutes.`,
  standardHeaders: true,
  legacyHeaders: false,
});
// --- FIX END ---

// Helper function to create limiters easily
const createLimiter = (minutes, maxRequests, actionName) => {
  return rateLimit({
    windowMs: minutes * 60 * 1000,
    max: maxRequests,
    standardHeaders: true,
    legacyHeaders: false,
    // keyGenerator: (req, res) => {
    //   return rateLimit.ipKeyGenerator(req, res);
    // },


    handler: (req, res) => {
      // Ensure Message.TOO_MANY_REQUEST_FROM_IP is defined, otherwise fallback to string
      const msgText = Message.TOO_MANY_REQUEST_FROM_IP || "Too many requests";
      const msg = `${msgText}. Please wait ${minutes} minutes before retrying ${actionName}.`;
      return resSend(res, false, 429, msg, null);
    }
  });
};

// 1. Login Limiter
const loginLimiter = createLimiter(15, 5, "login");

// 2. Send OTP Limiter
const sendOtpLimiter = createLimiter(2, 3, "sending OTP");

// 3. Verify OTP Limiter
const verifyOtpLimiter = createLimiter(5, 8, "verification");


// 4. any action realted apis, submission, approved
const actionLimiter = createLimiter(1, 10, "submission"); // 10 reqs / 1 min

// 5. Get apis Lists, Details, Dashboards
const browsingLimiter = createLimiter(1, 60, "data_fetch"); // 60 reqs / 1 min
const updatePasswordLimiter = createLimiter(15, 5, "updatePwd"); // 5 reqs / 15 min
const forgotPasswordOtpLimiter = createLimiter(15, 5, "forgotPwddOtp"); // 5 reqs / 5 min

module.exports = { globalRateLimiter, 
  loginLimiter, 
  sendOtpLimiter, 
  verifyOtpLimiter, 
  actionLimiter, 
  browsingLimiter,
  updatePasswordLimiter,
  forgotPasswordOtpLimiter
 };