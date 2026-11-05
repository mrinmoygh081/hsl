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
      origins: CORS_ORIGINS,
      credentials: true,
      methods: ["OPTIONS", "GET", "POST", "PUT", "DELETE"],
    },

    production: {
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
