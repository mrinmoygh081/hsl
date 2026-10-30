const { setActualSubmissionDate, create_reference_no, getPoDetails } = require("../../services/po.services");
const { resSend } = require("../../lib/resSend");
const { getQuery, poolClient, poolQuery } = require("../../config/pgDbConfig");
const { generateQuery, getEpochTime } = require("../../lib/utils");
const { INSERT, USER_TYPE_VENDOR, MID_ILMS, BLANK_ASSIGN_USER_CODE } = require("../../lib/constant");
const { ILMS } = require("../../lib/tableName");
const { SUBMITTED, ACCEPTED, APPROVED,REJECTED } = require("../../lib/status");
const { sendMail } = require("../../services/mail.services");
const { checkIsApprovedRejected } = require("../../services/lastassignee.servces");
const { getUserDetailsQuery } = require("../../utils/mailFunc");
const { ILMS_ACKNOWLEDGE_RECEIPT, ILMS_UPLOAD_TO_CDO } = require("../../lib/event");
const Message = require("../../utils/messages");

// true = no action allowed on this reference.
// ACCEPTED closes the reference for everyone. After REJECTED the vendor may upload again,
// while the officer has to wait for that new upload.
const isIlmsRefBlocked = async (purchasing_doc_no, reference_no, forVendor = false) => {
  const rows = await getQuery({
    query: `SELECT status FROM ${ILMS} WHERE purchasing_doc_no = $1 AND reference_no = $2 ORDER BY created_at DESC`,
    values: [purchasing_doc_no, reference_no],
  });
  if (rows.some((r) => r.status === APPROVED)) return true;
  return !forVendor && rows[0]?.status === REJECTED;
};

const submitILMS = async (req, res) => {
  let client;
  try {
    client = await poolClient();

    const { body, tokenData } = req;
    const { purchasing_doc_no, type, status, reference_no } = body;

    // Basic validation
    const allowedStatuses = new Set([SUBMITTED, ACCEPTED, REJECTED,APPROVED]);
    if (!purchasing_doc_no || !type || !allowedStatuses.has(status)) {
      return resSend(res, false, 200, Message.PLEASE_SEND_VALID_PAYLOAD, null, null);
    }

    // Handle uploaded file
    let fileData = {};
    if (req.file) {
      fileData = {
        file_name: req.file.filename || "",
        file_path: req.file.path || "",
      };
    }

    // Get PO details
    const poResult = await getPoDetails(client, { ebeln: purchasing_doc_no }, "ebeln as purchasing_doc_no, ernam as po_creator, lifnr as vendor_code");
    const poDetails = poResult;
    const isDO = poDetails.po_creator === tokenData.vendor_code;
    const isVendor = tokenData.user_type === USER_TYPE_VENDOR;

    if (!isVendor && !isDO) {
      return resSend(res, false, 200, Message.LOGIN_AS_VALID_USER, Message.API_HAS_NO_ACCESS, null);
    }

    if (isVendor && !fileData.file_name) {
      return resSend(res, false, 200, Message.MANDATORY_INPUTS_REQUIRED, "File Missing", null);
    }
    const actionTime = getEpochTime();
    // Build payload
    const payload = {
      ...body,
      ...fileData,
      created_at: actionTime,
      created_by_id: tokenData.vendor_code,
      vendor_code: poDetails.vendor_code,
      updated_by: isVendor ? "VENDOR" : "HSL",
      action_by: tokenData.vendor_code,
      action_to: null,
      action_on: actionTime,
    };

    // DO-specific logic
    if (isDO) {
      if (!reference_no) {
        return resSend(res, false, 200, Message.PLEASE_SEND_VALID_REF_NO, Message.MANDATORY_PARAMETR_MISSING, null);
      }
      // IF ACCEPTED THEN PROCESS FLOW IS END , ELSE ASSIGN TO VENDOR AGAIN

      if (status == ACCEPTED) {
        // Find the vendor who originally submitted this ILMS
        const vendorResult = await poolQuery({
          client,
          query: `
            SELECT action_by
            FROM ${ILMS}
            WHERE purchasing_doc_no = $1
              AND reference_no = $2
              AND status = $3
            ORDER BY created_at ASC
            LIMIT 1
          `,
          values: [purchasing_doc_no, reference_no, SUBMITTED],
        });

        payload.action_by = tokenData.vendor_code; // DO/officer
        payload.action_on = actionTime;
        payload.action_to = vendorResult[0]?.action_by || poDetails.vendor_code;
      }
      if (status == REJECTED || status == APPROVED) {
        payload.action_on = actionTime;
        payload.action_by = tokenData.vendor_code; // Vendor who submitted
        payload.action_to = null;
      }

      if (await isIlmsRefBlocked(purchasing_doc_no, reference_no)) {
        return resSend(res, false, 200, Message.YOU_CANT_TAKE_ACTION_AGAINST_REF_NO, Message.YOU_ARE_UN_AUTHORIZED, null);
      }
      if (status === SUBMITTED && isVendor) {
        payload.action_by = tokenData.vendor_code; // Vendor who submitted
        payload.action_to = poDetails.po_creator;  // DO/officer receiving it
        payload.action_on = getEpochTime();
        sendMailToDO(payload);
      }
    }

    // Vendor-specific logic
    if (isVendor) {
      if (reference_no) {
        // Vendor uploads again under an existing reference: it must belong to this PO + vendor and still be open.
        const own = await getQuery({
          query: `SELECT COUNT(*) AS count_val FROM ${ILMS} WHERE purchasing_doc_no = $1 AND reference_no = $2 AND vendor_code = $3`,
          values: [purchasing_doc_no, reference_no, poDetails.vendor_code],
        });
        if (!Number(own?.[0]?.count_val)) {
          return resSend(res, false, 200, Message.PLEASE_SEND_VALID_REF_NO, Message.MANDATORY_PARAMETR_MISSING, null);
        }
        if (await isIlmsRefBlocked(purchasing_doc_no, reference_no, true)) {
          return resSend(res, false, 200, Message.YOU_CANT_TAKE_ACTION_AGAINST_REF_NO, Message.YOU_ARE_UN_AUTHORIZED, null);
        }
        payload.reference_no = reference_no;
      } else {
        payload.reference_no = create_reference_no("ILMS", tokenData.vendor_code);
      }
      payload.action_by = tokenData.vendor_code;
      payload.action_to = poDetails.po_creator;
      payload.action_on = actionTime;
    }

    // Insert ILMS data
    const { q, val } = generateQuery(INSERT, ILMS, payload);
    await poolQuery({ client, query: q, values: val });

    // Additional side effects
    if (status === APPROVED) {
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
    await sendMail(ILMS_UPLOAD_TO_CDO, dataObj, { users: mail_details }, ILMS_UPLOAD_TO_CDO);
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
    await sendMail(ILMS_ACKNOWLEDGE_RECEIPT, dataObj, { users: vendorDetails }, ILMS_ACKNOWLEDGE_RECEIPT);
  } catch (error) {
    console.error("sendMailToVendor error", error.toString(), error.stack);
  }
}

module.exports = {
  submitILMS,
  list,
};