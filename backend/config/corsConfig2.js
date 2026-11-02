/* eslint-disable no-undef */

/**
 * Environment-based CORS whitelist
 */
function getEnvCorsConfig() {
  const env = process.env.NODE_ENV || "dev";


  const CORS_ORIGINS = process.env.CORS_ORIGINS;

  const config = {
    dev: {
      origins: "*",
      credentials: true,
      methods: ["OPTIONS", "GET", "POST", "PUT", "DELETE"],
    },

    qa: {
      // origins: ["http://10.18.7.123:3000", "http://10.18.1.242:3000", "http://localhost:3000", "http://10.181.1.31:8010", "http://172.16.5.182:3000", "http://43.204.173.109:3001"],
      origins: CORS_ORIGINS,
      credentials: true,
      methods: ["OPTIONS", "GET", "POST", "PUT", "DELETE"],
    },

    production: {
      // origins: [
      //   "http://10.181.1.53:8018", // SAP Host IP
      //   "http://localhost:3000", // LOCAL HOST
      //   "http://172.16.5.182:3000",
      //   "http://43.204.173.109:3001",
      // ],
      origins: CORS_ORIGINS,
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

  // Case: No Origin (curl, Postman, mobile apps, backend → backend)
  if (!origin) {
    return callback(null, true);
  }

  // Wildcard (dev): allow any origin
  if (envConfig.origins === "*") {
    return callback(null, true);
  }

  // Check whitelist
  if (envConfig.origins.includes(origin)) {
    return callback(null, true);
  }

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
