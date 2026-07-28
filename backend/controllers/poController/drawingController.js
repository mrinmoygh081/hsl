const { drawingPayload, setActualSubmissionDate, create_reference_no } = require("../../services/po.services");

const { resSend } = require("../../lib/resSend");
const { getQuery, poolClient, poolQuery } = require("../../config/pgDbConfig");
const { generateQuery, getEpochTime } = require("../../lib/utils");
const { INSERT, ASSIGNER, USER_TYPE_VENDOR, USER_TYPE_HSL_DRAWING, STAFF, MID_DRAWING } = require("../../lib/constant");
const { DRAWING } = require("../../lib/tableName");
const { SUBMITTED, ACKNOWLEDGED, APPROVED, REJECTED, ASSIGNED } = require("../../lib/status");
const Message = require("../../utils/messages");

const { DRAWING_UPLOAD_TO_CDO, DRAWING_ACKNOWLEDGE_RECEIPT, DRAWING_ASSIGN, DRAWING_REJECT } = require("../../lib/event");
const { getUserDetailsQuery } = require("../../utils/mailFunc");
const { sendMail } = require("../../services/mail.services");
const { getLastAssignee, getAssigneeList, checkIsAssigned, getFristRow, checkIsApprovedRejected, checkPoType } = require("../../services/lastassignee.servces");

const submitDrawing = async (req, res) => {
  let client;
  try {
    client = await poolClient();
    const tokenData = { ...req.tokenData };

    // Handle Image Upload
    let fileData = {};
    if (req.file) {
      fileData = {
        fileName: req.file.filename,
        filePath: req.file.path,
        // fileType: req.file.mimetype,
        // fileSize: req.file.size,
      };
    }

    const payload = { ...req.body, ...fileData, created_at: getEpochTime() };

    if (!payload.purchasing_doc_no || !payload.status) {
      return resSend(res, false, 400, "Please send valid payload", null, null);
    }

    if (tokenData.user_type != USER_TYPE_VENDOR && tokenData.department_id != USER_TYPE_HSL_DRAWING) {
      return resSend(res, true, 200, "please login as Valid user!", null, null);
    }

    const poType = await checkPoType(payload.purchasing_doc_no);

    const star = `vendor_code,actiontype`;
    const action_type_with_vendor_code = await getFristRow(DRAWING, star, payload.purchasing_doc_no); // await get_action_type_with_vendor_code(payload.purchasing_doc_no);

    if (poType === "MATERIAL" && tokenData.user_type != USER_TYPE_VENDOR) {
      const check = await checkIsApprovedRejected(DRAWING, payload.purchasing_doc_no, payload.reference_no, APPROVED, REJECTED);
      if (check > 0) {
        return resSend(res, false, 200, `You can't take any action against this reference no.`, null, null);
      }
    }

    if (poType === "MATERIAL" && tokenData.user_type != USER_TYPE_VENDOR && tokenData.internal_role_id == ASSIGNER && payload.status == ASSIGNED) {
      if (!payload.assign_to || payload.assign_to == "") {
        return resSend(res, false, 200, "please send assign_to.", payload, null);
      }
      payload.vendor_code = action_type_with_vendor_code.vendor_code;
      payload.actiontype = action_type_with_vendor_code.actiontype;
      payload.updated_by = `HSL`;
      payload.last_assigned = 1;
      payload.created_by_id = tokenData.vendor_code;
      payload.assign_from = tokenData.vendor_code;
      payload.reference_no = `DRAWING ${ASSIGNED}`;

      let insertObj;
      insertObj = drawingPayload(payload, payload.status);

      const update_assign_to = `UPDATE ${DRAWING} SET last_assigned = 0 WHERE purchasing_doc_no = $1`;
      await poolQuery({
        client,
        query: update_assign_to,
        values: [payload.purchasing_doc_no],
      });

      const { q, val } = generateQuery(INSERT, DRAWING, insertObj);
      await poolQuery({ client, query: q, values: val });

      if (payload.assign_to && payload.status == ASSIGNED) {
        handelMail(tokenData, payload);
      }
      return resSend(res, true, 200, `The DRAWING is ASSIGNED successfully.`, null, null);
    }

    if (poType === "MATERIAL" && tokenData.user_type != USER_TYPE_VENDOR && tokenData.internal_role_id == STAFF) {
      if (payload.status != APPROVED && payload.status != REJECTED) {
        return resSend(res, true, 200, "Staff can only APPROVED or rejected.", null, null);
      }
      if (!payload.reference_no) {
        return resSend(res, true, 200, "Please send valid reference_no.", null, null);
      }
      const assign = `assign_to`;
      let checkAssig = await checkIsAssigned(DRAWING, payload.purchasing_doc_no, tokenData.vendor_code, assign);

      if (checkAssig != 1) {
        return resSend(res, false, 200, "This PO is not assigned to you!", null, null);
      }

      payload.vendor_code = action_type_with_vendor_code.vendor_code;
      payload.actiontype = action_type_with_vendor_code.actiontype;
      payload.updated_by = `HSL`;
      payload.last_assigned = 0;
      payload.created_by_id = tokenData.vendor_code;

      if (payload.file) {
        delete payload.file;
      }
      if (payload.mailSendTo) {
        delete payload.mailSendTo;
      }

      let insertObj;
      insertObj = drawingPayload(payload, payload.status);

      const { q, val } = generateQuery(INSERT, DRAWING, insertObj);
      const response = await poolQuery({ client, query: q, values: val });
      if (response) {
        if (payload.status === APPROVED) {
          // CDO APPROVED DRAWING . .

          // sendMailToVendor(payload)
          // handelMail(payload, tokenData)

          await setActualSubmissionDate(payload, MID_DRAWING, tokenData, SUBMITTED);
        }

        handelMail(tokenData, payload);
        return resSend(res, true, 200, `Drawing is ${payload.status}`, response, null);
      }
    }

    if (poType === "SERVICE" && tokenData.user_type == USER_TYPE_VENDOR) {
      return resSend(res, false, 200, "This is service PO.Vendor can`t do any activity.", null, null);
    }

    if (poType === "MATERIAL" && tokenData.department_id == USER_TYPE_HSL_DRAWING && (!payload.reference_no || payload.reference_no == "")) {
      return resSend(res, false, 200, "Please send valid reference_no.", null, null);
    }

    if (tokenData.user_type === USER_TYPE_VENDOR) {
      if (payload.status == APPROVED || payload.status == REJECTED) {
        return resSend(res, true, 200, `vendor can not ${payload.status}!`, null, null);
      }
      const Query = `SELECT COUNT(EBELN) AS po_count from ekko WHERE EBELN = $1 AND LIFNR = $2`;

      const poArr = await poolQuery({
        client,
        query: Query,
        values: [payload.purchasing_doc_no, tokenData.vendor_code],
      });
      if (poArr[0].po_count == 0) {
        return resSend(res, false, 200, "you are not authorised.", null, null);
      }
    }
    payload.vendor_code = tokenData.vendor_code;

    payload.updated_by = tokenData.user_type === USER_TYPE_VENDOR ? "VENDOR" : "HSL";

    payload.created_by_id = tokenData.vendor_code;
    if (!payload.reference_no) {
      payload.reference_no = create_reference_no("DW", tokenData.vendor_code);
    }

    let insertObj;

    insertObj = drawingPayload(payload, payload.status);

    const { q, val } = generateQuery(INSERT, DRAWING, insertObj);
    const response = await poolQuery({ client, query: q, values: val });

    if (payload.status === APPROVED) {
      // CDO APPROVED DRAWING . .

      // sendMailToVendor(payload);

      await setActualSubmissionDate(payload, MID_DRAWING, tokenData, SUBMITTED);
    }

    handelMail(tokenData, payload);
    // if (payload.status === SUBMITTED && tokenData.user_type === USER_TYPE_VENDOR) {
    //   sendMailToCDOandDO(payload)
    // }

    if (response) {
      resSend(res, true, 200, `Drawing ${payload.status}`, response[0], null);
    } else {
      resSend(res, false, 400, "No data inserted", null, null);
    }
  } catch (error) {
    console.error("Drawing submission api", error);

    return resSend(res, false, 500, Message.SOMTHING_WENT_WRONG, null);
  } finally {
    client.release();
  }
};

const list = async (req, res) => {
  try {
    if (!req.query.poNo) {
      return resSend(res, false, 400, "Please send po number", null, null);
    }

    const result = await getQuery({ query: `SELECT * FROM  ${DRAWING} WHERE purchasing_doc_no = $1`, values: [req.query.poNo] });
    resSend(res, true, 200, Message.DATA_FETCH_SUCCESSFULL, result, null);
  } catch (err) {
    console.error("data not fetched", err.message);
    resSend(res, false, 500, Message.SOMTHING_WENT_WRONG, null, null);
  }
};

const assigneeList = async (req, res) => {
  try {
    // if (tokenData.department_id != USER_TYPE_HSL_DRAWING || tokenData.internal_role_id != ASSIGNER) {
    //   return resSend(res, true, 200, "Please Login as Drawing Assigner.", null, null);
    // }
    const dept_id = USER_TYPE_HSL_DRAWING;
    const internal_role_id = 2;
    let result = await getAssigneeList(dept_id, internal_role_id);
    resSend(res, true, 200, "DRAWING assigneeList fetch successfully!", result, null);
  } catch (error) {
    console.error("Error executing the query:", error);
    resSend(res, false, 500, Message.SOMTHING_WENT_WRONG, null, null);
  }
};

const getCurrentAssignee = async (req, res) => {
  try {
    if (!req.query.poNo) {
      return resSend(res, true, 200, "Please send PO Number.", null, null);
    }
    const assign = `assign_to`;
    let result = await getLastAssignee(DRAWING, req.query.poNo, assign);

    if (result.length > 0) {
      resSend(res, true, 200, "assigne fetched successfully", result[0], null);
    } else {
      resSend(res, true, 200, "no record found", "not assigend.", null);
    }
  } catch (error) {
    console.error("Error executing the query:", error.message);
    resSend(res, false, 500, Message.SOMTHING_WENT_WRONG, null, null);
  }
};

async function handelMail(tokenData, payload) {
  try {
    let emailUserDetailsQuery;
    let emailUserDetails;
    let dataObj = payload;

    if (payload.status === SUBMITTED && tokenData.user_type === USER_TYPE_VENDOR) {
      emailUserDetailsQuery = getUserDetailsQuery("cdo_and_do", "$1");
      emailUserDetails = await getQuery({
        query: emailUserDetailsQuery,
        values: [dataObj.purchasing_doc_no],
      });
      dataObj = { ...dataObj };
      await sendMail(DRAWING_UPLOAD_TO_CDO, dataObj, { users: emailUserDetails }, DRAWING_UPLOAD_TO_CDO);
    }

    if (payload.status === APPROVED) {
      emailUserDetailsQuery = getUserDetailsQuery("vendor_by_po", "$1");
      emailUserDetails = await getQuery({
        query: emailUserDetailsQuery,
        values: [dataObj.purchasing_doc_no],
      });
      dataObj = { ...dataObj };
      await sendMail(DRAWING_ACKNOWLEDGE_RECEIPT, dataObj, { users: emailUserDetails }, DRAWING_ACKNOWLEDGE_RECEIPT);
    }
    if (payload.status === ACKNOWLEDGED) {
      emailUserDetailsQuery = getUserDetailsQuery("vendor_by_po", "$1");
      emailUserDetails = await getQuery({
        query: emailUserDetailsQuery,
        values: [dataObj.purchasing_doc_no],
      });
      dataObj = { ...dataObj };
      await sendMail(DRAWING_ACKNOWLEDGE_RECEIPT, dataObj, { users: emailUserDetails }, DRAWING_ACKNOWLEDGE_RECEIPT);
    }
    if (payload.status === REJECTED) {
      emailUserDetailsQuery = getUserDetailsQuery("vendor_by_po", "$1");
      emailUserDetails = await getQuery({
        query: emailUserDetailsQuery,
        values: [dataObj.purchasing_doc_no],
      });
      dataObj = { ...dataObj };
      await sendMail(DRAWING_REJECT, dataObj, { users: emailUserDetails }, DRAWING_REJECT);
    }
    if (payload.status === ASSIGNED) {
      emailUserDetailsQuery = getUserDetailsQuery("drawing_assingee", "$1");
      emailUserDetails = await getQuery({
        query: emailUserDetailsQuery,
        values: [dataObj.assign_to],
      });
      dataObj = { ...dataObj };
      await sendMail(DRAWING_ASSIGN, dataObj, { users: emailUserDetails }, DRAWING_ASSIGN);
    }
  } catch (error) {
    console.error("handelMail drawing", error.toString(), error.stack);
  }
}

const submitDrawingFn = async (req, res) => {
  let client;
  try {
    const tokenData = { ...req.tokenData };

    // Handle Image Upload
    let fileData = {};
    if (req.file) {
      fileData = {
        fileName: req.file.filename,
        filePath: req.file.path,
      };
    }

    const payload = { ...req.body, ...fileData, created_at: getEpochTime() };

    if (!payload.purchasing_doc_no || !payload.assign_to) {
      return resSend(res, false, 400, Message.MANDATORY_INPUTS_REQUIRED, null, null);
    }

    if (tokenData.user_type != USER_TYPE_VENDOR && tokenData.department_id != USER_TYPE_HSL_DRAWING) {
      return resSend(res, true, 200, Message.LOGIN_AS_VALID_USER, null, null);
    }

    const poType = await checkPoType(payload.purchasing_doc_no);

    if (poType === "SERVICE" && tokenData.user_type == USER_TYPE_VENDOR) {
      return resSend(res, false, 200, "This is service PO. Vendor can`t do submit drawing", null, null);
    }

    if (poType === "MATERIAL" && tokenData.department_id == USER_TYPE_HSL_DRAWING) {
      return resSend(res, false, 200, "This is material PO. HSL officer can`t do submit drawing.", null, null);
    }

    payload.vendor_code = tokenData.vendor_code;
    payload.assign_from = tokenData.vendor_code;
    payload.updated_by = tokenData.user_type === USER_TYPE_VENDOR ? "VENDOR" : "HSL";
    payload.created_by_id = tokenData.vendor_code;
    payload.reference_no = await create_reference_no("DW", tokenData.vendor_code);
    payload.action_by = tokenData.vendor_code;
    payload.action_on = payload.assign_to;

    const insertObj = drawingPayload(payload, SUBMITTED);
    const { q, val } = generateQuery(INSERT, DRAWING, insertObj);
    client = await poolClient();
    await poolQuery({ client, query: q, values: val });

    handelMail(tokenData, payload);

    resSend(res, true, 200, `Drawing ${payload.status}`, {}, null);
  } catch (error) {
    console.error("Drawing submission api", error);
    resSend(res, false, 500, Message.SOMTHING_WENT_WRONG, null, null);
  } finally {
    if (client) client.release();
  }
};

const updateDrawingFn = async (req, res) => {
  let client;
  try {
    const tokenData = req.tokenData;
    const payload = req.body;

    const allowStatus = [REJECTED, ACKNOWLEDGED];
    if (!payload.purchasing_doc_no || !payload.status || !payload.reference_no || !allowStatus.includes(payload.status)) {
      return resSend(res, false, 400, Message.PLEASE_SEND_VALID_PAYLOAD, null, null);
    }
    client = await poolClient();
    await client.query("BEGIN");
    const lastDrawingData = await poolQuery({
      client,
      query: "SELECT * FROM drawing WHERE reference_no = $1 AND status = $2 ORDER BY created_at ASC",
      values: [payload.reference_no, SUBMITTED],
    });

    if (!lastDrawingData.length) {
      return resSend(res, false, 200, Message.NO_DATA_FOUND, null, null);
    }

    const check = await checkIsApprovedRejected(DRAWING, payload.purchasing_doc_no, payload.reference_no, ACKNOWLEDGED, REJECTED);
    if (parseInt(check) && lastDrawingData[0]?.assign_from != tokenData.vendor_code) {
      return resSend(res, false, 200, Message.YOU_CANT_TAKE_ACTION_AGAINST_REF_NO, null, null);
    }

    const updatedPayload = {
      ...lastDrawingData[0],
      last_assigned: 1,
      updated_by: `HSL`,
      created_by_id: tokenData.vendor_code,
      assign_from: tokenData.vendor_code,
      created_at: getEpochTime(),
      action_by: tokenData.vendor_code,
      action_on: "--",
    };

    let insertObj = drawingPayload(updatedPayload, payload.status);
    const { q, val } = generateQuery(INSERT, DRAWING, insertObj);
    const response = await poolQuery({ client, query: q, values: val });

    if (payload.status === ACKNOWLEDGED) {
      payload.created_at = getEpochTime();
      await setActualSubmissionDate(payload, MID_DRAWING, tokenData, SUBMITTED);
    }

    await client.query("COMMIT");

    handelMail(tokenData, payload);
    resSend(res, true, 200, `Drawing is ${payload.status}`, response, null);
  } catch (error) {
    console.error("Drawing submission api", error);
    if (client) await client.query("ROLLBACK");
    resSend(res, false, 500, Message.SOMTHING_WENT_WRONG, null, null);
  } finally {
    if (client) client.release();
  }
};

module.exports = { submitDrawing, list, assigneeList, getCurrentAssignee, updateDrawingFn, submitDrawingFn };
