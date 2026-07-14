/* eslint-disable no-unused-vars */
/* eslint-disable no-undef */
const { query, getQuery } = require("../config/pgDbConfig");
const { INSERT, LAN_SERVER } = require("../lib/constant");
const { generateQuery, getEpochTime } = require("../lib/utils");

const apiLog = async (req, res, next) => {
  // if (req.method === "POST" || req.method === "PUT") {
  //   // console.log('Req Body: ', req.body);
  // }
  const originalSend = res.send;
  res.send = async function (body) {
    // Log response status code
    res.send = originalSend;
    let jsonBody = body;

    // SAFE parsing
    if (typeof body === "string") {
      try {
        jsonBody = JSON.parse(body);
      } catch (err) {
        jsonBody = { message: body };
      }
    }

    const contentType = req.headers["content-type"];
    let msg = "";
    if (res.statusCode >= 200 && res.statusCode < 300) {
      msg = jsonBody.message;
    } else {
      msg = jsonBody.message || "";

      if (req.method === "POST" && contentType === 'application/json') {
        msg += ` {payload} ${JSON.stringify(req.body)}`;
      }
    }
  
    if (process.env.NODE_ENV === 'dev') {
      const result = await getQuery(
        {
          query: `
      SELECT 
          COUNT(*) AS active_connections,
          (SELECT setting::int FROM pg_settings WHERE name = 'max_connections') AS max_connections,
          ROUND((COUNT(*)::numeric / (SELECT setting::int FROM pg_settings WHERE name = 'max_connections')) * 100, 2) AS used_percentage
      FROM 
    pg_stat_activity;`, values: []
        });
      console.log(
        `--------------DB INFO-------
         Request from : ${req.ip},
         Request path : ${req.path},
         Request url : ${req.originalUrl},
         Request method : ${req.method},
         Request body : ${JSON.stringify(req.body)},
         Response status code : ${res.statusCode}
         Conn details: ${JSON.stringify(result)}`
      );
      saveLogInDb(req.ip, req.originalUrl, req.method, res.statusCode, msg, "apilog");
    }


    if (process.env.SERVER_ENV === LAN_SERVER && process.env.NODE_ENV === 'production' && req.method == 'POST'
    ) { 
      const plBody = req.originalUrl.includes("/SAP") ? req.body : ""
      console.log(
        `--------------API CALL INFO-------
         Request from : ${req.ip},
         Request path : ${req.path},
         Request url : ${req.originalUrl},
         Request method : ${req.method},
         Request body : ${JSON.stringify(plBody)},
         Response status code : ${res.statusCode}`
      );
    }

    return res.send(body);
  };
  next();
};

async function saveLogInDb(source = "", req_url = "", req_method = "", status_code = "", msg = "", stack = "") {
  const logPaylaod = { source, req_url, req_method, status_code, msg, stack, created_at: getEpochTime() };
  try {
    const { q, val } = generateQuery(INSERT, "generic_log", logPaylaod);
    await query({ query: q, values: val });
  } catch (error) {
    console.error("API LOG ERROR", error.message, error.stack);
  }
}

module.exports = { apiLog };
