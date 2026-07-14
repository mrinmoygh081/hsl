
const { setActualSubmissionDate, create_reference_no, getPoDetails } = require("../../services/po.services");
const { resSend } = require("../../lib/resSend");
const { getQuery, poolClient, poolQuery } = require("../../config/pgDbConfig");
const { generateQuery, getEpochTime } = require("../../lib/utils");
const { INSERT, USER_TYPE_VENDOR, MID_ILMS, BLANK_ASSIGN_USER_CODE } = require("../../lib/constant");
const { ILMS } = require("../../lib/tableName");
const { SUBMITTED, ACCEPTED,  REJECTED } = require("../../lib/status");
const { sendMail } = require("../../services/mail.services");
const { checkIsApprovedRejected} = require("../../services/lastassignee.servces");
const { getUserDetailsQuery } = require("../../utils/mailFunc");
const { ILMS_ACKNOWLEDGE_RECEIPT, ILMS_UPLOAD_TO_CDO } = require("../../lib/event");
const Message = require("../../utils/messages");



const submitILMS = async (req, res) => {
  let client;
  try {
    client = await poolClient();

    const {  body, tokenData } = req;
    const { purchasing_doc_no, type, status, reference_no } = body;

    // Basic validation
    const allowedStatuses = new Set([SUBMITTED, ACCEPTED, REJECTED]);
    if (!purchasing_doc_no || !type || !allowedStatuses.has(status)) {
      return resSend(res, false, 200, Message.PLEASE_SEND_VALID_PAYLOAD, null, null);
    }

    // Handle uploaded file
    let fileData = {}
    if (req.file) {
      fileData = {
        file_name: req.file.filename || "",
        file_path: req.file.path || "",
        // fileType: req.file.mimetype,
        // fileSize: req.file.size,
      }
    }



    // Get PO details
    const poResult = await getPoDetails(
      client,
      { ebeln: purchasing_doc_no },
      "ebeln as purchasing_doc_no, ernam as po_creator, lifnr as vendor_code"
    );
    const poDetails = poResult;
    const isDO = poDetails.po_creator === tokenData.vendor_code;
    const isVendor = tokenData.user_type === USER_TYPE_VENDOR;

    if (!isVendor && !isDO) {
      return resSend(res, false, 200, Message.LOGIN_AS_VALID_USER, Message.API_HAS_NO_ACCESS, null);
    }


    if (isVendor && !fileData.file_name) {
      return resSend(res, false, 200, Message.MANDATORY_INPUTS_REQUIRED, "File Missing", null);
    }

    // Build payload
    const payload = {
      ...body,
      ...fileData,
      created_at: getEpochTime(),
      created_by_id: tokenData.vendor_code,
      action_by: tokenData.vendor_code,
      vendor_code: poDetails.vendor_code,
      updated_by: isVendor ? "VENDOR" : "GRSE"
    };

    // DO-specific logic
    if (isDO) {
      if (!reference_no) {
        return resSend(res, false, 200, Message.PLEASE_SEND_VALID_REF_NO, Message.MANDATORY_PARAMETR_MISSING, null);
      }
      // IF ACCEPTED THEN PROCESS FLOW IS END , ELSE ASSIGN TO VENDOR AGAIN

      if (status == ACCEPTED) {
        payload.action_on = BLANK_ASSIGN_USER_CODE;
      }
      if (status == SUBMITTED || status == REJECTED) {
        payload.action_on = poDetails.vendor_code;
      }

      const check = await checkIsApprovedRejected(ILMS, purchasing_doc_no, reference_no, ACCEPTED, REJECTED);
      if (check > 0) {
        return resSend(res, false, 200, Message.YOU_CANT_TAKE_ACTION_AGAINST_REF_NO, Message.YOU_ARE_UN_AUTHORIZED, null);
      }
      if (status === SUBMITTED && isVendor) {
        sendMailToDO(payload);
      }
    }

    // Vendor-specific logic
    if (isVendor) {
      payload.reference_no = create_reference_no("ILMS", tokenData.vendor_code);
      payload.action_on = poDetails.po_creator;
    }

    // Insert ILMS data
    const { q, val } = generateQuery(INSERT, ILMS, payload);
    await poolQuery({ client, query: q, values: val });

    // Additional side effects
    if (status === ACCEPTED) {
      await setActualSubmissionDate(payload, MID_ILMS, tokenData, SUBMITTED, client);
      sendMailToVendor(payload);
    }

    if (status === SUBMITTED && isVendor) {
      sendMailToDO(payload);
    }

    resSend(res, true, 200, `ILMS ${status}!`, fileData, null);

  } catch (error) {
    const code = client ? 500 : 502;
    const message = client ? Message.SERVER_ERROR : Message.DB_CONN_ERROR;
    console.error("ILMS Submission API:", error);
    resSend(res, false, code, message, error.message, null);
  } finally {
    if (client) client.release();
  }
};




const list = async (req, res) => {
  try {
    const { poNo } = req.query;
    if (!poNo) {
      return resSend(res, true, 200, "Please send PO Number.", [], null);
    }

    const getIlmsQuerey = `
    SELECT    ilms.*,
          COALESCE(NULLIF(action_by_user.cname, ''), v_action_by.name1) AS action_by_name,
          COALESCE(NULLIF(action_on_user.cname, ''), v_action_on.name1) AS action_on_name
      FROM      ilms                                                          AS ilms
      LEFT JOIN pa0002                                                        AS action_by_user
      ON        (
                          action_by_user.pernr::character VARYING = ilms.action_by)
      LEFT JOIN pa0002 AS action_on_user
      ON        (
                          action_on_user.pernr::character VARYING = ilms.action_on)
      LEFT JOIN lfa1 AS v_action_by
      ON        (
                          v_action_by.lifnr::character VARYING = ilms.action_by)
      LEFT JOIN lfa1 AS v_action_on
      ON        (
                          v_action_on.lifnr::character VARYING = ilms.action_on)
      WHERE ilms.purchasing_doc_no = $1 ORDER BY id ASC`;
    const result = await getQuery({ query: getIlmsQuerey, values: [poNo] });
    resSend(res, true, 200, "data fetch successfully.", result, null);
  } catch (error) {
    console.error("[error]", error);
    resSend(res, false, 500, Message.SERVER_ERROR, null, null);
  }
};


async function sendMailToDO(data) {
  try {
    let vendorDetails = getUserDetailsQuery("do", "$1");
    const mail_details = await getQuery({
      query: vendorDetails,
      values: [data.purchasing_doc_no],
    });
    const dataObj = { ...data };
    await sendMail(
      ILMS_UPLOAD_TO_CDO,
      dataObj,
      { users: mail_details },
      ILMS_UPLOAD_TO_CDO
    );
  } catch (error) {
    console.error("sendMailToCDOandDO", error.toString(), error.stack);
  }
}
async function sendMailToVendor(data) {
  try {
    let vendorDetailsQuery = getUserDetailsQuery("vendor_by_po", "$1");

    const vendorDetails = await getQuery({
      query: vendorDetailsQuery,
      values: [data.purchasing_doc_no],
    });
    const dataObj = { ...data };
    await sendMail(
      ILMS_ACKNOWLEDGE_RECEIPT,
      dataObj,
      { users: vendorDetails },
      ILMS_ACKNOWLEDGE_RECEIPT
    );
  } catch (error) {
    console.error("sendMailToVendor error", error.toString(), error.stack);
  }
}

module.exports = {
  submitILMS,
  list,
};
