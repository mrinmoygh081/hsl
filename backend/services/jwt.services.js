/* eslint-disable no-undef */
const jwt = require("jsonwebtoken");
const { resSend } = require("../lib/resSend");
const basicAuth = require("express-basic-auth");
// const ACCESS_TOKEN_SECRET = "accessTopSecret";
// const REFRESH_TOKEN_SECRET = "refreshTopSecret";

const TOKEN_ISSUER = "GRSE-OBPS";

/**
 * Access token issu
 * @param {Object} payload
 * @param {string} accessTokenValidity
 * @returns string | null
 */

const getAccessToken = (payload, accessTokenValidity) => {
  try {
    const accessToken = jwt.sign(payload, process.env.ACCESS_TOKEN_SECRET, {
      expiresIn: accessTokenValidity || "30m",
      subject: payload.username,
      issuer: TOKEN_ISSUER,
    });

    return accessToken;
  } catch (error) {
    console.error("error", error);
    return null;
  }
};

/**
 * REFRESH TOKEN ISSUER
 * @param {Object} payload
 * @param {string} refreshTokenValidity
 * @returns string | null
 */

const getRefreshToken = (payload, refreshTokenValidity) => {
  try {
    const refreshToken = jwt.sign(
      payload,
      process.env.REFRESH_TOKEN_SECRET,
      {
        expiresIn: refreshTokenValidity || "1h",
        subject: payload.username,
        issuer: TOKEN_ISSUER,
      }
    );

    //  storeRefreshToken(refreshToken, payload.username);

    return refreshToken;
  } catch (error) {
    console.error(error.message);
    return null;
  }
};

/**
 * verify access token
 * @param {string} token
 * @returns boolean | null
 */
const verifiedAccessTokenData = (token) => {
  try {
    const decode = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    return decode;
  // eslint-disable-next-line no-unused-vars
  } catch (err) {
    // console.error("error", err);
    return null;
  }
};


/**
 * verify refresh token
 * @param {string} token
 * @returns boolean | null
 */
const verifiedRefreshTokenData = (token) => {
  try {

    const decode = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);
    return decode;
  } catch (err) {
    // This handles cases like: Token Expired, Invalid Signature
    console.error("Refresh token verification error:", err.message);
    return null;
  }
};




// /**
//  *
//  * @param {Object} data
//  * @returns data | null
//  */
// const veifyAccessTokenRole = async (data) => {
//   const userRoleVeifiy = `SELECT * FROM auth WHERE username = "${data.username}" AND user_type = ${data.user_type}`;
//   const result = await query({ query: userRoleVeifiy, values: [] });

//   if (result && result?.length) {
//     return result;
//   }
//   return null;
// };

// /**
//  * Requested person api access
//  * @param {Object} data
//  * @param {string} reqUrl
//  * @returns boolean
//  */
// const hasapiAccessList = (data, reqUrl) => {
//   const roleAccess = apiAccessList[data.user_type];

//   // FOR ALL ACCESS ROLE ADMIN
//   if (data?.user_type == 5 || data?.user_type == "5") return true;

//   return roleAccess.includes((url) => url === reqUrl);
// };

/**
 * verifyAccessToken
 * @param {Object} req
 * @param {Object} res
 * @param {function} next
 * @returns nextMiddleware | error
 */

const verifyAccessToken = async (req, res, next) => {
  try {
    let authHeader = req.headers.authorization || req.headers.Authorization;
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) return resSend(res, false, 400, "NO_TOKEN_FOUND");

    const tokenData = verifiedAccessTokenData(token);

    if (!tokenData) return resSend(res, false, 401, "INVALID_EXPIRED_TOKEN");

    // const validRole = await veifyAccessTokenRole(tokenData);
    // if (!validRole) return resSend(res, false, 401, "Access Denied: YOU DONT HAVE ACCESS");
    const roleObj = {
      1: "nodal",
      2: "general",
      3: "admin",
      4: "superadmin",
      5: "god"
    }
    tokenData["roles"] = [roleObj[tokenData["internal_role_id"]] || "vendor"];
    req["tokenData"] = tokenData;

    next();
  } catch (error) {
    console.error("[error]", error);

    return resSend(res, false, 500, "INTERNAL_SERVER_ERROR_VERIFY_TOKEN");
  }
};

/**
 * verifyOnlyAccessToken
 * @param {Object} req
 * @param {Object} res
 * @param {function} next
 * @returns nextMiddleware | error
 */
const verifyOnlyAccessToken = async (req, res, next) => {
  try {
    let authHeader = req.headers.authorization || req.headers.Authorization;
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) return resSend(res, false, 400, "NO_TOKEN_FOUND");

    const tokenData = verifiedAccessTokenData(token);

    if (!tokenData) return resSend(res, false, 401, "INVALID_EXPIRED_TOKEN");

    req["tokenData"] = tokenData;

    next();
  } catch (error) {
    console.error("[error]", error);

    return resSend(res, false, 500, "INTERNAL_SERVER_ERROR_VERIFY_TOKEN");
  }
};


// Middleware for Basic Authentication
// const sap_username = process.env.SAP_API_AUTH_USERNAME;
// const sap_password = process.env.SAP_API_AUTH_PASSWORD;
const basicAuthVerification = basicAuth({
  users: {
    [process.env.SAP_API_AUTH_USERNAME]: process.env.SAP_API_AUTH_PASSWORD,
  },
  challenge: true,
  unauthorizedResponse: { status: false, message: "Unauthorized" },
});





module.exports = {
  getAccessToken,
  getRefreshToken,
  verifyAccessToken,
  verifyOnlyAccessToken,
  basicAuthVerification,
  verifiedRefreshTokenData
};
