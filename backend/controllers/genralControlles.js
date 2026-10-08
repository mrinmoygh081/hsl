const { getQuery } = require("../config/pgDbConfig");
const { resSend } = require("../lib/resSend");

const getFilteredData = async (req, res) => {
  try {
    const tableNames = ["lfa1", "btn_any_other_claim"];
    const { $tableName } = req.query;

    if (!$tableName || !tableNames.includes($tableName)) {
      throw new Error("please send valid table name.");
    }

    let select = "*";

    // IF USER SEND SHOW SELECTED ITEMS
    if (req.query.$select) {
      select = req.query.$select;
    }
    // EXAMPLE --- >
    // localhost:4001/api/v1/getFilteredData?$tableName=qap_submission&$filter={"purchasing_doc_no":7800000040,  "id": 4}&$search={"vendor_code": "50007545", "status": "PENDING"}
    // START QUERIES
    let q = `SELECT ${select} FROM ${$tableName} WHERE 1 = 1 `;

    // IF USER SEND SHOW FILTERED ITEMS
    if (req.query.$filter) {
      const flt = JSON.parse(req.query.$filter);
      Object.keys(flt).forEach((key) => {
        q = q.concat(` AND ${key} = '${flt[key]}'`);
      });
    }

    // IF USER SEND SHOW FILTERED ITEMS
    if (req.query.$search) {
      const search = JSON.parse(req.query.$search);

      Object.keys(search).forEach((key) => {
        q = q.concat(` AND ${key} LIKE '%${search[key]}%'`);
      });
    }
    const result = await getQuery({
      query: q,
      values: [],
    });
    if (result.length > 0) {
      resSend(res, true, 200, "Data fetched successfully", result, null);
    } else {
      resSend(res, true, 200, "No Record Found", result, null);
    }
  } catch (error) {
    console.error("error", error);
    resSend(res, false, 400, "Error", error, null);
  }
};

module.exports = { getFilteredData };
