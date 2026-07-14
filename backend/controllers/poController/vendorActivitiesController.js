const { resSend } = require("../../lib/resSend");
const { query } = require("../../config/pgDbConfig");
const { generateQuery, getEpochTime } = require("../../lib/utils");
const { INSERT, USER_TYPE_VENDOR } = require("../../lib/constant");
const { VENDOR_ACTIVITIES } = require("../../lib/tableName");
const { SOMTHING_WENT_WRONG } = require("../../utils/messages");
const vendorActivities = async (req, res) => {
  // return  resSend(res, true, 200, "file vendor acc!", `req`, null);
  try {
    // const lastParam = req.path.split("/").pop();
    // Handle Image Upload
    let fileData = {};
    if (req.file) {
      fileData = {
        file_name: req.file.filename,
        file_path: req.file.path,
        // fileType: req.file.mimetype,
        // fileSize: req.file.size,
      };
    }
    const tokenData = { ...req.tokenData };

    const payload = {
      ...req.body,
      created_at: getEpochTime(),
      created_by_id: tokenData.vendor_code,
      updated_by: "VENDOR",
      ...fileData,
    };
    if (!payload.purchasing_doc_no || !payload.remarks || !payload.status) {
      // const directory = path.join(__dirname, '..', 'uploads', lastParam);
      // const isDel = handleFileDeletion(directory, req.file.filename);
      return resSend(res, false, 400, "Please send valid payload", null, null);
    }

    if (tokenData.department_id != USER_TYPE_VENDOR) {
      return resSend(res, false, 200, "Only VENDOR can upload!", null, null);
    }

    let insertObj = payload;

    const { q, val } = generateQuery(INSERT, VENDOR_ACTIVITIES, insertObj);
    const response = await query({ query: q, values: val });

    if (response) {
      // handelMail(insertObj);

      return resSend(res, true, 200, "vendor Activities Uploaded successfully !", response, null);
    } else {
      return resSend(res, false, 400, "No data inserted", null, null);
    }

    // }
    // else {
    //     resSend(res, false, 400, "Please upload a valid File", fileData, null);
    // }
  } catch (error) {
    console.error("[error]", error);

    resSend(res, false, 500, SOMTHING_WENT_WRONG, null);
  }
};

const list = async (req, res) => {
  try {
    if (!req.query.poNo) {
      return resSend(res, false, 400, "Please send poNo", null, "");
    }

    const get_query = `SELECT *
            FROM   ${VENDOR_ACTIVITIES} 
            WHERE  ( 1 = 1
                     AND purchasing_doc_no = $1 ) ORDER BY created_at DESC`;
    const result = await query({ query: get_query, values: [req.query.poNo] });

    resSend(res, true, 200, "VENDOR ACTIVITIES List fetched", result.rows, "");
  } catch (err) {
    console.error("data not fetched", err);
    resSend(res, false, 500, SOMTHING_WENT_WRONG, null, "");
  }

  // return resSend(res, true, 200, "oded!", `vendor acc`, null);
};

// async function handelMail(tokenData, payload, event) {
//   try {
//     let emailUserDetailsQuery;
//     let emailUserDetails;
//     let dataObj = payload;
//     emailUserDetailsQuery = getUserDetailsQuery("wdc_certifing_authrity", " $1");
//     emailUserDetails = await getQuery({ query: emailUserDetailsQuery, values: [parseInt(payload.assigned_to)] });
//     await sendMail(WDC_UPLOADING, dataObj, { users: emailUserDetails }, WDC_UPLOADING);
//   } catch (error) {
//     console.error("handelMail qap", error.toString(), error.stack);
//   }
// }

module.exports = { vendorActivities, list };
