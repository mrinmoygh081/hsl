/* eslint-disable no-undef */
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const svgCaptcha = require("svg-captcha");
const { getAccessToken, getRefreshToken, verifiedRefreshTokenData } = require("../../services/jwt.services");
const { resSend } = require("../../lib/resSend");
const { AUTH, REGISTRATION_OTP, EMPLAYEE_MASTER_PA0002, VENDOR_MASTER_LFA1 } = require("../../lib/tableName");
// const { USER_TYPE_VENDOR, INSERT, UPDATE, ASSIGNER, LAN_SERVER, USER_TYPE_VENDOR_TEXT, STAFF, USER_TYPE_GRSE_TEXT, YES_SORT_FORM, NIC_SERVER, SESSION_STAGE_AWAITING_OTP } = require("../../lib/constant");
const { USER_TYPE_VENDOR, INSERT, UPDATE, ASSIGNER, LAN_SERVER, USER_TYPE_VENDOR_TEXT, STAFF, USER_TYPE_GRSE_TEXT, NIC_SERVER, SESSION_STAGE_AWAITING_OTP, USER_TYPE_GRSE } = require("../../lib/constant");
// const rolePermission = require("../../lib/role/deptWiseRolePermission");
// const { getEpochTime, generateQuery, maskEmailAddress, generateInsertUpdateQuery } = require("../../lib/utils");
const { getEpochTime, generateQuery, maskEmailAddress } = require("../../lib/utils");
const Message = require("../../utils/messages");
const localData = require("../../utils/localData.json");
const { getQuery, poolClient, poolQuery } = require("../../config/pgDbConfig");
const { EMAIL_TEMPLAE } = require("../../templates/mail-template");
const { SENDMAIL, SENDMAILFROMNIC } = require("../../lib/mailSend");
// const { convertIsoTimestampToYYYYMMDDHHMMSSMs } = require("../../utils/dateTime");
const { decryptData } = require("../../utils/encryption");
const { isAccountLocked, handleFailedAttempt, fetchUserEmail, processAndSendOtp, verifyOtpFromDb, resetAttempts } = require("../../services/auth.services");
const { STATUS_VERIFIED } = require("../../lib/status");
const ACCESS_TOKEN_VALIDITY = process.env.ACCESS_TOKEN_VALIDITY;
const REFRESH_TOKEN_VALIDITY = process.env.REFRESH_TOKEN_VALIDITY;

/**---------------------------------------------------------------------------------
                      AUTH API START
 ------------------------------------------------------------------------------------*/
// const MAX_AGE = 12 * 60 * 60 * 1000;
let captchaStore = {}; // { sessionId: captchaText }

const captchaHandler = async (req, res) => {
  const cap = svgCaptcha.create({
    size: 5,
    noise: 2,
    color: true,
    background: "#f0f0f0",
    ignoreChars: '0o1il'
  });

  req.session.captcha = cap.text.toLowerCase();
  const sessionId = Date.now().toString();
  captchaStore[sessionId] = cap.text.toLowerCase();

  return resSend(res, true, 200, "Captcha Generated", {
    sessionId,
    captchaSvg: cap.data,
  });
};

// Global variabel
// const MAX_ATTEMPTS = parseInt(process.env.MAX_LOGIN_ATTEMPTS) || 5; // 5 times
// const LOCK_TIME_MS = parseInt(process.env.LOCK_TIME_AFTER_WRONG_PWD_ENTRY || 5) * 60 * 1000; // 5 minutes

// /**
//  * Utility: check if account is locked
//  */
// async function isAccountLocked(client, vendorCode) {
//   const checkAcoutLock = await poolQuery({
//     client,
//     query: `SELECT attempt_count, lock_until FROM auth_login_attempts WHERE vendor_code = $1`,
//     values: [vendorCode],
//   });

//   if (!checkAcoutLock.length) return false;

//   const { lock_until } = checkAcoutLock[0];
//   return lock_until && new Date(lock_until) > new Date();
// }

// /**
//  * Utility: record failed attempt
//  */
// // eslint-disable-next-line no-unused-vars
// async function recordFailedAttempt(client, vendorCode, currentAttempts, isLocked) {
//   const attempts = parseFloat(currentAttempts) + 1;
//   const lockUntil = attempts >= MAX_ATTEMPTS ? convertIsoTimestampToYYYYMMDDHHMMSSMs(new Date(Date.now() + LOCK_TIME_MS)) : null;
//   const saveIsLocked = attempts >= MAX_ATTEMPTS ? YES_SORT_FORM : null;
//   const wrongAttempPayload = { vendor_code: vendorCode, attempt_count: attempts, lock_until: lockUntil, is_locked: saveIsLocked };

//   // if (attempts >= MAX_ATTEMPTS && isLocked && isLocked === YES_SORT_FORM) {

//   //   await poolQuery({
//   //     client,
//   //     query: `INSERT INTO auth_login_attempts (vendor_code, attempt_count, is_locked)
//   //        VALUES ($1, $2, $3)
//   //        ON CONFLICT (vendor_code)
//   //        DO UPDATE SET attempt_count = $2, is_locked = $3`,
//   //     values: [vendorCode, attempts, YES_SORT_FORM]
//   //   });
//   // } else {

//   //   await poolQuery({
//   //     client,
//   //     query: `INSERT INTO auth_login_attempts (vendor_code, attempt_count, lock_until, is_locked)
//   //        VALUES ($1, $2, $3, $4)
//   //        ON CONFLICT (vendor_code)
//   //        DO UPDATE SET attempt_count = $2, lock_until = $3, is_locked = $4`,
//   //     values: [vendorCode, attempts, lockUntil, saveIsLocked]
//   //   });

//   // }

//   const { q, val } = await generateInsertUpdateQuery(wrongAttempPayload, "auth_login_attempts", ["vendor_code"]);
//   await poolQuery({ client, query: q, values: val });
//   return attempts >= MAX_ATTEMPTS;
// }

// /**
//  * Utility: reset attempts after successful login
//  */
// async function resetAttempts(client, vendorCode) {
//   await poolQuery({
//     client,
//     query: `DELETE FROM auth_login_attempts WHERE vendor_code = $1`,
//     values: [vendorCode],
//   });
// }

/**
 * Login Route
 */
// const login = async (req, res) => {
//   let client;

//   try {
//     const { vendor_code, password, captchaValue, sessionId } = req.body;

//     if (!vendor_code || typeof vendor_code !== "string" || !password || typeof password !== "string") {
//       return resSend(res, false, 200, Message.MANDATORY_INPUTS_REQUIRED);
//     }

//     client = await poolClient();
//     // Check lock status
//     const isAccLocked = await isAccountLocked(client, vendor_code);

//     if (isAccLocked) {
//       // return resSend(res, true, 403, "ACCOUNT_LOCKED_FOR_5_MINUTES");
//       return resSend(res, false, 200, Message.TOO_MANY_ATTEMPTS_ACCOUNT_LOCKED);
//     }

//     if (!captchaValue || !sessionId) {
//       return resSend(res, false, 200, Message.ENTER_VALID_CAPTHA);
//     }

//     const storedCaptcha = captchaStore[sessionId];

//     if (!storedCaptcha) {
//       return resSend(res, false, 200, Message.CAPTHA_GEN_ERROR);
//     }

//     if (storedCaptcha !== captchaValue.toLowerCase()) {
//       return resSend(res, false, 200, Message.INVALID_CAPTCHA);
//     }
//     // Prevent reuse
//     delete captchaStore[sessionId];

//     let authApproveQuery = "SELECT vendor_code, is_active FROM auth where vendor_code = $1";
//     let userCheck = await poolQuery({ client, query: authApproveQuery, values: [vendor_code] });

//     if (!userCheck.length) {
//       return resSend(res, false, 200, Message.INVALID_CREDINTIAL, { vendor_code });
//     }

//     if (userCheck[0]?.is_active !== 1) {
//       return resSend(res, false, 200, Message.USER_NOT_APPROVED, { vendor_code });
//     }

//     const login_Q = `SELECT t1.vendor_code, t1.user_type, t1.username, t1.password, t1.department_id, 
//                           t1.internal_role_id,  t2.name AS department_name, t3.name AS role
//                   FROM auth AS t1 
// 			              LEFT JOIN
//                       depertment_master AS t2 ON (t1.department_id = t2.id)
//                     LEFT JOIN 	internal_role_master AS t3 ON	(t1.internal_role_id = t3.id)
//                       WHERE t1.vendor_code = $1 AND t1.is_active = 1`;

//     const users = await poolQuery({ client, query: login_Q, values: [vendor_code] });
//     if (!users.length) {
//       // return resSend(res, true, 404, Message.INVALID_CREDINTIAL);
//       return resSend(res, false, 200, Message.INVALID_CREDINTIAL);
//     }

//     let user = users[0];
//     let permission = {};
//     let userDetails = [];

//     // 🔑 Validate password and decrypt password
//     let decreptedPasseword = decryptData(password);

//     // console.log("decreptedPasseword", typeof decreptedPasseword, decreptedPasseword,  password);

//     const match = await bcrypt.compare(decreptedPasseword.toString(), user.password);
//     // deleting password from response
//     decreptedPasseword = null;
//     delete user.password;

//     if (!match) {
//       const attemptQuery = `SELECT attempt_count, is_locked FROM auth_login_attempts WHERE vendor_code = $1`;
//       const attemptRows = await poolQuery({ client, query: attemptQuery, values: [vendor_code] });

//       const currentAttempts = attemptRows.length ? parseInt(attemptRows[0].attempt_count) : 0;
//       const is_locked = attemptRows.length ? attemptRows[0].is_locked : null;
//       const locked = await recordFailedAttempt(client, vendor_code, currentAttempts, is_locked);

//       if (locked) {
//         return resSend(res, false, 200, Message.TOO_MANY_ATTEMPTS_ACCOUNT_LOCKED);
//       }

//       return resSend(res, false, 200, Message.INVALID_CREDINTIAL);
//     }

//     if (user.user_type === USER_TYPE_VENDOR) {
//       const vendorDetailsQ = `SELECT t1.NAME1 AS name, t1.email FROM lfa1 AS t1 WHERE t1.LIFNR = $1`;
//       userDetails = await poolQuery({ client, query: vendorDetailsQ, values: [vendor_code] });

//       if (userDetails.length) {
//         user = { ...user, ...userDetails[0] };
//         // const { department_name, role } = user;
//         const deptPermission = rolePermission["VENDOR"];
//         // eslint-disable-next-line no-unused-vars
//         permission = deptPermission;
//       }
//     }
//     if (user.user_type !== USER_TYPE_VENDOR) {
//       const grseDetaisQ = `SELECT t1.CNAME AS name,t1.EMAIL AS email FROM pa0002 AS t1 WHERE t1.PERNR = $1`;

//       userDetails = await poolQuery({ client, query: grseDetaisQ, values: [vendor_code] });
//       if (userDetails.length) {
//         user = { ...user, ...userDetails[0] };
//         const { department_name, role } = user;
//         const deptPermission = rolePermission[department_name];
//         if (deptPermission) {
//           deptPermission[role] = true;
//         }
//         // permission = deptPermission ? deptPermission : {};
//       }
//     }

//     // ✅ Successful login → reset attempts
//     await resetAttempts(client, vendor_code);

//     // 🔐 Generate tokens
//     const payload = {
//       username: user.username,
//       vendor_code: user.vendor_code,
//       user_type: user.user_type,
//       department_id: user.department_id,
//       internal_role_id: user.internal_role_id,
//     };

//     const accessToken = getAccessToken(payload, "1d");
//     const refreshToken = getRefreshToken(payload, "7d");

//     if (!accessToken || !refreshToken) {
//       return resSend(res, false, 500, Message.TOKEN_GENERATION_ERROR);
//     }

//     resSend(res, true, 200, Message.USER_AUTHENTICATION_SUCCESS, { user }, { accessToken, refreshToken });
//   } catch (err) {
//     console.error("Login error:", err);
//     resSend(res, false, 500, Message.SOMTHING_WENT_WRONG, err.message);
//   } finally {
//     if (client) client.release();
//   }
// };

const sendOtp = async (req, res) => {
  let client;
  try {
    const { captchaValue, ...obj } = req.body;

    if (!obj.user_type || !obj.user_code) {
      return resSend(res, false, 200, Message.INVALID_PAYLOAD, null, null);
    }

    // Captcha Verification (Session based)
    // Check if session has captcha (it might have expired) and if it matches

    if (!req.session.captcha || req.session.captcha !== captchaValue?.toLowerCase()) {
      return resSend(res, false, 200, Message.INVALID_CAPTCHA);
    }

    // Security: Clear captcha immediately so it cannot be reused
    req.session.captcha = null;

    if (obj.user_type === USER_TYPE_VENDOR_TEXT && process.env.SERVER_ENV == LAN_SERVER) {
      return resSend(res, false, 200, Message.VENDOR_REGISTER_SERVER_ERR_MSG, "https://obps.grse.in", null);
    }

    /**
     * DYNAMIC TABLE AND FILED SELECTION FOR GET OTP
    */

    let tableName = VENDOR_MASTER_LFA1;
    let fieldName = "lifnr";
    let filterValue = obj?.user_code;

    if (obj.user_type === USER_TYPE_GRSE_TEXT) {
      tableName = EMPLAYEE_MASTER_PA0002;
      fieldName = "pernr";
      filterValue = parseInt(obj?.user_code);
    }

    client = await poolClient();

    const validUser = await poolQuery({
      client,
      query: `SELECT email  FROM ${tableName} where ${fieldName} = $1`,
      values: [filterValue]
    });
   
    if (!validUser.length) {
      return resSend(res, false, 200, Message.USER_NOT_FOUND, { user_code: obj?.user_code }, null);
    }

    if (!validUser[0].email || validUser[0].email == "") {
      return resSend(res, false, 200, Message.NO_VALID_EMAIL, null, null);
    }

    const otp = crypto.randomInt(100000, 999999);
    const otpValidInSec = parseInt(process.env.OTP_MAX_VALIDITY);
    // SEND MAIL TO USER //
    let mailOptions = {
      to: validUser[0].email,
      from: process.env.MAIL_SEND_MAIL_ID,
      subject: Message.REGISTRATION_OTP_EMAIL_SUBJECT,
      html: EMAIL_TEMPLAE(`Your One Time Password(OTP) to Complete Registration in OBPS is : ${otp}. Valid for ${otpValidInSec} second, Do not share it with anyone.`),
    };
    try {
      // await SENDMAIL(mailOptions);
      if (process.env.SERVER_ENV == LAN_SERVER) {
        await SENDMAIL(mailOptions);

      } else if (process.env.SERVER_ENV == NIC_SERVER) {
        const mail_response = await SENDMAILFROMNIC(process.env.MAIL_SEND_MAIL_ID, mailOptions.to, mailOptions.subject, mailOptions.html);
        console.log("mail_response", mailOptions.to, mail_response);

      }


      // delete existing record on same user code
      let delOtp = `DELETE FROM ${REGISTRATION_OTP} WHERE user_code = '${obj.user_code}'`;
      await poolQuery({
        client,
        query: delOtp,
        values: [],
      });
      // add otp record
      const insertRegistrationOtp = {
        user_type: obj.user_type,
        functional_area: obj.functional_area ? obj.functional_area : null,
        role: obj.role ? obj.role : null,
        sub_dept_id: obj.sub_dept_id ? obj.sub_dept_id : null,
        user_code: obj.user_code,
        otp: otp,
        created_at: getEpochTime(),
        status: "PENDING",
      };

      let addOtpQ = generateQuery(INSERT, REGISTRATION_OTP, insertRegistrationOtp);

      await poolQuery({ client, query: addOtpQ["q"], values: addOtpQ["val"] });

      // mask email like kam*@g*m.com
      const maskEmail = maskEmailAddress(validUser[0].email);

      resSend(
        res,
        true,
        200,
        `OTP has been sent to your registered email address: ${maskEmail}. Please check mailbox to complete registration.`,
        { username: obj.user_code, email: maskEmail, otpValidInSec },
        null
      );
    } catch (err) {
      console.error("error", err);
      return resSend(res, false, 200, Message.SOMTHING_WENT_WRONG, err.message, null);
    }
  } catch (error) {
    console.error("[error] forgotPasswordOtp", error);
    resSend(res, false, 500, Message.SOMTHING_WENT_WRONG, null);
  } finally {
    if (client) client.release();
  }

};

const forgotPasswordOtp = async (req, res) => {
  let client;

  try {
    client = await poolClient();
    // const { captchaValue, sessionId, is_resend, ...obj } = req.body;
    const { captchaValue, ...obj } = req.body;
    if (!obj.user_code) {
      return resSend(res, false, 200, Message.INVALID_PAYLOAD, null, null);
    }

    // ✅ UPDATE 1: Captcha Verification (Session based)
    // Check if session has captcha (it might have expired) and if it matches

    if (!req.session.captcha || req.session.captcha !== captchaValue?.toLowerCase()) {
      return resSend(res, false, 200, Message.INVALID_CAPTCHA);
    }

    // Security: Clear captcha immediately so it cannot be reused
    req.session.captcha = null;

    // if (is_resend !== "y") {
    //   if (!captchaValue || !sessionId) {
    //     return resSend(res, false, 200, "CAPTCHA_REQUIRED");
    //   }

    //   const storedCaptcha = captchaStore[sessionId];

    //   if (!storedCaptcha) {
    //     return resSend(res, false, 200, "CAPTCHA_EXPIRED");
    //   }

    //   if (storedCaptcha !== captchaValue.toLowerCase()) {
    //     return resSend(res, false, 200, "INVALID_CAPTCHA");
    //   }
    //   // Prevent reuse
    //   delete captchaStore[sessionId];
    // }

    let tableName = obj.user_code.length == 6 ? "pa0002" : "lfa1";
    let fieldName = obj.user_code.length == 6 ? "pernr" : "lifnr";

    let qry = `SELECT 
                    t1.email,t2.user_type,t2.department_id,t2.internal_role_id
                    FROM 
                        ${tableName}
                    AS 
                        t1 
              LEFT JOIN
                      auth
                    AS 
                        t2
                    ON
                      t2.vendor_code = t1.${fieldName} :: character varying
                  
                    WHERE
                        t2.vendor_code = $1 AND t2.is_active = 1`;

    const validUser = await poolQuery({
      client,
      query: qry,
      values: [obj.user_code],
    });

    if (validUser.length == 0 || !validUser[0].email || validUser[0].email === "") {
      return resSend(res, false, 200, Message.NO_VALID_EMAIL, null, null);
    }
    const validateOtpInSec = parseInt(process.env.OTP_MAX_VALIDITY);

    const otp = crypto.randomInt(100000, 999999);
    // SEND MAIL TO USER //
    let mailOptions = {
      to: validUser[0].email,
      from: process.env.MAIL_SEND_MAIL_ID,
      subject: Message.REGISTRATION_OTP_EMAIL_SUBJECT,
      html: EMAIL_TEMPLAE(`Your One Time Password(OTP) to Reset Password in OBPS is : ${otp}. Valid for ${validateOtpInSec} seconds, Do not share it with anyone.`),
    };
    try {
      // await SENDMAIL(mailOptions);

      // await SENDMAIL(mailOptions);
      if (process.env.SERVER_ENV == LAN_SERVER) {
        await SENDMAIL(mailOptions);

      } else if (process.env.SERVER_ENV == NIC_SERVER) {
        const mail_response = await SENDMAILFROMNIC(process.env.MAIL_SEND_MAIL_ID, mailOptions.to, mailOptions.subject, mailOptions.html)
        console.log("mail_response", mailOptions.to, mail_response);
      }

      // delete existing record on same user code
      let delOtp = `DELETE FROM ${REGISTRATION_OTP} WHERE user_code = '${obj.user_code}'`;
      await poolQuery({
        client,
        query: delOtp,
        values: [],
      });
      // add otp record
      const insertRegistrationOtp = {
        user_type: validUser[0].user_type == USER_TYPE_VENDOR ? USER_TYPE_VENDOR_TEXT : "GRSE",
        functional_area: validUser[0].department_id,
        role: validUser[0].internal_role_id,
        user_code: obj.user_code,
        otp: otp,
        created_at: getEpochTime(),
        status: "PENDING",
      };

      let addOtpQ = generateQuery(INSERT, REGISTRATION_OTP, insertRegistrationOtp);
      await poolQuery({ client, query: addOtpQ["q"], values: addOtpQ["val"] });
      const maskEmail = maskEmailAddress(validUser[0].email);
      return resSend(res, true, 200, `OTP has been sent to your registered email address: ${maskEmail}. Please check mailbox to complete registration.`, null, null);
    } catch (err) {
      console.error("[error] forgotPasswordOtp1", err);
      return resSend(res, false, 200, Message.SOMTHING_WENT_WRONG, null, null);
    }
  } catch (error) {
    console.error("[error] forgotPasswordOtp2", error);
    resSend(res, false, 500, Message.SOMTHING_WENT_WRONG, null);
  } finally {
    if (client) client.release();
  }

};

const otpVefify = async (req, res) => {
  let client;
  try {
    client = await poolClient();
    const { ...obj } = req.body;
    if (!obj.otp || !obj.user_code) {
      return resSend(res, false, 200, Message.INVALID_PAYLOAD, null, null);
    }

    const milliseconds = (h, m, s) => (h * 60 * 60 + m * 60 + s) * 1000;

    // Usage
    const validateOtpInSec = parseInt(process.env.OTP_MAX_VALIDITY);
    const result = milliseconds(0, 0, validateOtpInSec);
    let start = getEpochTime() - result;

    const otpVefifyQuery = `SELECT COUNT(*) as count FROM ${REGISTRATION_OTP} where created_at BETWEEN $1 AND $2 AND user_code = $3 AND otp = $4`;
    const otpVefifyQueryRes = await poolQuery({
      client,
      query: otpVefifyQuery,
      values: [start, getEpochTime(), obj.user_code, obj.otp],
    });
    //return false;
    let msg;
    let status;
    if (otpVefifyQueryRes && otpVefifyQueryRes[0].count == 1) {
      msg = `OTP is verified.`;
      status = true;
      const whereCondition = {
        user_code: obj.user_code,
        otp: obj.otp,
      };

      const updatePayload = {
        status: "VERIFIED",
      };
      const updateVerified = generateQuery(UPDATE, REGISTRATION_OTP, updatePayload, whereCondition);
      await poolQuery({
        client,
        query: updateVerified["q"],
        values: updateVerified["val"],
      });
    } else {
      msg = `Please enter a valid OTP to continue`;
      status = false;
    }
    resSend(res, status, 200, msg, null, null);
  } catch (error) {
    console.error("[error] otpVerify", error);
    resSend(res, false, 500, Message.SOMTHING_WENT_WRONG, null, null);
  } finally {
    if (client) client.release();
  }
}
const setPassword = async (req, res) => {
  let client;
  try {
    // client = await poolClient();
    const { ...obj } = req.body;
    if (!obj.password || !obj.user_code || !obj.otp || !obj.status) {
      return resSend(res, false, 200, Message.INVALID_PAYLOAD, null, null);
    }
    if (obj.status != "CREATE" && obj.status != "UPDATE") {
      return resSend(res, false, 200, "Please send valid status.", null, null);
    }

    // const vefifyQuery = `SELECT * FROM ${REGISTRATION_OTP} where user_code = '${obj.user_code}' AND status = 'VERIFIED' AND otp = '${obj.otp}'`;

    // DB CLIENT AND TRASINSATON
    client = await poolClient();
    await client.query("BEGIN");

    const vefifyQuery = `SELECT t1.*, t2.name as deptname FROM ${REGISTRATION_OTP} AS t1
                LEFT JOIN
                depertment_master AS t2
                ON
                    t1.functional_area = t2.id WHERE t1.user_code = $1 AND t1.status = $2 AND t1.otp = $3`;

    const otpVefifyQueryRes = await poolQuery({
      client,
      query: vefifyQuery,
      values: [obj.user_code, STATUS_VERIFIED, obj.otp],
    });

    if (otpVefifyQueryRes && otpVefifyQueryRes.length == 0) {
      return resSend(res, false, 200, `OTP is incorrect!`, null, null);
    }
    const tableName = otpVefifyQueryRes[0].user_type === USER_TYPE_VENDOR_TEXT ? VENDOR_MASTER_LFA1 : EMPLAYEE_MASTER_PA0002;
    const fieldName = otpVefifyQueryRes[0].user_type === USER_TYPE_VENDOR_TEXT ? "lifnr" : "pernr";
    const checkValidUserQuery = `SELECT * FROM ${tableName} where ${fieldName} = $1`
    const validUser = await poolQuery({ client, query: checkValidUserQuery, values: [obj.user_code] });

    if (validUser.length == 0) {
      return resSend(res, false, 200, Message.USER_NOT_APPROVED, null, null);
    }

    let name;
    let username;
    if (otpVefifyQueryRes[0].user_type === USER_TYPE_VENDOR_TEXT) {
      name = validUser[0].name1;
      username = validUser[0].lifnr;
    } else {
      name = validUser[0].cname;
      username = validUser[0].pernr;
    }

    const salt = bcrypt.genSaltSync();
    let decreptedPasseword = decryptData(obj.password);
    const encrytedPassword = bcrypt.hashSync(decreptedPasseword, salt);
    const regData = {
      user_type: otpVefifyQueryRes[0].user_type == USER_TYPE_VENDOR_TEXT ? USER_TYPE_VENDOR : 2,
      department_id: otpVefifyQueryRes[0].functional_area,
      internal_role_id: otpVefifyQueryRes[0].role,
      username: username,
      password: encrytedPassword,
      name: name,
      vendor_code: obj.user_code,
      datetime: getEpochTime(),
    };

    let resMsg;
    if (otpVefifyQueryRes[0].user_type === USER_TYPE_VENDOR_TEXT || otpVefifyQueryRes[0].role == 2 || obj.status === "UPDATE") {
      regData.is_active = 1;
      resMsg = "You are authorised! Please login to get access.";
    } else {
      regData.is_active = 0;
      resMsg = "Please contact a nodal officer for approval.";
    }
    // delete existing record on same user code
    let delOtp = `DELETE FROM ${AUTH} WHERE vendor_code = $1`;
    await poolQuery({ client, query: delOtp, values: [obj.user_code] });
    // Insert new user record in auth table.
    const { q, val } = generateQuery(INSERT, AUTH, regData);
    await poolQuery({ client, query: q, values: val });

    if (otpVefifyQueryRes[0].user_type == USER_TYPE_GRSE_TEXT && otpVefifyQueryRes[0].role === ASSIGNER) {
      // SEND MAIL TO NODAL OFFICERS //

      // let getNodalOfficersQ = `SELECT t1.vendor_code, t2.email FROM auth AS t1
      //         LEFT JOIN
      //             pa0002 AS t2
      //         ON
      //             t1.vendor_code = t2.pernr  :: character varying WHERE
      //         t1.department_id = $1 AND t1.internal_role_id = $2`;

      // const getNodalOfficersR = await getQuery({
      //   query: getNodalOfficersQ,
      //   values: [otpVefifyQueryRes[0].functional_area, ASSIGNER],
      // });
      // let emails = "";
      // if (getNodalOfficersR.length > 0) {
      //   getNodalOfficersR.forEach((item) => {
      //     if (item.email && item.email != "") {
      //       if (emails === "") {
      //         emails += item.email;
      //       } else {
      //         emails += "," + item.email;
      //       }
      //     }
      //   });
      // }
      let emails = localData.registrationApprovedAuthority.map((user) => user.email).join(",");

      if (emails != "") {
        let mailOptions = {
          to: emails,
          from: process.env.MAIL_SEND_MAIL_ID,
          subject: `OBPS Registration Request.`,
          html: EMAIL_TEMPLAE(
            `${name} (${username}) trying to register as a nodal officier in ${otpVefifyQueryRes[0].deptname} depertment as nodal officer in OBPS system. \n  Please login to your OBPS portal to take the necessary action.`
          ),
        };
        // await SENDMAIL(mailOptions);


        if (process.env.SERVER_ENV == LAN_SERVER) {
          await SENDMAIL(mailOptions);

        } else if (process.env.SERVER_ENV == NIC_SERVER) {
          const mail_response = await SENDMAILFROMNIC(process.env.MAIL_SEND_MAIL_ID, mailOptions.to, mailOptions.subject, mailOptions.html)
          console.log("mail_response", mailOptions.to, mail_response);
        }
      } else {
        resMsg = "No nodal officer found.";
      }
    }

    if (otpVefifyQueryRes[0].user_type === USER_TYPE_GRSE_TEXT && otpVefifyQueryRes[0].role === STAFF) {
      const empDLQ = {
        dept_id: otpVefifyQueryRes[0].functional_area,
        internal_role_id: otpVefifyQueryRes[0].role,
        sub_dept_id: otpVefifyQueryRes[0].sub_dept_id ? otpVefifyQueryRes[0].sub_dept_id : 0,
        emp_id: obj.user_code,
      };
      // delete existing record on same user code
      let delOtp = `DELETE FROM emp_department_list WHERE emp_id = '${obj.user_code}'`;
      await poolQuery({ client, query: delOtp, values: [] });
      // Insert new user record in emp_department_list table.
      const empDLR = generateQuery(INSERT, "emp_department_list", empDLQ);
      await poolQuery({ client, query: empDLR["q"], values: empDLR["val"] });
    }

    await client.query("COMMIT");
    resSend(res, true, 200, resMsg, null, null);
  } catch (error) {
    console.error("[ERROR] setPassword ", error.message, error);
    if (client) await client.query("ROLLBACK");
    resSend(res, false, 500, Message.SOMTHING_WENT_WRONG, null, null);
  } finally {
    if (client) client.release();
  }
}
const getListPendingEmp = async (req, res) => {
  try {
    const tokenData = { ...req.tokenData };
    if (tokenData.internal_role_id != ASSIGNER) {
      resSend(res, false, 200, Message.YOU_ARE_UN_AUTHORIZED, null, null);
    }
    const vefifyQuery = `SELECT t1.vendor_code, t2.name as depertment_name, t3.name as internal_role, t4.email, t4.cname as name FROM auth AS t1
                LEFT JOIN 
                    depertment_master AS t2 
                ON 
                    t1.department_id = t2.id  
                    LEFT JOIN 
                    internal_role_master AS t3 
                ON 
                    t1.internal_role_id = t3.id
                    LEFT JOIN 
                    pa0002 AS t4 
                ON 
                    t1.vendor_code = t4.pernr :: character varying
    
                    WHERE t1.is_active = $1`;
    const otpVefifyQueryRes = await getQuery({
      query: vefifyQuery,
      values: [0],
    });
    resSend(res, true, 200, `user data fetch Succesfully.`, otpVefifyQueryRes, null);
  } catch (error) {
    console.error("[error] list of pending employee", error);
    resSend(res, false, 500, Message.SOMTHING_WENT_WRONG, null, null);
  }
};

const acceptedPendingEmp = async (req, res) => {
  let client;
  try {
    client = await poolClient();
    const tokenData = { ...req.tokenData };
    if (!req.body.status || !req.body.user_code) {
      return resSend(res, false, 200, Message.INVALID_PAYLOAD, null, null);
    }

    if (!localData.registrationApprovedAuthority.map((user) => user.manNo).includes(tokenData.vendor_code)) {
      return resSend(res, false, 200, Message.YOU_ARE_UN_AUTHORIZED, null, null);
    }

    const checkDeptQ = `SELECT department_id FROM ${AUTH} WHERE vendor_code = $1`;
    await poolQuery({ client, query: checkDeptQ, values: [req.body.user_code] });

    const updateQuery = `Update ${AUTH} set is_active = $1 WHERE vendor_code = $2`;
    await poolQuery({ client, query: updateQuery, values: [req.body.status, req.body.user_code] });

    resSend(res, true, 200, `user approved.`, null, null);
  } catch (error) {
    console.error("[error] acceptedPendingEmp", error);
    resSend(res, false, 500, Message.SOMTHING_WENT_WRONG, null, null);
  } finally {
    if (client) client.release();
  }
};

const updatePassword = async (req, res) => {
  let client;
  try {
    client = await poolClient();
    if (!req.body.user_code || !req.body.old_pw || !req.body.new_pw) {
      return resSend(res, false, 200, Message.MANDATORY_INPUTS_REQUIRED);
    }

    const { user_code, old_pw, new_pw } = req.body;

    let login_Q = `SELECT * FROM auth WHERE vendor_code = $1 AND is_active = 1`;

    let result = await poolQuery({
      client,
      query: login_Q,
      values: [user_code],
    });

    const decripted_old_pw = decryptData(old_pw);
    const decripted_new_pw = decryptData(new_pw);


    if (!result.length) {
      return resSend(res, false, 200, Message.USER_NOT_FOUND, result);
    }

    const match = await bcrypt.compare(decripted_old_pw, result[0]["password"]);

    if (!match) {
      return resSend(res, false, 200, "INCORRECT_PASSWORD");
    }

    const whereCondition = {
      vendor_code: user_code,
      password: result[0]["password"],
    };
    const salt = bcrypt.genSaltSync();
    const encrytedPassword = bcrypt.hashSync(decripted_new_pw, salt);
    const updatePayload = {
      password: encrytedPassword,
    };

    const updateVerified = generateQuery(UPDATE, AUTH, updatePayload, whereCondition);
    await poolQuery({ client, query: updateVerified["q"], values: updateVerified["val"] });

    resSend(res, true, 200, "Password update successfully!");
  } catch (error) {
    console.error("[error] update password", error);
    resSend(res, false, 500, Message.SOMTHING_WENT_WRONG, null, null);
  } finally {
    if (client) client.release();
  }
};

const getDepartmetList = async (req, res) => {
  try {
    const deptListQuery = `SELECT id, name from depertment_master`;
    const result = await getQuery({ query: deptListQuery, values: [] });
    resSend(res, true, 200, Message.DATA_FETCH_SUCCESSFULL, result, null);
  } catch (error) {
    console.error("[error] list of getDepartmetList", error);
    resSend(res, false, 500, Message.SOMTHING_WENT_WRONG, null, null);
  }
};



/**---------------------------------------------------------------------------------
                          LOGIN API START
 ------------------------------------------------------------------------------------*/

const login = async (req, res) => {
  let client;
  try {
    const { vendor_code, password, captchaValue } = req.body;

    // --- 1. Basic Validations ---
    if (!vendor_code || typeof vendor_code !== "string" || !password) {
      return resSend(res, false, 200, Message.MANDATORY_INPUTS_REQUIRED);
    }

    // ✅ UPDATE 1: Captcha Verification (Session based)
    // Check if session has captcha (it might have expired) and if it matches

    if (!req.session.captcha || req.session.captcha !== captchaValue?.toLowerCase()) {
      return resSend(res, false, 200, Message.INVALID_CAPTCHA);
    }

    // Security: Clear captcha immediately so it cannot be reused
    req.session.captcha = null;

    client = await poolClient();

    // Check Lock Status
    const isAccLocked = await isAccountLocked(client, vendor_code);
    if (isAccLocked) return resSend(res, false, 200, Message.TOO_MANY_ATTEMPTS_ACCOUNT_LOCKED);

    // Verify User Credentials
    const login_Q = `SELECT vendor_code, user_type, password, is_active FROM auth WHERE vendor_code = $1`;
    const users = await poolQuery({ client, query: login_Q, values: [vendor_code] });

    if (!users.length) return resSend(res, false, 200, Message.REGISTRATION_MSG);
    let user = users[0];

    if (user.is_active !== 1) return resSend(res, false, 200, Message.USER_NOT_APPROVED);

    // Password Check
    let decreptedPasseword = decryptData(password);

    const match = await bcrypt.compare(decreptedPasseword.toString(), user.password);

    if (!match) {
      // faild count record save . . . . . 
      // eslint-disable-next-line no-unused-vars
      const isLocked = await handleFailedAttempt(client, vendor_code);
      // if (isLocked) return resSend(res, false, 200, Message.TOO_MANY_ATTEMPTS_ACCOUNT_LOCKED);
      return resSend(res, false, 200, Message.INVALID_CREDINTIAL);
    }

    // --- OTP LOGIC STARTS ---

    // 1. Fetch Email
    let email = await fetchUserEmail(client, vendor_code, user.user_type);
    if (!email) return resSend(res, false, 200, "Email not found.");

    // 2. Use Common Function (Generate, Save, Send)
    await processAndSendOtp(client, vendor_code, user.user_type, email, 'LOGIN');

    // ✅ UPDATE 2: Store User in Temporary Session
    // This allows verify-otp to know WHO is logging in without trusting the client
    req.session.login_otp = {
      vendor_code: vendor_code,
      user_type: user.user_type,
      stage: SESSION_STAGE_AWAITING_OTP
    };

    // 3. Response
    resSend(res, true, 200, `OTP Sent successfully : Email ID ${email}`, {
      vendor_code,
      user_type: user.user_type,
      next_step: 'otp_verification'
    });

  } catch (err) {
    console.error("Login error:", err);
    resSend(res, false, 500, Message.SOMTHING_WENT_WRONG, null);
  } finally {
    if (client) client.release();
  }
};


const verifyLoginOtp = async (req, res) => {
  let client;
  try {
    // Take Only OTP.
    const { otp } = req.body;

    // ✅ CHANGE 2: Check Session Security
    // Ensure the user actually passed Step 1 (Password Check)
    if (!req.session.login_otp || req.session.login_otp.stage !== SESSION_STAGE_AWAITING_OTP) {
      return resSend(res, false, 401, "Session expired or invalid flow. Please login again.");
    }

    // if (!req.session.captcha || req.session.captcha !== captchaValue?.toLowerCase()) {
    //   return resSend(res, false, 200, Message.INVALID_CAPTCHA);
    // }

    // ✅ CHANGE 3: Get Vendor Code from Server Memory (Safe)
    const { vendor_code } = req.session.login_otp;

    if (!otp || !vendor_code) {
      return resSend(res, false, 200, "OTP & Vendor Code is required");
    }

    client = await poolClient();

    // --- 1. Verify OTP using Helper Function ---
    const otpCheck = await verifyOtpFromDb(client, vendor_code, otp);

    if (!otpCheck.valid) {
      return resSend(res, false, 200, otpCheck.message);
    }

    // --- 2. OTP Valid! Fetch User Details & Permissions ---

    let user = await loggedInUserDetails(client, vendor_code)

    if (user?.user_type == USER_TYPE_VENDOR) {
      user.name = user?.vendor_name
    } else if (user?.user_type == USER_TYPE_GRSE) {
      user.name = user?.officer_name
    }


    // ⚠️ RESTORED LOGIC: You need this to get user name/email/permissions
    // If you haven't made the helper function, paste the original logic here.
    // user = await attachUserDetailsAndPermissions(client, user, rolePermission); 

    // --- 3. Reset Login Attempts ---
    await resetAttempts(client, vendor_code);

    // --- 4. Generate Tokens ---
    const payload = {
      username: user.username,
      name: user.name,
      vendor_code: user.vendor_code,
      user_type: user.user_type,
      department_id: user.department_id,
      internal_role_id: user.internal_role_id,
    };

    // SET TOKENS, TO CHANGE VALIDITY CHECK ENV FILE
    const accessToken = getAccessToken(payload, ACCESS_TOKEN_VALIDITY);
    const refreshToken = getRefreshToken(payload, REFRESH_TOKEN_VALIDITY);

    // --- 5. Rotation Logic (Save Refresh Token) ---
    const sessionQ = `INSERT INTO user_sessions (vendor_code, refresh_token) VALUES ($1, $2)`;
    await poolQuery({ client, query: sessionQ, values: [user.vendor_code, refreshToken] });

    // ✅ CHANGE 5: Destroy the Temp Session
    // We are done with the handshake. We don't want old sessions cluttering memory.
    req.session.destroy();

    // --- 6. Final Response ---
    resSend(res, true, 200, Message.USER_AUTHENTICATION_SUCCESS, { user }, { accessToken, refreshToken });

  } catch (err) {
    console.error("Verify OTP error:", err);
    resSend(res, false, 500, Message.SOMTHING_WENT_WRONG);
  } finally {
    if (client) client.release();
  }
};


async function loggedInUserDetails(client, vendor_code) {
  const userDeatilsQuery = `
  SELECT 
		t1.vendor_code, 
		t1.user_type, 
		t1.username, 
		t1.department_id, 
		t1.internal_role_id, 
		t2.name AS department_name, 
		t3.name AS role,
		t4.cname as officer_name,
		t5.name1 as vendor_name
FROM auth AS t1 
  LEFT JOIN depertment_master AS t2 ON (t1.department_id = t2.id)
  LEFT JOIN internal_role_master AS t3 ON (t1.internal_role_id = t3.id)
  LEFT JOIN pa0002 AS t4 ON (t1.vendor_code :: integer = t4.pernr)
  LEFT JOIN lfa1 AS t5 ON (t1.vendor_code = t5.lifnr)
 WHERE t1.vendor_code = $1`;

  const userDeatilsData = await poolQuery({ client, query: userDeatilsQuery, values: [vendor_code] });

  return userDeatilsData[0] || null;
}





const sendOtp2 = async (req, res) => {
  let client;
  try {
    const { vendor_code, action_type } = req.body; // action_type could be 'LOGIN', 'FORGOT_PASS', etc.

    if (!vendor_code) {
      return resSend(res, false, 200, "Vendor Code is required");
    }

    const validAction = action_type || 'LOGIN';

    client = await poolClient();

    // 1. Check if User Exists & Fetch Email
    // We reuse the logic to find user details
    const userQ = `SELECT vendor_code, user_type FROM auth WHERE vendor_code = $1`;
    const userRows = await poolQuery({ client, query: userQ, values: [vendor_code] });

    if (!userRows.length) {
      return resSend(res, false, 200, Message.INVALID_CREDINTIAL);
    }
    const user = userRows[0];

    // 2. Fetch Email (Reuse your existing logic or helper)
    let email = await fetchUserEmail(client, vendor_code, user.user_type);

    if (!email) {
      return resSend(res, false, 200, "Email not found for this user.");
    }

    // 3. CALL THE COMMON FUNCTION
    await processAndSendOtp(client, vendor_code, user.user_type, email, validAction);

    resSend(res, true, 200, "OTP sent successfully", { vendor_code, action_type: validAction });

  } catch (err) {
    console.error("Send OTP Error:", err);
    resSend(res, false, 500, Message.SOMTHING_WENT_WRONG);
  } finally {
    if (client) client.release();
  }
};


const refreshToken = async (req, res) => {
  let client;
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) return resSend(res, false, 401, "Refresh Token is required");

    // 1. Verify Signature
    const decodedUser = verifiedRefreshTokenData(refreshToken);

    if (!decodedUser) return resSend(res, false, 403, "Refresh Token Expired or Invalid");

    client = await poolClient();

    // 2. Check DB: Does this refresh token exist?
    const sessionQuery = `SELECT * FROM user_sessions WHERE refresh_token = $1`;
    const sessionRows = await poolQuery({ client, query: sessionQuery, values: [refreshToken] });

    if (!sessionRows.length) {
      // SECURITY ALERT: If a token is valid (signature wise) but not in DB, 
      // it means it was already used/rotated. This might be a reuse attack!
      // Optional: You could delete ALL sessions for this user here to force re-login.
      return resSend(res, false, 403, "Token already used. Please Login Again.");
    }

    // 3. Generate NEW Tokens (Both Access & Refresh)
    const payload = {
      username: decodedUser.username,
      vendor_code: decodedUser.vendor_code,
      user_type: decodedUser.user_type,
      department_id: decodedUser.department_id,
      internal_role_id: decodedUser.internal_role_id,
    };

    const newAccessToken = getAccessToken(payload, ACCESS_TOKEN_VALIDITY);
    const newRefreshToken = getRefreshToken(payload, REFRESH_TOKEN_VALIDITY); // Generate new Refresh Token

    // 4. Update DB: Replace OLD Refresh Token with NEW Refresh Token
    // We update the record where the old token matched
    const updateQuery = `UPDATE user_sessions SET refresh_token = $1, created_at = NOW() WHERE refresh_token = $2`;
    await poolQuery({ client, query: updateQuery, values: [newRefreshToken, refreshToken] });

    // 5. Send BOTH tokens back
    resSend(res, true, 200, "Token Rotated Successfully", null, {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken // Client must update their local storage with this!
    });

  } catch (err) {
    console.error("Refresh Token Error:", err);
    resSend(res, false, 500, Message.SOMTHING_WENT_WRONG, null);
  } finally {
    if (client) client.release();
  }
};


const logout = async (req, res) => {
  let client;
  try {
    const { refreshToken } = req.body;

    // Optional: Destroy express session just in case it still exists
    if (req.session) {
      req.session.destroy();
    }

    if (!refreshToken) return resSend(res, true, 200, "Logged out");

    client = await poolClient();

    // Remove token from DB so it can't be used to refresh anymore
    await poolQuery({
      client,
      query: "DELETE FROM user_sessions WHERE refresh_token = $1",
      values: [refreshToken]
    });

    resSend(res, true, 200, "Logged out successfully");
  } catch (error) {
    console.error("Logout", error);
    resSend(res, false, 500, Message.SOMTHING_WENT_WRONG);
  } finally {
    if (client) client.release();
  }
};

/**---------------------------------------------------------------------------------
                      LOGIN API END
 ------------------------------------------------------------------------------------*/



module.exports = {
  captchaHandler,
  login,
  sendOtp,
  forgotPasswordOtp,
  otpVefify,
  setPassword,
  updatePassword,
  getListPendingEmp,
  acceptedPendingEmp,
  getDepartmetList,
  // verifyOtp,
  refreshToken,
  sendOtp2,
  verifyLoginOtp,
  logout
};
