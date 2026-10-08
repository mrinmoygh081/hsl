const { resSend } = require('../lib/resSend');
const checkPermission = require('../policies/accessPolicies'); // Utility to evaluate policies
const Message = require('../utils/messages');

/**
 * Middleware factory to authorize requests based on a specific policy.
 *
 * This function returns an Express.js middleware function.
 *
 * @param {string} policyName - The name of the policy to check (e.g., 'document:approve', 'wdc:create').
 * This string corresponds to a key in your `policies/accessPolicies.js` file.
 * @param {function(req: Request): Array<any>} [getPolicyArgs] - An optional function that receives the Express `req` (request) object
 * and returns an array of additional arguments to be passed to the policy function.
 * These arguments typically represent contextual information needed by the policy (e.g., resource status, resource owner ID).
 * If not provided, an empty array is passed to the policy.
 * @returns {function(req: Request, res: Response, next: NextFunction)} An Express.js middleware function.
 */
const authorize = (policyName) => {
    return (req, res, next) => {
        if (!req.tokenData) {
            console.warn('Authorization middleware called without req.user. Authentication likely failed or missing.');
            return resSend(res, false, 401, Message.YOU_ARE_UN_AUTHORIZED, {});
        }

        if (checkPermission(policyName, req.tokenData, req.body.status  )) {
            next();
        } else {
            return resSend(res, false, 403, Message.YOU_ARE_UN_AUTHORIZED, {});
        }
    };
};

module.exports = authorize;