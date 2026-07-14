/* eslint-disable no-undef */

module.exports = {
  apps: [
    {
      name: "obps_backend",
      script: "server.js",

      // Use Node.js built-in .env loader
      interpreter: "node",
      interpreter_args: "--env-file=.env",

      // Keep ONLY essential env here
      env: {
        NODE_ENV: "production"
      },

      // Logs
      error_file: "/var/www/html/obps/settings/backend/error.log",
      out_file: "/var/www/html/obps/settings/backend/output.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss"
    },

    {
      name: "obps_frontend",
      script: "npx",
      args: "serve -s build -l 3000",
      cwd: "../frontend_obps",

      env: {
        NODE_ENV: "production"
      },

      error_file: "/var/www/html/obps/settings/frontend/error.log",
      out_file: "/var/www/html/obps/settings/frontend/output.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss"
    }
  ]
};