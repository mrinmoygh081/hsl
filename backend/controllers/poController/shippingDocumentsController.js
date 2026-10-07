const { resSend } = require("../../lib/resSend");
const { query, getQuery, poolClient, poolQuery } = require("../../config/pgDbConfig");
const { generateQuery, getEpochTime } = require("../../lib/utils");
const { INSERT, USER_TYPE_HSL_STORE, USER_TYPE_HSL_RIC, USER_TYPE_VENDOR } = require("../../lib/constant");
const { SHIPPINGDOCUMENTS } = require("../../lib/tableName");
const { REJECTED, APPROVED, SUBMITTED } = require("../../lib/status");
const { create_reference_no } = require("../../services/po.services");
const { getUserDetailsQuery } = require("../../utils/mailFunc");
const { sendMail } = require("../../services/mail.services");
const { SHIPPING_DOC_UPLOAD, SHIPPING_DOC_REQ_UPLOAD } = require("../../lib/event");
const { checkIsApprovedRejected } = require("../../services/lastassignee.servces");
const { SOMTHING_WENT_WRONG } = require("../../utils/messages");

const shippingDocuments = async (req, res) => {
  let client;
  try {
    client = await poolClient();
    // Handle Image Upload
    let fileData = {};
    if (req.file) {
      fileData = {
        file_name: req.file.filename,
        file_path: req.file.path,
      };
    }
    const tokenData = { ...req.tokenData };

    let payload = { ...req.body, ...fileData, created_at: getEpochTime() };

    if (tokenData.user_type != USER_TYPE_VENDOR && tokenData.department_id != USER_TYPE_HSL_STORE && tokenData.department_id != USER_TYPE_HSL_RIC) {
      return resSend(res, true, 200, "please login as Valid user!", null, null);
    }

    if (!payload.purchasing_doc_no) {
      return resSend(res, false, 200, "Please send valid payload", null, null);
    }

    if (tokenData.department_id === USER_TYPE_HSL_STORE || tokenData.department_id === USER_TYPE_HSL_RIC) {
      if (!payload.reference_no || payload.reference_no == "") {
        return resSend(res, false, 200, "Please send valid reference_no", null, null);
      }

      const check = await checkIsApprovedRejected(SHIPPINGDOCUMENTS, payload.purchasing_doc_no, payload.reference_no, APPROVED, REJECTED);

      if (check > 0) {
        return resSend(res, false, 200, `You can't take any action against this reference no.`, null, null);
      }
    }

    if (tokenData.user_type == USER_TYPE_VENDOR) {
      payload.reference_no = create_reference_no("SD", tokenData.vendor_code);
      payload.status = SUBMITTED;
    }

    payload.vendor_code = tokenData.vendor_code;
    payload.updated_by = tokenData.user_type === USER_TYPE_VENDOR ? "VENDOR" : "HSL";
    payload.created_by_id = tokenData.vendor_code;

    const { q, val } = generateQuery(INSERT, SHIPPINGDOCUMENTS, payload);

    const response = await poolQuery({ client, query: q, values: val });
    if (response) {
      handleEmail(payload);
    }

    resSend(res, true, 200, `Shipping Documents ${payload.status}!`, fileData, null);
  } catch (error) {
    console.error("Shipping Documents Submission api", error.toString());

    resSend(res, false, 500, SOMTHING_WENT_WRONG, null);
  } finally {
    if (client) client.release();
  }
};

const List = async (req, res) => {
  try {
    if (!req.query.poNo) {
      return resSend(res, false, 400, "Please send poNo", null, "");
    }

    const insp_call_query = `SELECT shipping_documents.*
                FROM   shipping_documents AS shipping_documents
            WHERE  ( 1 = 1
                     AND purchasing_doc_no = $1 );`;
    const result = await query({
      query: insp_call_query,
      values: [req.query.poNo],
    });

    resSend(res, true, 200, "Shipping Documents fetched", result.rows, "");
  } catch (err) {
    console.error("data not fetched", err);
    resSend(res, false, 500, SOMTHING_WENT_WRONG, null, null);
  }
};

async function handleEmail(data) {
  // Maill trigger to QA, user dept and dealing officer upon uploading of each inspection call letters
  try {
    let getDoQuery;
    let doDetails;

    if (data.updated_by === "VENDOR") {
      getDoQuery = getUserDetailsQuery("do", "$1");
      doDetails = await getQuery({
        query: getDoQuery,
        values: [data.purchasing_doc_no],
      });
      const dataObj = { ...data };
      await sendMail(SHIPPING_DOC_UPLOAD, dataObj, { users: doDetails }, SHIPPING_DOC_UPLOAD);
    } else if (data.updated_by === "HSL") {
      getDoQuery = getUserDetailsQuery("vendor_by_po", "$1");
      doDetails = await getQuery({
        query: getDoQuery,
        values: [data.purchasing_doc_no],
      });
      const dataObj = { ...data };
      await sendMail(SHIPPING_DOC_REQ_UPLOAD, dataObj, { users: doDetails }, SHIPPING_DOC_REQ_UPLOAD);
    }
  } catch (error) {
    console.error("handleEmail", error.toString(), error.stack);
  }
}

module.exports = { shippingDocuments, List };
