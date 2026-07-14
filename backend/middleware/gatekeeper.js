/* eslint-disable no-undef */
const { USER_TYPE_VENDOR, LAN_SERVER, AWS_SERVER, LOCAL_SERVER, NIC_SERVER } = require("../lib/constant");
const { resSend } = require("../lib/resSend");
const Message = require("../utils/messages");



/**
 * Middleware to check if the logged-in user is a vendor.
 * 
 * This function verifies the user type from the token data and ensures 
 * that only vendors can proceed. If the user is unauthorized, 
 * it sends a 401 response.
 * 
 * @param {Object} req - The request object containing token data.
 * @param {Object} res - The response object to send a response if unauthorized.
 * @param {Function} next - The next middleware function.
 */
const checkVendorLogin = (req, res, next) => {
    const tokenData = req.tokenData;

    // Check if tokenData exists and user is a vendor
    if (!tokenData || tokenData.user_type !== USER_TYPE_VENDOR) {
        return resSend(res, false, 401, Message.YOU_ARE_UN_AUTHORIZED, []);
    }

    // Proceed to the next middleware
    next();
};


/**
 * Middleware to check if the logged-in user is authorized based on user type, 
 * department ID, and an optional list of authorized user IDs.
 * 
 * @param {number} user_type - The required user type for authorization.
 * @param {number} department_id - The required department ID for authorization.
 * @param {Array} authUsersIdList - (Optional) List of authorized user IDs.
 * @returns {Function} Express middleware function.
 */
const checkAuthorizeUserLogin = (user_type, department_id, authUsersIdList = []) => {
    return (req, res, next) => {
        const tokenData = req.tokenData;

        // Validate department ID
        if (tokenData.department_id !== department_id) {
            return resSend(res, false, 401, Message.YOU_ARE_UN_AUTHORIZED, []);
        }

        // Validate user type
        if (tokenData.user_type !== user_type) {
            return resSend(res, false, 401, Message.YOU_ARE_UN_AUTHORIZED, []);
        }

        // Validate against the authorized users list (if provided)
        if (authUsersIdList.length > 0 && !authUsersIdList.includes(tokenData.user_type)) {
            return resSend(res, false, 401, Message.YOU_ARE_UN_AUTHORIZED, []);
        }

        // Proceed to the next middleware
        next();
    };
};


const checkServerAccess = (SERVER_ENVIROMENT) => {
    return (req, res, next) => {

        if (process.env.SERVER_ENV === LOCAL_SERVER) {
            return next();
        }
        const serverPortal = {
            [LAN_SERVER]: Message.ILLIAL_SERVER_ACCESS_MSG_FOR_AWS,
            [AWS_SERVER]: Message.ILLIAL_SERVER_ACCESS_MSG_FOR_LAN,
            [NIC_SERVER]: Message.ILLIAL_SERVER_ACCESS_MSG_FOR_LAN,
        }

        if (process.env.SERVER_ENV != SERVER_ENVIROMENT) {
            return resSend(res, false, 200, serverPortal[SERVER_ENVIROMENT] || Message.YOU_ARE_UN_AUTHORIZED,);
        }

        // Proceed to the next middleware
        next();
    };
}



module.exports = { checkVendorLogin, checkAuthorizeUserLogin, checkServerAccess }