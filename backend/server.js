/* eslint-disable no-undef */
const path = require("path");
const dotenv = require("dotenv");

const envFile = process.env.NODE_ENV === "production" ? ".env" : "dev.env";

const envPath = path.join(__dirname, envFile);

const dotenvResult = dotenv.config({
  path: envPath,
});

console.log("ENV FILE:", envPath);
console.log("DOTENV ERROR:", dotenvResult.error || "None");
console.log("PORT:", process.env.PORT);
console.log("NODE_ENV:", process.env.NODE_ENV);
console.log("SERVER_ENV:", process.env.SERVER_ENV);

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const session = require("express-session");

const app = express();

/* -------------------------------------------------------------
ENV & APP BASICS
-------------------------------------------------------------- */
const PORT = process.env.PORT || 4011;

const isProd = process.env.NODE_ENV === "production";

app.set("env", process.env.NODE_ENV);
app.disable("x-powered-by");

/* -------------------------------------------------------------
🛡️ TRUST PROXY (DYNAMIC FOR NIC and LAN)
-------------------------------------------------------------- */
const { LAN_SERVER_PO_PATH, NIC_SERVER, LAN_SERVER } = require("./lib/constant");
const serverEnv = process.env.SERVER_ENV || "UNKNOWN";

if (serverEnv === NIC_SERVER) {
  // NIC server: Trust BOTH localhost (NGINX) AND internal 10.x.x.x NIC proxies (Load Balancer)
  app.set("trust proxy", ["loopback", "10.0.0.0/8"]);
} else if (serverEnv === LAN_SERVER) {
  // LAN server: Direct connections only
  app.set("trust proxy", "loopback");
  console.log(`🛡️ Trust Proxy disabled for LAN environment (Direct connection)`);
} else {
}

/* -------------------------------------------------------------
    SECURITY MIDDLEWARES
-------------------------------------------------------------- */
app.use(
  helmet({
    frameguard: { action: "deny" },
    referrerPolicy: { policy: "no-referrer" },
  }),
);

/* -------------------------------------------------------------
    RATE LIMITING
-------------------------------------------------------------- */
const { globalRateLimiter } = require("./config/rateLimiter");
app.use(globalRateLimiter);

/* -------------------------------------------------------------
    SESSION CONFIG
-------------------------------------------------------------- */
const { sessionConfig } = require("./config/sessionConfig");
app.use(session(sessionConfig));

/* -------------------------------------------------------------
    CORS CONFIG
-------------------------------------------------------------- */
const { corsOptions, corsErrorHandler } = require("./config/corsConfig2");
app.use(cors(corsOptions));
app.use(corsErrorHandler);

/* -------------------------------------------------------------
    REQUEST PARSERS
-------------------------------------------------------------- */
app.use(express.json({ limit: "10mb", strict: true }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

/* -------------------------------------------------------------
    API LOGGER
-------------------------------------------------------------- */
const { apiLog } = require("./services/api.services");
app.use(apiLog);

/* -------------------------------------------------------------
   STATIC FILES (CONTROLLED)
-------------------------------------------------------------- */
app.use(
  "/uploads",
  express.static(path.join(__dirname, "uploads"), {
    dotfiles: "deny",
    index: false,
    maxAge: "1d",
  }),
);

try {
  const poPath = path.resolve(LAN_SERVER_PO_PATH);
  app.use(
    "/sapuploads/po",
    express.static(poPath, {
      dotfiles: "deny",
      index: false,
    }),
  );
} catch (err) {
  console.error("❌ Invalid PO directory path:", err.message);
}

/* -------------------------------------------------------------
    ROUTES
-------------------------------------------------------------- */
const allRoutes = require("./routes/allRoutes");
const uploadRoutes = require("./routes/uploadRoutes");
const authRoute = require("./routes/auth");
const statRoutes = require("./routes/statRoutes");
const dataInsert = require("./routes/sap/dataInsert");
const sapRoutes = require("./routes/sap/sapRoutes");
const syncRoutes = require("./routes/syncRoutes");
const { vendorReminderMail, mailSendCornFn, drawingAutoAcknowledgeCorn } = require("./controllers/sapController/remaiderMailSendController");
const { pymtFileTrans } = require("./utils/fileTransUtils");
const { syncDataDownloadCorn } = require("./controllers/syncControllers2");

app.use("/api/v1", allRoutes);
app.use("/api/v1/auth2", authRoute);
app.use("/api/v1/upload", uploadRoutes);
app.use("/api/v1/insert", dataInsert);
app.use("/api/v1/sap", sapRoutes);
app.use("/api/v1/sync", syncRoutes);
app.use("/api/v1/stat", statRoutes);

/* -------------------------------------------------------------
   404 HANDLER
-------------------------------------------------------------- */
app.set("view engine", "ejs");

app.use((req, res) => {
  if (req.originalUrl.startsWith("/api")) {
    return res.status(404).json({
      status: 0,
      message: "Resource not found",
    });
  }

  res.status(404).sendFile(path.join(__dirname, "public", "view", "500.html"));
});

/* -------------------------------------------------------------
   GLOBAL ERROR HANDLER (NO STACK TRACE LEAK)
-------------------------------------------------------------- */
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error("Unhandled Error:", err);

  if (req.originalUrl.startsWith("/api")) {
    return res.status(err.status || 500).json({
      status: 0,
      message: isProd ? "Something went wrong. Please try again later." : err.message,
    });
  }

  if (isProd) {
    return res.status(500).sendFile(path.join(__dirname, "public", "view", "404.html"));
  }

  res.status(500).send(err.stack);
});

/* -------------------------------------------------------------
    CRON JOBS (SAFE INIT)
-------------------------------------------------------------- */
try {
  if (isProd) {
    syncDataDownloadCorn();
    // syncFileCron(); never trun on
    mailSendCornFn();
    vendorReminderMail();
    pymtFileTrans();
    drawingAutoAcknowledgeCorn();
    console.log("✓ Cron jobs initialized");
  }
} catch (err) {
  console.error("❌ Cron job initialization failed:", err.message);
}

/* -------------------------------------------------------------
    PROCESS-LEVEL SAFETY (PM2 SAFE)
-------------------------------------------------------------- */
process.on("unhandledRejection", (reason) => {
  console.error("[ERROR] Unhandled Rejection:", reason);
});

process.on("uncaughtException", (err) => {
  console.error("[ERROR] Uncaught Exception:", err);
  process.exit(1); // PM2 will restart
});

/* -------------------------------------------------------------
   START SERVER (DYNAMIC BINDING FOR NIC VS LAN)
-------------------------------------------------------------- */
// NIC Server / Local: Open to all network interfaces so the Load Balancer can connect

// (e.g., const serverEnv = process.env.SERVER_ENV || "LOCAL";)

let HOST = "0.0.0.0";

if (serverEnv === LAN_SERVER) {
  // LAN Server: Lock Node.js to localhost so NGINX on port 4001 handles the public traffic
  HOST = "127.0.0.1";
}

const server = app.listen(PORT, HOST, () => {
  console.log(`✔ Server running on ${HOST}:${PORT} | ENV: ${serverEnv}`);
});

/* -------------------------------------------------------------
    GRACEFUL SHUTDOWN
-------------------------------------------------------------- */
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

function shutdown() {
  console.log("Graceful shutdown initiated...");
  server.close(() => {
    console.log("✔ Server closed safely.");
    process.exit(0);
  });
}
