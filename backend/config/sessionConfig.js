const { LAN_SERVER } = require("../lib/constant");

// eslint-disable-next-line no-undef
const SESSION_SECRET = process.env.SESSION_SECRET;
// eslint-disable-next-line no-undef
const SERVER_ENV = process.env.SERVER_ENV;
// eslint-disable-next-line no-undef
const NODE_ENV = process.env.NODE_ENV;
const SESSION_MAX_VALIDITY = 15 * 60 * 1000; // 15 minutes

const sessionConfig = {
    secret: SESSION_SECRET || "fallback_secret_key_change_me", // Fallback for safety
    resave: false,
    saveUninitialized: true, // Needed for Captcha to work before login
    cookie: {
        secure: NODE_ENV === "production" &&  SERVER_ENV !== LAN_SERVER , // Auto-switch: True in Prod, False in Dev
        httpOnly: true, // Prevents XSS attacks
        maxAge: SESSION_MAX_VALIDITY,
        sameSite: 'lax' // Recommended for modern browsers
    }
};

module.exports = { sessionConfig };