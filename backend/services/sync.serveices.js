const { query } = require("../config/pgDbConfig");
const { INSERT } = require("../lib/constant");
const { generateQuery } = require("../lib/utils");

const cronLog = async (cornName, syncDateTime, status, remarks, error = null, created_by = null) => {

  const paylod = {
    cron_name: cornName,
    execute_datetime: new Date(syncDateTime),
    status,
    created_by,
    remarks,
    error,
  };
  const { q, val } = generateQuery(INSERT, "cron_log", paylod);  
  await query({ query: q, values: val });

};

module.exports = { cronLog }