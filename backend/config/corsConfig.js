/* eslint-disable no-undef */
function getCorsOptions() {
  const env = process.env.NODE_ENV || "dev"; // Dev for default

  const corsConfigs = {
    dev: {
      origin: ["http://localhost:3000"],
      methods: ["OPTIONS", "GET", "POST", "PUT", "DELETE"],
      credentials: true,
    },
    qa: {
      origin: ["http://localhost:3000"],
      methods: ["OPTIONS", "GET", "POST", "PUT", "DELETE"],
      credentials: false,
    },
    production: {
      origin: ["http://localhost:3000"],
      methods: ["OPTIONS", "GET", "POST"],
      credentials: false,
    },
  };

  return corsConfigs[env];
}

module.exports = getCorsOptions;
