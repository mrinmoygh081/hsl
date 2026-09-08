/* eslint-disable no-undef */
/**
 * CORS Configuration (Clean + Secure)
 */

// function logOrigin(origin, decision) {
//   console.log(`[CORS] Origin: ${origin || "NO ORIGIN"} → ${decision}`);
// }

/**
 * Environment-based CORS whitelist
 */
function getEnvCorsConfig() {
  const env = process.env.NODE_ENV || "dev";

  const config = {
    dev: {
      origins: [
        "http://localhost:3000",
        "http://172.16.5.182:3000",
        "http://43.204.173.109:3001/",
      ],
      credentials: true,
      methods: ["OPTIONS", "GET", "POST", "PUT", "DELETE"],
    },

    qa: {
      origins: [
        "http://10.18.7.123:3000",
        "http://10.18.1.242:3000",
        "http://localhost:3000",
        "http://10.181.1.31:8010",
        "http://172.16.5.182:3000",
      ],
      credentials: true,
      methods: ["OPTIONS", "GET", "POST", "PUT", "DELETE"],
    },

    production: {
      origins: [
        "http://10.18.1.242:3000", // LAN Host IP
        "https://obps.grse.co.in", // LAN Host URL
        "https://obps.grse.in", // Frontend Host URL
        "http://10.181.1.53:8018", // SAP Host IP
        "https://stageobps.grse.in", // STAGE OBPS Host
        "http://localhost:3000", // LOCAL HOST
        "http://172.16.5.182:3000",
      ],
      credentials: true,
      methods: ["OPTIONS", "GET", "POST"],
    },
  };

  return config[env];
}

/**
 * Dynamic CORS validator
 */
function corsOriginValidator(origin, callback) {
  const envConfig = getEnvCorsConfig();
  // console.log("envConfig production", envConfig)

  // Case: No Origin (curl, Postman, mobile apps, backend → backend)
  if (!origin) {
    // logOrigin(origin, "ALLOWED (No Origin Sent)");
    return callback(null, true);
  }

  // Check whitelist
  if (envConfig.origins.includes(origin)) {
    // logOrigin(origin, "ALLOWED");
    return callback(null, true);
  }

  // Not allowed
  // logOrigin(origin, "BLOCKED");
  return callback(new Error(`CORS Error: Origin ${origin} not allowed`), false);
}

/**
 * Final CORS options object
 */
const corsOptions = {
  origin: corsOriginValidator,
  credentials: getEnvCorsConfig().credentials,
  methods: getEnvCorsConfig().methods,
  allowedHeaders: ["Content-Type", "Authorization"],
  optionsSuccessStatus: 200,
};

/**
 * CORS ERROR HANDLER middleware
 */
function corsErrorHandler(err, req, res, next) {
  if (err && err.message.startsWith("CORS Error")) {
    return res.status(403).json({
      status: 0,
      message: err.message,
    });
  }
  next();
}

module.exports = { corsOptions, corsErrorHandler };
