const { resSend } = require("../../lib/resSend");
const { query, getQuery } = require("../../config/pgDbConfig");
const { generateQuery, getEpochTime } = require("../../lib/utils");
const { INSERT } = require("../../lib/constant");
const { INSPECTIONCALLLETTER } = require("../../lib/tableName");
const { inspectionCallLetterPayload } = require("../../services/po.services");
const { INSP_CALL_LETTER_UPLOAD } = require("../../lib/event");
const { getUserDetailsQuery } = require("../../utils/mailFunc");
const { sendMail } = require("../../services/mail.services");
const Message = require("../../utils/messages");

// ----------------------------------------------------------------------

const inspectionCallLetter = async (req, res) => {
  try {
    let fileData = {};
    if (req.file) {
      fileData = {
        fileName: req.file.filename,
        filePath: req.file.path,
        fileType: req.file.mimetype,
        fileSize: req.file.size,
      };
    }
    const tokenData = { ...req.tokenData };

    const by = tokenData.user_type === 1 ? "VENDOR" : "HSL";

    const payload = {
      ...req.body,
      vendor_code: tokenData.vendor_code,
      created_at: getEpochTime(),
      created_by_id: tokenData.vendor_code,
      updated_by: by,
      ...fileData,
    };
    if (!payload.purchasing_doc_no) {
      return resSend(res, false, 400, "Please send valid payload", null, null);
    }

    let insertObj = inspectionCallLetterPayload(payload);

    const { q, val } = generateQuery(INSERT, INSPECTIONCALLLETTER, insertObj);
    const response = await query({ query: q, values: val });

    if (response.rowCount) {
      handleEmail(insertObj);

      resSend(res, true, 200, "Ispection call letter inserted successfully !", response, null);
    } else {
      resSend(res, false, 400, "No data inserted", null, null);
    }

  } catch (error) {
    console.error(error.message);

    return resSend(res, false, 500, Message.SOMTHING_WENT_WRONG, null);
  }
};

const List = async (req, res) => {
  try {
    if (!req.query.poNo) {
      return resSend(res, false, 400, "Please send poNo", null, "");
    }

    const insp_call_query = `SELECT call_ltr.*
            FROM   inspection_call_letter AS call_ltr
            WHERE  ( 1 = 1
                     AND purchasing_doc_no = $1 )`;
    const result = await query({
      query: insp_call_query,
      values: [req.query.poNo],
    });

    resSend(res, true, 200, "Inspection call letter fetched", result.rows, "");
  } catch (err) {
    console.error("data not fetched", err);
    resSend(res, false, 500, Message.SOMTHING_WENT_WRONG, null, "");
  }
};

async function handleEmail(data) {
  // Maill trigger to QA, user dept and dealing officer upon uploading of each inspection call letters.

  // QA, USER DEPT AND DEALING OFFICER

  try {
    const getDoQuery = getUserDetailsQuery("do", "$1");
    const doDetails = await getQuery({
      query: getDoQuery,
      values: [data.purchasing_doc_no],
    });
    const dataObj = { ...data };
    await sendMail(INSP_CALL_LETTER_UPLOAD, dataObj, { users: doDetails }, INSP_CALL_LETTER_UPLOAD);
  } catch (error) {
    console.error("handleEmail", error.toString(), error.stack);
  }
}

module.exports = { inspectionCallLetter, List };
