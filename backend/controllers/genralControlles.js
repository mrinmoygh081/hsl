const {  getQuery } = require("../config/pgDbConfig");
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

/**
 * general update api
 * PAYLOAD SAMPLE
 * {
    "tableName": "essr",
    "condition": {
        "lblni": "12324"
    },
    "data": {
        "lblne": "12345"
    }
}
 * @param {*} req 
 * @param {*} res 
 */
// const updatTableData = async (req, res) => {
//   try {
//     const { tableName, condition, data } = req.body;

//     if (!tableName || !condition) {
//       throw new Error("Please send table name and condition.");
//     }
//     if (!data || !Object.keys(data).length) {
//       throw new Error("Please send data.");
//     }
//     const updateObject = data;
//     const { q, val } = generateQuery(UPDATE, tableName, updateObject, condition);
//     const result = await query({ query: q, values: val });
//     resSend(res, true, 200, `Value updated in ${tableName}`, result, null);
//   } catch (error) {
//     resSend(res, false, 500, "Error update record", error.message, null);
//   }
// };
/**
 * general insert api
 * {
    "tableName": "essr",
    "data": {
        "lblni": "1333",
        "lblne": "12345"
    }
}
//  * 
//  * @param {*} req 
//  * @param {*} res 
//  */
// const insertTableData = async (req, res) => {
//   try {
//     const { tableName, data } = req.body;
//     if (!tableName) {
//       throw new Error("Please send table name and condition.");
//     }
//     if (!data || !Object.keys(data).length) {
//       throw new Error("Please send data.");
//     }

//     const insertObj = data;
//     const { q, val } = generateQuery(INSERT, tableName, insertObj);
//     const result = await query({ query: q, values: val });
//     resSend(res, true, 200, `Insert data in ${tableName}`, result, null);
//   } catch (error) {
//     resSend(res, false, 500, "insertTableData api error", error.message, null);
//   }
// };


// const getGrseOfficerList = async (req, res) => {
//   try {
//     let q = `

// SELECT 
//       vendor_code as code,
//       vendor_code as usercode,
//       department_id, 
//       internal_role_id, 
//       user_t.cname  AS name,
//       user_t.cname  AS empname,
//       d_master.name AS department_name,
// 	    int_role_master.name as role

//         FROM auth AS auth
// 	    LEFT JOIN pa0002 AS user_t ON(auth.vendor_code = user_t.pernr ::character varying )
//       LEFT JOIN depertment_master as d_master ON(auth.department_id = d_master.id )
//       LEFT JOIN internal_role_master AS int_role_master ON (int_role_master.id = auth.internal_role_id)`;
//     let condition = " WHERE 1 = 1 ";
//     let count = 0;
//     const values = [];
//     const { department_id, vendor_code, internal_role_id } = req.query
//     if (department_id) {
//       condition += ` AND auth.department_id = $${++count}`;
//       values.push(department_id)
//     }
//     if (vendor_code) {
//       condition += ` AND auth.vendor_code = $${++count}`;
//       values.push(vendor_code)
//     }
//     if (internal_role_id) {
//       condition += ` AND auth.internal_role_id = $${++count}`;
//       values.push(internal_role_id)
//     }

//     q += condition;

//     const result = await getQuery({ query: q, values: values });
//     resSend(res, true, 200, `Successfull`, result, null);
//   } catch (error) {
//     console.error("error", error)
//     resSend(res, false, 500, "insertTableData api error", error.message, null);
//   }
// };


module.exports = { getFilteredData,  }
