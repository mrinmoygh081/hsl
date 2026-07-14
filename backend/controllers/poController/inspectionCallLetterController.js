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
  // resSend(res, true, 200, "file upleeoaded!", req.body, null);
  try {
    // const lastParam = req.path.split("/").pop();
    // Handle Image Upload
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

    const by = tokenData.user_type === 1 ? "VENDOR" : "GRSE";

    const payload = {
      ...req.body,
      vendor_code: tokenData.vendor_code,
      created_at: getEpochTime(),
      created_by_id: tokenData.vendor_code,
      updated_by: by,
      ...fileData,
    };
    if (!payload.purchasing_doc_no) {
      // const directory = path.join(__dirname, '..', 'uploads', lastParam);
      // const isDel = handleFileDeletion(directory, req.file.filename);
      return resSend(res, false, 400, "Please send valid payload", null, null);
    }

    // if (payload.status === PENDING) {
    //     insertObj = inspectionCallLetterPayload(payload, PENDING);
    // } else if (payload.status === RE_SUBMITTED) {
    //     // insertObj = inspectionCallLetterPayload(payload, RE_SUBMITTED);
    // } else if (payload.status === APPROVED) {
    //     insertObj = inspectionCallLetterPayload(payload, APPROVED);
    // }
    // insertObj = inspectionCallLetterPayload(payload, PENDING);

    let insertObj = inspectionCallLetterPayload(payload);

    const { q, val } = generateQuery(INSERT, INSPECTIONCALLLETTER, insertObj);
    const response = await query({ query: q, values: val });

    if (response.rowCount) {
      handleEmail(insertObj);

      resSend(
        res,
        true,
        200,
        "Ispection call letter inserted successfully !",
        response,
        null
      );
    } else {
      resSend(res, false, 400, "No data inserted", null, null);
    }

    // }
    // else {
    //     resSend(res, false, 400, "Please upload a valid File", fileData, null);
    // }
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
  // resSend(res, true, 200, "oded!", req.query.dd, null);
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
    await sendMail(
      INSP_CALL_LETTER_UPLOAD,
      dataObj,
      { users: doDetails },
      INSP_CALL_LETTER_UPLOAD
    );
  } catch (error) {
    console.error("handleEmail", error.toString(), error.stack);
  }
}

module.exports = { inspectionCallLetter, List };
