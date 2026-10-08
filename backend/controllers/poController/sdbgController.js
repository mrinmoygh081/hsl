/* eslint-disable no-undef */
/* eslint-disable no-unsafe-finally */

const { setActualSubmissionDate, create_reference_no, getPoDetails } = require("../../services/po.services");
const { resSend } = require("../../lib/resSend");
const { query, getQuery, poolClient, poolQuery } = require("../../config/pgDbConfig");
const { generateQuery, getEpochTime, getDateString, sapToGetEpochTime } = require("../../lib/utils");
const { INSERT, UPDATE, USER_TYPE_VENDOR, ASSIGNER, STAFF, USER_TYPE_HSL_FINANCE, ACTION_SDBG, ACTION_DD, ACTION_IB, MID_SDBG } = require("../../lib/constant");
const { EKKO, SDBG_ENTRY, SDBG, ACTUAL_SUBMISSION_DB, SDBG_SAVE, SDBG_RECOMMENDATION, EMPLAYEE_MASTER_PA0002 } = require("../../lib/tableName");
const { FINANCE } = require("../../lib/depertmentMaster");
const { ASSIGNED, RE_SUBMITTED, REJECTED, FORWARD_TO_FINANCE, RETURN_TO_DO, APPROVED, SUBMITTED, SAVED } = require("../../lib/status");
const { sendMail } = require("../../services/mail.services");
const { BG_UPLOAD_BY_VENDOR, BG_ENTRY_BY_DO, BG_ASSIGN, BG_RETURN_TO_DO, BG_RECEIVED, BG_APPROVED_BANK_CONFIRM } = require("../../lib/event");
const { makeHttpRequest } = require("../../config/sapServerConfig");
const { zfi_bgm_1_Payload } = require("../../services/sap.services");
const { getUserDetailsQuery } = require("../../utils/mailFunc");
const { getLastAssignee, getAssigneeList, checkIsAssigned, checkIsApprovedRejected, insertSdbgEntrySave } = require("../../services/lastassignee.servces");
const { sdbgPayloadVendor, sdbgEntryPayload } = require("../../services/sdbg.services");
const Message = require("../../utils/messages");
const QueryBuilder = require("../../utils/QueryBuilder");

// SDBG SUBMISSION BY VENDOR
const submitSDBG = async (req, res) => {
  let client;
  try {
    client = await poolClient();
    await client.query("BEGIN");

    const tokenData = req.tokenData;

    if (tokenData.user_type != USER_TYPE_VENDOR) {
      return resSend(res, false, 200, Message.LOGIN_AS_VALID_USER, null, null);
    }

    let payload = {
      ...req.body,
      vendor_code: tokenData.vendor_code,
      created_by_id: tokenData.vendor_code,
      created_by: tokenData.vendor_code,
      created_at: getEpochTime(),
      updated_by: "VENDOR",
      action_by: tokenData.vendor_code,
      assigned_from: tokenData.vendor_code,
    };

    let action_type = payload.action_type;
    const firstTwoChars = action_type.slice(0, 2);
    action_type = firstTwoChars.toUpperCase();
    const reference_no = create_reference_no(action_type, tokenData.vendor_code);
    payload.reference_no = reference_no;

    const poDetails = await getPoDetails(client, { ebeln: payload?.purchasing_doc_no }, "ernam");
    payload.action_on = poDetails?.ernam;
    payload.assigned_to = poDetails?.ernam;
    payload.check_list_reference = reference_no;
    payload.check_list_date = getEpochTime();

    const sdbgPayload1 = sdbgPayloadVendor(payload, "");
    const sdbgPayload2 = sdbgEntryPayload(payload, "");

    // DYNAMIC ACTION TYPE FOR ALL BG TYPE

    const verifyStatus = new Set([SUBMITTED, RE_SUBMITTED]);

    if (!sdbgPayload1.success && !sdbgPayload2.success && !verifyStatus.has(payload.status)) {
      return resSend(res, false, 200, Message.VALIDATION_UNSUCCESSFULL, { sdbgPayload1, sdbgPayload2 });
    }

    const qb1 = generateQuery(INSERT, SDBG, sdbgPayload1.data);
    const qb2 = generateQuery(INSERT, SDBG_ENTRY, sdbgPayload2.data);
    await Promise.all([poolQuery({ client, query: qb1.q, values: qb1.val }), poolQuery({ client, query: qb2.q, values: qb2.val })]);
    await client.query("COMMIT");

    handelEmail(payload, tokenData);
    resSend(res, true, 200, Message.DATA_SEND_SUCCESSFULL, { reference_no }, null);
  } catch (error) {
    console.error("submitSDBG error", error, error.message);
    if (client) {
      await client.query("ROLLBACK");
    }
    resSend(res, false, 500, Message.SOMTHING_WENT_WRONG, null, null);
  } finally {
    if (client) {
      client.release();
    }
  }
};

const getSDBGData = async (req, res) => {
  try {
    if (!req.query.poNo) {
      return resSend(res, true, 200, "Please send PO Number.", null, null);
    }

    const Q = `SELECT * FROM ${SDBG} WHERE purchasing_doc_no = $1 order by created_at DESC`;
    const result = await getQuery({
      query: Q,
      values: [req.query.poNo],
    });

    return resSend(res, true, 200, "data fetch successfully.", result, null);
  } catch (error) {
    return resSend(res, false, 400, "Data not fetch!!", error, null);
  }
};

const getSdbgEntry = async (req, res) => {
  try {
    const tokenData = { ...req.tokenData };

    if (!req.query.poNo) {
      return resSend(res, true, 200, "Please send PO Number.", null, null);
    }
    const { poNo, reference_no } = req.query;

    const qb1 = new QueryBuilder("sdbg_entry AS t1");
    qb1.select(["t1.*", "t2.reference_no"]);
    qb1.joinTable("LEFT", " sdbg AS t2", "t2.reference_no= t1.reference_no");
    qb1.where("t1.purchasing_doc_no", "=", poNo);
    qb1.where("t2.reference_no", "=", reference_no);

    const dealingOfficer = await checkIsDealingOfficer(poNo, tokenData.vendor_code);

    if (tokenData.department_id === USER_TYPE_HSL_FINANCE && tokenData.internal_role_id === ASSIGNER) {
      qb1.where("t2.status", "=", FORWARD_TO_FINANCE);
    } else if (tokenData.department_id === USER_TYPE_HSL_FINANCE && tokenData.internal_role_id === STAFF) {
      qb1.where("t2.assigned_to", "=", tokenData.vendor_code);
    } else if (dealingOfficer !== 1) {
      return resSend(res, false, 200, "You are not authorized.", null, null);
    }
    const getSdbgEntryQuery = qb1.toJSON();
    const result = await getQuery({ query: getSdbgEntryQuery.sql, values: getSdbgEntryQuery.params });

    resSend(res, true, 200, Message.DATA_FETCH_SUCCESSFULL, result[0], null);
  } catch (error) {
    console.error("GET SDBG ENTRY ERROR", error.message, error);
    resSend(res, false, 400, Message.DATA_FETCH_ERROR, null, null);
  }
};

const checkIsDealingOfficer = async (purchasing_doc_no, vendor_code) => {
  const query = `SELECT COUNT(EBELN) AS man_no FROM ${EKKO} WHERE EBELN = $1 AND ERNAM = $2`;
  const result = await getQuery({
    query: query,
    values: [purchasing_doc_no, vendor_code],
  });
  return result[0].man_no;
};

const sdbgSubmitByDealingOfficer = async (req, res) => {
  try {
    const client = await poolClient();
    try {
      const tokenData = { ...req.tokenData };

      const { ...obj } = req.body;

      if (
        !obj ||
        typeof obj !== "object" ||
        !Object.keys(obj).length ||
        !obj.purchasing_doc_no ||
        obj.purchasing_doc_no == "" ||
        !obj.reference_no ||
        obj.reference_no == "" ||
        !obj.status ||
        !obj.remarks ||
        obj.remarks == ""
      ) {
        return resSend(res, false, 200, "INVALID PAYLOAD", null, null);
      }

      if (obj.status != FORWARD_TO_FINANCE && obj.status != REJECTED) {
        return resSend(res, false, 200, "PLEASE SEND A VALID STATUS", null, null);
      }
      const isDO = await checkIsDealingOfficer(obj.purchasing_doc_no, tokenData.vendor_code);

      if (isDO === 0) {
        return resSend(res, false, 200, "Please Login as dealing officer.", null, null);
      }

      const check = await checkIsApprovedRejected(SDBG, obj.purchasing_doc_no, obj.reference_no, APPROVED, REJECTED);
      if (check > 0) {
        return resSend(res, false, 200, `You can't take any action against this reference no.`, null, null);
      }
      if (obj.status === FORWARD_TO_FINANCE) {
        if (
          !obj.bank_addr1 ||
          obj.bank_addr1 == "" ||
          !obj.bank_city ||
          obj.bank_city == "" ||
          !obj.bank_name ||
          obj.bank_name == "" ||
          !obj.bank_email ||
          obj.bank_email == "" ||
          !obj.bank_pin_code ||
          obj.bank_pin_code == "" ||
          !obj.bg_ammount ||
          obj.bg_ammount == null ||
          !obj.bg_date ||
          obj.bg_date == null ||
          !obj.bg_no ||
          obj.bg_no == "" ||
          !obj.bg_recived_date ||
          obj.bg_recived_date == null ||
          !obj.bg_type ||
          obj.bg_type == null ||
          !obj.claim_priod ||
          obj.claim_priod == "" ||
          !obj.validity_date ||
          obj.validity_date == null
        ) {
          return resSend(res, false, 200, `INVALID PAYLOAD WHEN ${FORWARD_TO_FINANCE}`, null, null);
        }
        let sdbgQueryInsert = await insertSdbgEntrySave(SDBG_ENTRY, obj, tokenData);
        if (!sdbgQueryInsert) {
          return resSend(res, false, 201, "Data not insert in sdbg Entry table!!", null, null);
        }

        // BG_ENTRY_BY_DO
        const deleteSdbgSaveQuery = `DELETE FROM ${SDBG_SAVE} WHERE reference_no = $1`;
        await poolQuery({
          client,
          query: deleteSdbgSaveQuery,
          values: [obj.reference_no],
        });
        handelEmail(obj, tokenData);
      }

      const Q = `SELECT file_name,file_path,action_type,vendor_code,bg_no FROM ${SDBG} WHERE purchasing_doc_no = $1 AND reference_no = $2`;
      let sdbgResult = await poolQuery({
        client,
        query: Q,
        values: [obj.purchasing_doc_no, obj.reference_no],
      });
      let sdbgDataResult = sdbgResult[0];
      const insertPayloadForSdbg = {
        reference_no: obj.reference_no,
        purchasing_doc_no: obj.purchasing_doc_no,
        ...sdbgDataResult,
        remarks: obj.status === REJECTED ? `This BG is ${REJECTED}` : `BG entry forwarded to Finance.`,
        status: obj.status,
        assigned_from: tokenData.vendor_code,
        assigned_to: obj.status == REJECTED ? sdbgDataResult?.vendor_code : "FINANCE_NODAL",
        created_at: getEpochTime(),
        created_by_name: "Dealing officer",
        created_by_id: tokenData.vendor_code,
        updated_by: "HSL",
        action_by: tokenData.vendor_code,
        action_on: obj.status == REJECTED ? sdbgDataResult?.vendor_code : "FINANCE_NODAL",
      };

      let insertsdbg_q = generateQuery(INSERT, SDBG, insertPayloadForSdbg);
      let sdbgQuery = await poolQuery({
        client,
        query: insertsdbg_q["q"],
        values: insertsdbg_q["val"],
      });

      let msg = obj.status === REJECTED ? `This BG is Rejected.` : `Forworded to finance successfully!`;
      return resSend(res, true, 200, msg, sdbgQuery[0], null);
    } catch (error) {
      console.error(error);
      return resSend(res, false, 201, "Data not insert!!", error, null);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("[error]", error);
    resSend(res, false, 500, Message.SOMTHING_WENT_WRONG, null);
  }
};

const sdbgUpdateByFinance = async (req, res) => {
  const tokenData = { ...req.tokenData };
  const { ...obj } = req.body;
  let sdgbRollBackId;
  let client;
  try {
    client = await poolClient();
    if (!obj.purchasing_doc_no || obj.purchasing_doc_no == "" || !obj.remarks || obj.remarks == "" || !obj.status || obj.status == "") {
      return resSend(res, false, 200, "please send a valid payload!", null, null);
    }

    if (tokenData.department_id != FINANCE) {
      return resSend(res, false, 200, "please login as finance!", null, null);
    }
    if (tokenData.internal_role_id == ASSIGNER && obj.assigned_to && obj.status == ASSIGNED) {
      /**
       * checked already assigned to
       */
      const check_assign_to_query = `SELECT * FROM ${SDBG}  WHERE purchasing_doc_no = $1 AND assigned_to = $2`;
      const check_assign_to_data = await poolQuery({
        client,
        query: check_assign_to_query,
        values: [obj.purchasing_doc_no, obj.assigned_to],
      });

      if (check_assign_to_data.length) {
        return resSend(res, false, 200, `The BG is already assigned to : ${obj.assigned_to} `, null, null);
      }
      const insertPayloadForSdbg = {
        purchasing_doc_no: obj.purchasing_doc_no,
        reference_no: "SDBG ASSIGNED",
        status: obj.status,
        file_name: "",
        file_path: "",
        action_type: "",
        vendor_code: "",
        assigned_from: tokenData.vendor_code,
        assigned_to: obj.assigned_to,
        action_by: tokenData.vendor_code,
        action_on: obj.assigned_to,
        last_assigned: 1,
        created_at: getEpochTime(),
        created_by_name: "finance dept",
        created_by_id: tokenData.vendor_code,
        updated_by: "HSL",
      };

      let { q, val } = generateQuery(INSERT, SDBG, insertPayloadForSdbg);

      await poolQuery({
        client,
        query: q,
        values: val,
      });

      const update_assign_to = `UPDATE ${SDBG} SET last_assigned = 0 WHERE purchasing_doc_no = $1 AND assigned_to != $2`;
      await poolQuery({
        client,
        query: update_assign_to,
        values: [obj.purchasing_doc_no, obj.assigned_to],
      });

      handelEmail(insertPayloadForSdbg, tokenData);

      return resSend(res, true, 200, `The BG is ASSIGNED successfully.`, null, null);
    }
    await client.query("BEGIN");
    const get_sdbg_entry_query = `SELECT * FROM ${SDBG_ENTRY} WHERE purchasing_doc_no = $1 AND reference_no = $2`;
    let get_sdbg_entry_data = await poolQuery({
      client,
      query: get_sdbg_entry_query,
      values: [obj.purchasing_doc_no, obj.reference_no],
    });
    if (get_sdbg_entry_data[0]?.status === RETURN_TO_DO) {
      return resSend(res, false, 200, `This BG is ${RETURN_TO_DO}.Befoure take action by DO. YOU CAN not do any action!`, null, null);
    }

    const star = `file_name,file_path,vendor_code,action_type,bg_no`;

    const get_sdbg_query = `SELECT ${star} FROM ${SDBG} WHERE purchasing_doc_no = $1 AND reference_no = $2`;
    const action_type_with_vendor_code = await poolQuery({
      client,
      query: get_sdbg_query,
      values: [obj.purchasing_doc_no, obj.reference_no],
    });

    if (tokenData.internal_role_id == STAFF) {
      const assign = `assigned_to`;
      let checkAssig = await checkIsAssigned(SDBG, obj.purchasing_doc_no, tokenData.vendor_code, assign);

      if (checkAssig != 1) {
        return resSend(res, false, 200, "This PO is not assign to you!", null, null);
      }
    }

    const check = await checkIsApprovedRejected(SDBG, obj.purchasing_doc_no, obj.reference_no, APPROVED, REJECTED);
    if (check > 0) {
      return resSend(res, false, 200, `You can't take any action against this reference no.`, null, null);
    }

    const checkIsHold = `SELECT COUNT(status) AS count_val FROM ${SDBG} WHERE purchasing_doc_no = $1 AND reference_no = $2 AND status = $3`;
    const checkIsHoldQry = await getQuery({
      query: checkIsHold,
      values: [obj.purchasing_doc_no, obj.reference_no, "HOLD"],
    });
    const isHold = checkIsHoldQry[0].count_val;
    if (isHold == 1 && obj.status != APPROVED) {
      return resSend(res, false, 200, `YOU CAN ONLY RECIVED WHEN BG IS HOLD.`, null, null);
    }

    const check_it_forward_to_finance = `SELECT COUNT(status) AS count_val FROM ${SDBG} WHERE purchasing_doc_no = $1 AND status = $2`;

    const result = await poolQuery({
      client,
      query: check_it_forward_to_finance,
      values: [obj.purchasing_doc_no, FORWARD_TO_FINANCE],
    });

    if (result[0].count_val == 0) {
      return resSend(res, true, 200, "This po is not forward to finance.Please contact with dealing officer.", null, null);
    }

    // Unique BG Tracking Number is system-generated on acceptance (APPROVED/HOLD),
    // never taken from the client. Re-use one already generated during an earlier HOLD.
    let uFile;
    if (obj.status === RETURN_TO_DO) {
      uFile = null;
    } else if (obj.status === APPROVED || obj.status === "HOLD") {
      uFile = get_sdbg_entry_data[0]?.bg_file_no || create_reference_no("BGT", tokenData.vendor_code);
    } else {
      uFile = get_sdbg_entry_data[0]?.bg_file_no || null;
    }

    const insertPayloadForSdbg = {
      reference_no: obj.reference_no,
      purchasing_doc_no: obj.purchasing_doc_no,
      remarks: obj.remarks,
      status: obj.status,
      action_type: action_type_with_vendor_code[0]?.action_type,
      vendor_code: action_type_with_vendor_code[0]?.vendor_code,
      file_name: action_type_with_vendor_code[0]?.file_name,
      file_path: action_type_with_vendor_code[0]?.file_path,
      last_assigned: 0,
      created_at: getEpochTime(),
      created_by_name: "finance dept",
      created_by_id: tokenData.vendor_code,
      updated_by: "HSL",
      bg_no: action_type_with_vendor_code[0]?.bg_no,
    };
    const insertsdbg_q = generateQuery(INSERT, SDBG, insertPayloadForSdbg);

    let sdbgQuery = await poolQuery({
      client,
      query: insertsdbg_q["q"],
      values: insertsdbg_q["val"],
    });

    sdgbRollBackId = sdbgQuery[0].id;

    // bg_file_no/bank_email/bank_name are email-only fields, not sdbg table columns
    handelEmail(
      {
        ...insertPayloadForSdbg,
        bg_file_no: uFile,
        bank_email: get_sdbg_entry_data[0]?.bank_email,
        bank_name: get_sdbg_entry_data[0]?.bank_name,
      },
      tokenData,
    );
    const whereCondition = {
      purchasing_doc_no: obj.purchasing_doc_no,
      reference_no: obj.reference_no,
    };

    ({ q, val } = generateQuery(UPDATE, SDBG_ENTRY, { status: obj.status, bg_file_no: uFile }, whereCondition));

    await poolQuery({
      client,
      query: q,
      values: val,
    });
    if (obj.status === RETURN_TO_DO) {
      await client.query("COMMIT");
      return resSend(res, true, 200, "this is return to do.", null, null);
    }

    if (
      insertPayloadForSdbg.status == APPROVED &&
      (action_type_with_vendor_code[0]?.action_type == ACTION_SDBG ||
        action_type_with_vendor_code[0]?.action_type == ACTION_IB ||
        action_type_with_vendor_code[0]?.action_type == ACTION_DD)
    ) {
      const actual_subminission = await setActualSubmissionDate(insertPayloadForSdbg, MID_SDBG, tokenData, SUBMITTED);
      if (actual_subminission === false) {
        return resSend(res, false, 200, `error into data insertion taable ${ACTUAL_SUBMISSION_DB} `, null, null);
      }
    }

    if (insertPayloadForSdbg.status == APPROVED || insertPayloadForSdbg.status == "HOLD") {
      try {
        const get_po_date_query = `SELECT aedat FROM ${EKKO} WHERE EBELN = $1`;
        let get_po_date_data = await poolQuery({
          client,
          query: get_po_date_query,
          values: [obj.purchasing_doc_no],
        });

        get_sdbg_entry_data[0].po_date = getDateString(get_po_date_data[0].aedat);
        if (insertPayloadForSdbg.status == "HOLD") {
          get_sdbg_entry_data[0].confirmation = `No`;
        }

        const sendSap = await sendBgToSap({ ...get_sdbg_entry_data[0], bg_file_no: uFile }, sdgbRollBackId);
        if (sendSap == false) {
          await client.query("ROLLBACK");

          return resSend(res, false, 200, `SAP not connected.`, sdbgQuery, null);
        } else if (sendSap == true) {
          await client.query("COMMIT");
        }
      } catch (error) {
        console.error(error.message);
      }
    }

    return resSend(res, true, 200, `This BG is ${obj.status}.`, sdbgQuery, null);
  } catch (error) {
    console.error(error);
    return resSend(res, false, 500, Message.SOMTHING_WENT_WRONG, error, null);
  } finally {
    client.release();
  }
};

const assigneeList = async (req, res) => {
  try {
    const tokenData = { ...req.tokenData };

    if (tokenData.department_id != FINANCE || tokenData.internal_role_id != ASSIGNER) {
      return resSend(res, true, 200, "Please Login as Finance Assigner.", null, null);
    }

    const dept_id = FINANCE;
    const internal_role_id = 2;
    let result = await getAssigneeList(dept_id, internal_role_id);
    resSend(res, true, 200, "SDBG assigneeList fetch successfully!", result, null);
  } catch (error) {
    console.error("Error executing the query:", error.message);
    resSend(res, false, 500, Message.SOMTHING_WENT_WRONG, null);
  }
};

async function handelEmail(payload, tokenData) {
  let emailUserDetailsQuery;
  let emailUserDetails;
  let dataObj = payload;
  if (tokenData.user_type === USER_TYPE_VENDOR && payload.status == SUBMITTED) {
    // BG_UPLOAD_BY_VENDOR
    emailUserDetailsQuery = getUserDetailsQuery("do", "$1");
    emailUserDetails = await getQuery({
      query: emailUserDetailsQuery,
      values: [payload.purchasing_doc_no],
    });
    const emailUserDetails2 = await getQuery({
      query: getUserDetailsQuery("vendor_by_po", "$1"),
      values: [payload.purchasing_doc_no],
    });
    dataObj = { ...dataObj, vendor_name: emailUserDetails2[0]?.u_name };
    await sendMail(BG_UPLOAD_BY_VENDOR, dataObj, { users: emailUserDetails }, BG_UPLOAD_BY_VENDOR);
  }
  if (tokenData.dept_id != USER_TYPE_VENDOR && (payload.status == APPROVED || payload.status == REJECTED)) {
    // BG_RECEIVED -> notifies both Dealing Officer and Vendor that Finance has acted on the BG
    emailUserDetailsQuery = getUserDetailsQuery("vendor_and_do", "$1");
    emailUserDetails = await getQuery({
      query: emailUserDetailsQuery,
      values: [payload.purchasing_doc_no],
    });
    const vendorDetail = emailUserDetails.find((u) => u.u_type === "vendor");
    dataObj = { ...dataObj, vendor_name: vendorDetail?.u_name };
    await sendMail(BG_RECEIVED, dataObj, { users: emailUserDetails }, BG_RECEIVED);

    // On acceptance only, also send a confirmation to the Banker
    if (payload.status == APPROVED && payload.bank_email) {
      await sendMail(
        BG_APPROVED_BANK_CONFIRM,
        dataObj,
        { users: [{ u_id: payload.bg_no, u_name: payload.bank_name, u_email: payload.bank_email, u_type: "bank" }] },
        BG_APPROVED_BANK_CONFIRM,
      );
    }
  }
  if (tokenData.dept_id != USER_TYPE_VENDOR && payload.status == ASSIGNED) {
    // BG_ACCEPT_REJECT
    emailUserDetailsQuery = getUserDetailsQuery("bg_assignee", "$1");
    emailUserDetails = await getQuery({
      query: emailUserDetailsQuery,
      values: [payload.assigned_to],
    });
    await sendMail(BG_ASSIGN, dataObj, { users: emailUserDetails }, BG_ASSIGN);
  }
  if (tokenData.dept_id != USER_TYPE_VENDOR && payload.status == RETURN_TO_DO) {
    // BG_ACCEPT_REJECT
    emailUserDetailsQuery = getUserDetailsQuery("do", "$1");
    emailUserDetails = await getQuery({
      query: emailUserDetailsQuery,
      values: [payload.purchasing_doc_no],
    });
    await sendMail(BG_RETURN_TO_DO, dataObj, { users: emailUserDetails }, BG_RETURN_TO_DO);
  }
  if (tokenData.dept_id != USER_TYPE_VENDOR && payload.status == FORWARD_TO_FINANCE) {
    await sendMail(BG_ENTRY_BY_DO, dataObj, { users: [] }, BG_ENTRY_BY_DO);
  }
}

// eslint-disable-next-line no-unused-vars
async function sendBgToSap(payload, id) {
  let status = false;

  try {
    const host = `${process.env.SAP_HOST_URL}` || "http://10.181.1.31:8010";
    const postUrl = `${host}/sap/bc/zobps_sdbg_ent`;
    let modified = await zfi_bgm_1_Payload(payload);
    const postResponse = await makeHttpRequest(postUrl, "POST", modified);

    if (postResponse.statusCode && postResponse.statusCode >= 200 && postResponse.statusCode <= 226) {
      status = true;
    }
    console.log("POST Response from the server:", postResponse);
  } catch (error) {
    console.error("Error making the request:", error);
  } finally {
    return status;
  }
}

// NOTE: BG Extension and Release are now handled end-to-end by bgExtensionController.js
// (table sdbg_extension) rather than here. The old, never-routed draft of that workflow
// that used to live in this file (BGextensionRelease/recommendationBGextensionRelease/
// UpdateBGextensionRelease + sdbg_recommendation) has been removed.

async function GetspecificBG(req, res) {
  const { reference_no, purchasing_doc_no } = req.body;

  if (reference_no && purchasing_doc_no) {
    try {
      let filterdata = `SELECT * FROM sdbg_entry WHERE reference_no = $1 AND purchasing_doc_no = $2`;
      const { rows } = await query({
        query: filterdata,
        values: [reference_no, purchasing_doc_no],
      });

      resSend(res, true, 200, "BG fetched successfully", rows, null);
    } catch (error) {
      console.error("Error executing the query:", error.message);
      return resSend(res, false, 500, Message.SOMTHING_WENT_WRONG, null);
    }
  } else {
    return resSend(res, false, 400, "reference_no and purchasing_doc_no are required", null, null);
  }
}

const getCurrentAssignee = async (req, res) => {
  try {
    if (!req.query.poNo) {
      return resSend(res, true, 200, "Please send PO Number.", null, null);
    }
    const assign = `assigned_to`;
    let result = await getLastAssignee(SDBG, req.query.poNo, assign);

    if (result.length > 0) {
      resSend(res, true, 200, "assigne fetched successfully", result[0], null);
    } else {
      resSend(res, true, 200, "no record found", "not assigend.", null);
    }
  } catch (error) {
    console.error("Error executing the query:", error.message);
    resSend(res, false, 500, Message.SOMTHING_WENT_WRONG, null);
  }
};

async function insertSdbgSave(req, res) {
  let client;
  try {
    client = await poolClient();
    const tokenData = { ...req.tokenData };

    const { ...obj } = req.body;

    if (
      !obj ||
      typeof obj !== "object" ||
      !Object.keys(obj).length ||
      !obj.purchasing_doc_no ||
      obj.purchasing_doc_no == "" ||
      !obj.reference_no ||
      obj.reference_no == "" ||
      !obj.status ||
      !obj.remarks ||
      obj.remarks == ""
    ) {
      return resSend(res, false, 200, "INVALID PAYLOAD", null, null);
    }
    if (obj.status != SAVED) {
      return resSend(res, false, 200, "PLEASE SEND A VALID STATUS", null, null);
    }
    const isDO = await checkIsDealingOfficer(obj.purchasing_doc_no, tokenData.vendor_code);

    if (isDO === 0) {
      return resSend(res, false, 200, "Please Login as dealing officer.", null, null);
    }

    const check = await checkIsApprovedRejected(SDBG, obj.purchasing_doc_no, obj.reference_no, APPROVED, REJECTED);
    if (check > 0) {
      return resSend(res, false, 200, `You can't take any action against this reference no.`, null, null);
    }

    let sdbgEntryQuery = await insertSdbgEntrySave(SDBG_SAVE, obj, tokenData);

    if (sdbgEntryQuery.error) {
      return resSend(res, false, 201, "BG has been saved successfully.", sdbgEntryQuery.error, null);
    }

    resSend(res, true, 200, `The BG has been saved.`, sdbgEntryQuery, null);
  } catch (error) {
    console.error("error", error);
    resSend(res, false, 500, Message.SOMTHING_WENT_WRONG, null);
  } finally {
    if (client) client.release();
  }
}

async function getSdbgSave(req, res) {
  try {
    const tokenData = req.tokenData;

    if (!req.query.reference_no) {
      return resSend(res, false, 200, "Please send valid reference_no!.", null, null);
    }
    if (tokenData.user_type === USER_TYPE_VENDOR) {
      return resSend(res, false, 200, "Please login as valid user!.", null, null);
    }

    const getSSdbgSaveQuery = `SELECT * FROM ${SDBG_SAVE} WHERE reference_no = $1 AND man_no = $2`;
    const resgetSdbgSave = await getQuery({
      query: getSSdbgSaveQuery,
      values: [req.query.reference_no, tokenData.vendor_code],
    });

    resSend(res, true, 200, "BG saved data fetched successfully.", resgetSdbgSave, null);
  } catch (err) {
    console.error("data not fetched", err);
    resSend(res, false, 500, Message.SOMTHING_WENT_WRONG, null, null);
  }
}

async function getingFileNo(req, res) {
  try {
    const tokenData = req.tokenData;

    if (!req.query.reference_no || !req.query.poNo) {
      return resSend(res, false, 200, "Please send valid payload!.", null, null);
    }
    if (tokenData.user_type === USER_TYPE_VENDOR) {
      return resSend(res, false, 200, "Please login as valid user!.", null, null);
    }

    const getFileQuery = `SELECT bg_file_no FROM ${SDBG_ENTRY} WHERE reference_no = $1 AND purchasing_doc_no = $2`;
    const resgetSdbgSave = await getQuery({
      query: getFileQuery,
      values: [req.query.reference_no, req.query.poNo],
    });
    let data;
    let msg;
    if (resgetSdbgSave.length > 0 && resgetSdbgSave[0].bg_file_no != null) {
      data = resgetSdbgSave[0].bg_file_no;
      msg = "BG File fetched successfully.";
    } else {
      data = null;
      msg = "No File found.";
    }
    resSend(res, true, 200, msg, data, null);
  } catch (err) {
    console.error("data not fetched", err);
    resSend(res, false, 500, Message.SOMTHING_WENT_WRONG, null, null);
  }
}

async function update_in_all_obps_sdbgs_table(payload) {
  let client;
  try {
    client = await poolClient();
    if (payload.FILE_NO && payload.REF_NO && payload.PO_NUMBER) {
      const status = payload.RELEASE_DATE && parseInt(payload.RELEASE_DATE) ? "RELEASE" : "EXTENTION";
      let whereCondition;

      const sdbg_entry_payload = {
        extension_date1: sapToGetEpochTime(payload.EXTENTION_DATE1),
        extension_date2: sapToGetEpochTime(payload.EXTENTION_DATE2),
        extension_date3: sapToGetEpochTime(payload.EXTENTION_DATE3),
        extension_date4: sapToGetEpochTime(payload.EXTENTION_DATE4),
        extension_date5: sapToGetEpochTime(payload.EXTENTION_DATE5),
        extension_date6: sapToGetEpochTime(payload.EXTENTION_DATE6),
        release_date: sapToGetEpochTime(payload.RELEASE_DATE),
        status: status,
      };
      whereCondition = {
        purchasing_doc_no: payload.PO_NUMBER,
        reference_no: payload.REF_NO,
        bg_file_no: payload.FILE_NO,
      };
      const sdbg_entry_query = generateQuery(UPDATE, SDBG_ENTRY, sdbg_entry_payload, whereCondition);
      await poolQuery({
        client,
        query: sdbg_entry_query["q"],
        values: sdbg_entry_query["val"],
      });
      const sdbg_recommendation_payload = {
        status: status,
      };
      const SdbgRecommendationQuery = generateQuery(UPDATE, SDBG_RECOMMENDATION, sdbg_recommendation_payload, whereCondition);
      await poolQuery({
        client,
        query: SdbgRecommendationQuery["q"],
        values: SdbgRecommendationQuery["val"],
      });
      const Q = `SELECT file_name,file_path,action_type,vendor_code FROM ${SDBG} WHERE purchasing_doc_no = $1 AND reference_no = $2`;
      let sdbgResult = await poolQuery({
        client,
        query: Q,
        values: [payload.PO_NUMBER, payload.REF_NO],
      });
      let sdbgDataResult = sdbgResult[0];
      const insertPayloadForSdbg = {
        reference_no: payload.REF_NO,
        purchasing_doc_no: payload.PO_NUMBER,
        ...sdbgDataResult,
        remarks: `This BG is ${status} from SAP.`,
        status: status,
        created_at: getEpochTime(),
        created_by_name: "SAP Finaance.",
        created_by_id: `600200`,
        updated_by: "HSL",
      };

      let insertsdbg_q = generateQuery(INSERT, SDBG, insertPayloadForSdbg);
      await poolQuery({
        client,
        query: insertsdbg_q["q"],
        values: insertsdbg_q["val"],
      });
    }
  } catch (err) {
    console.error("data not fetched", err);
  } finally {
    if (client) client.release();
  }
}

async function checkIsDEO(req, res) {
  try {
    const tokenData = req.tokenData;

    if (!req.query.manNo) {
      return resSend(res, false, 200, "Please send valid Man No!.", null, null);
    }
    if (tokenData.user_type === USER_TYPE_VENDOR) {
      return resSend(res, false, 200, "Please login as valid user!.", null, null);
    }

    const checkDEO = `SELECT COUNT(*) AS check FROM ${EMPLAYEE_MASTER_PA0002} WHERE persg = $1 AND pernr = $2`;
    const resCheckDEO = await getQuery({
      query: checkDEO,
      values: ["DE", req.query.manNo],
    });
    let resData;

    if (resCheckDEO && resCheckDEO[0].check === "0") {
      resData = false;
    } else {
      resData = true;
    }

    resSend(res, true, 200, "BG saved data fetched successfully.", resData, null);
  } catch (err) {
    console.error("data not fetched", err);
    resSend(res, false, 500, Message.SOMTHING_WENT_WRONG, null, null);
  }
}

module.exports = {
  submitSDBG,
  getSdbgEntry,
  assigneeList,
  sdbgSubmitByDealingOfficer,
  sdbgUpdateByFinance,
  checkIsDealingOfficer,
  getSDBGData,
  GetspecificBG,
  getCurrentAssignee,
  insertSdbgSave,
  getSdbgSave,
  getingFileNo,
  update_in_all_obps_sdbgs_table,
  checkIsDEO,
};

