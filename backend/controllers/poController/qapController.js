const { qapPayload, setActualSubmissionDate, create_reference_no } = require("../../services/po.services");
const { resSend } = require("../../lib/resSend");
const { getQuery, poolClient, poolQuery } = require("../../config/pgDbConfig");
const { generateQuery, getEpochTime } = require("../../lib/utils");
const {
  createQAPSubmissionNotification
} = require("../../services/notification.services");
const {
  INSERT,
  USER_TYPE_HSL_QAP,
  QAP_STAFF,
  USER_TYPE_VENDOR,
  ASSIGNER,
  A_QAP_DATE,
  MID_QAP,
  USER_TYPE_HSL_DRAWING,
} = require("../../lib/constant");
const { QAP_SUBMISSION, QAP_SAVE } = require("../../lib/tableName");
const {
  APPROVED,
  RE_SUBMITTED,
  ACCEPTED,
  REJECTED,
  SAVED,
  ASSIGNED,
  UPDATED,
  SUBMITTED,
} = require("../../lib/status");
const {
  QAP_UPLOAD_BY_VENDOR,
  QAP_ASSIGNMENT,
  QAP_APPROVE_REJECT,
  QAP_ACCEPT_UPDATE,
} = require("../../lib/event");
const { getUserDetailsQuery } = require("../../utils/mailFunc");
const { sendMail } = require("../../services/mail.services");
const Messages = require("../../utils/messages");

// Departments allowed to keep a QAP draft (same ids as the frontend: 2 = Design, 3 = QAP)
const QAP_DRAFT_DEPARTMENTS = new Set([USER_TYPE_HSL_DRAWING, 3]);
const canUseQapDraft = (tokenData) =>
  tokenData?.user_type !== USER_TYPE_VENDOR && QAP_DRAFT_DEPARTMENTS.has(Number(tokenData?.department_id));

// Column names of qap_save (lower case), read once from the database.
let qapSaveColumns;
const getQapSaveColumns = async () => {
  if (qapSaveColumns) return qapSaveColumns;
  const cols = await getQuery({
    query: `SELECT column_name FROM information_schema.columns WHERE table_name = $1`,
    values: [QAP_SAVE],
  });
  if (cols?.length) qapSaveColumns = new Set(cols.map((c) => c.column_name.toLowerCase()));
  return qapSaveColumns || new Set();
};

// add new post
const submitQAP = async (req, res) => {
  let client;

  try {
    client = await poolClient();
    const tokenData = { ...req.tokenData };
    let payload = { ...req.body, created_at: getEpochTime() };

    // FILES

    let fileName = payload.file?.fileName || "";
    let filePath = payload.file?.filePath || "";

    if (
      tokenData.user_type == USER_TYPE_VENDOR &&
      payload.status === SUBMITTED &&
      !payload.assign_to &&
      (!filePath || !fileName)
    ) {
      return resSend(
        res,
        false,
        200,
        Messages.FILE_REQUIRED_MSG,
        Messages.MANDATORY_INPUTS_REQUIRED,
        null,
      );
    }

    let supporting_doc;
    supporting_doc = payload.supporting_doc
      ? JSON.stringify(payload.supporting_doc)
      : "";
    payload = {
      ...payload,
      fileName,
      filePath,
      supporting_doc: supporting_doc,
    };

    payload.updated_by =
      tokenData.user_type === USER_TYPE_VENDOR ? "VENDOR" : "HSL";
    payload.action_by_id = tokenData.vendor_code;
    const activity_type = payload.status;
    const purchasing_doc_no = payload.purchasing_doc_no;
    const verifyStatusForStaff = new Set([
      REJECTED,
      ACCEPTED,
      SAVED,
      APPROVED,
      UPDATED,
    ]);

    if (
      !payload.purchasing_doc_no ||
      !payload.remarks ||
      payload.remarks.trim() === "" ||
      !payload.status ||
      payload.status.trim() === ""
    ) {
      return resSend(res, false, 200, "Remarks is mandotory!", null, null);
    }

    let message = ``;

    // Check if already accepted/rejected/approved and if HSL

    if (
      tokenData?.user_type !== USER_TYPE_VENDOR &&
      payload.status !== "ASSIGNED"
    ) {
      if (!payload.reference_no || payload.reference_no == "") {
        return resSend(
          res,
          false,
          200,
          "reference_no is mandotory!",
          null,
          null,
        );
      }
      let count_val = await checkIsApprovedOrRejected(client, purchasing_doc_no, payload.reference_no);
      if (count_val > 0) {
        return resSend(
          res,
          false,
          200,
          `You can't take any action against this reference no.`,
          null,
          null,
        );
      }
    }
    ///////// CHECK DEPERTMENT /////////////////
    if (
      tokenData.department_id &&
      tokenData.department_id === USER_TYPE_HSL_DRAWING
    ) {
      ///////// CHECK ROLE IS ASSIGNER /////////////////
      if (activity_type === ASSIGNED) {
        if (tokenData.internal_role_id === ASSIGNER) {
          const checkAssigneQuery = `SELECT COUNT(is_assign) AS countval FROM qap_submission WHERE purchasing_doc_no = $1 AND is_assign = $2`;
          const resAssigneQry = await poolQuery({
            client,
            query: checkAssigneQuery,
            values: [purchasing_doc_no, 1],
          });
          if (resAssigneQry[0].countval > 0) {
            const removeOldAssignee = `UPDATE qap_submission SET is_assign = 0 WHERE purchasing_doc_no = $1 AND is_assign = $2`;
            await poolQuery({
              client,
              query: removeOldAssignee,
              values: [purchasing_doc_no, 1],
            });
          }
          payload.is_assign = 1;
          payload.reference_no = "QAP ASSIGNED";
          payload.action_type = "QAP Assigned";
        } else {
          message = `You don't have permission!`;
          return resSend(res, true, 200, message, null, null);
        }
      }
      ///////// CHECK ROLE IS ASSIGNER /////////////////
      ///////// CHECK ROLE IS STAFF /////////////////
      if (verifyStatusForStaff.has(activity_type)) {
        if (tokenData.internal_role_id === QAP_STAFF) {
          const checkAssigneStaffQuery = `SELECT COUNT(status) AS countval FROM qap_submission WHERE purchasing_doc_no = $1 AND status = $2  AND assigned_to = $3`;
          const resAssigneStaffQry = await poolQuery({
            client,
            query: checkAssigneStaffQuery,
            values: [purchasing_doc_no, ASSIGNED, tokenData.vendor_code],
          });
          if (resAssigneStaffQry[0].countval === 0) {
            message = `You don't have permission.`;
            return resSend(res, true, 200, message, null, null);
          }
        }
      }
    }
    if (tokenData.user_type === USER_TYPE_VENDOR) {
      if (payload.reference_no || payload.reference_no != "") {
        let count_val = await checkIsApprovedOrRejected(client, purchasing_doc_no, payload.reference_no, true);
        if (count_val > 0) {
          return resSend(
            res,
            false,
            200,
            `You can't take any action against this reference no.`,
            null,
            null,
          );
        }
      }

      const reference_no =
        payload.reference_no && payload.reference_no != ""
          ? payload.reference_no
          : await create_reference_no("QAP", tokenData.vendor_code);

      payload = { ...payload, reference_no };
    }

    //////// SET STATUS AND CREATE QAP PAYLOAD /////////
    let insertObj;
    // REJECTED, ACCEPTED, SAVED, APPROVED, UPDATED

    switch (activity_type) {
      case SUBMITTED:
        insertObj = qapPayload(payload, SUBMITTED);
        break;
      case ASSIGNED:
        insertObj = qapPayload(payload, ASSIGNED);
        break;
      case REJECTED:
        insertObj = qapPayload(payload, REJECTED);
        break;
      case RE_SUBMITTED:
        insertObj = qapPayload(payload, RE_SUBMITTED);
        break;
      case ACCEPTED:
        insertObj = qapPayload(payload, ACCEPTED);
        break;
      case SAVED:
        insertObj = qapPayload(payload, SAVED);
        break;
      case APPROVED:
        insertObj = qapPayload(payload, APPROVED);
        break;
      case UPDATED:
        insertObj = qapPayload(payload, UPDATED);
        break;
      default:
        console.log("other1");
    }
    //////// SET STATUS AND CREATE QAP PAYLOAD /////////
    if (
      tokenData.user_type === USER_TYPE_VENDOR &&
      activity_type != SUBMITTED &&
      activity_type != RE_SUBMITTED
    ) {
      return resSend(
        res,
        false,
        200,
        `Vendor can only send status for ${SUBMITTED}/${RE_SUBMITTED}`,
        null,
        null,
      );
    }

    const { q, val } = generateQuery(INSERT, QAP_SUBMISSION, insertObj);

    const response = await poolQuery({ client, query: q, values: val });
    await checkActualSub(payload.purchasing_doc_no, client);
    if (insertObj.status === APPROVED) {
      await setActualSubmissionDate(insertObj, MID_QAP, tokenData, SUBMITTED);
    }

    if (response) {
      // QAP notification for the currently assigned officer
      if (
        tokenData.user_type === USER_TYPE_VENDOR &&
        [SUBMITTED, RE_SUBMITTED].includes(activity_type)
      ) {
        try {
          const notification =
            await createQAPSubmissionNotification(client, payload);

          if (notification) {
            console.log(
              "QAP notification created:",
              notification.id
            );
          }
        } catch (notificationError) {
          console.error(
            "QAP notification creation failed:",
            notificationError
          );
        }
      }
      handelMail(tokenData, payload, QAP_UPLOAD_BY_VENDOR);
      resSend(res, true, 200, "Inserted successfully", response, null);
    } else {
      resSend(res, false, 400, "No data inserted", [], null);
    }
  } catch (error) {
    console.error("QAP Submissio api", error);

    return resSend(res, false, 500, Messages.SOMTHING_WENT_WRONG, null, null);
  } finally {
    if (client) client.release();
  }
};

// 1 = no action allowed on this reference.
// APPROVED closes the reference for everyone. After REJECTED the vendor may upload again,
// while the officer has to wait for that new upload.
const checkIsApprovedOrRejected = async (client, purchasing_doc_no, reference_no, forVendor = false) => {
  const rows = await poolQuery({
    client,
    query: `SELECT status FROM qap_submission WHERE purchasing_doc_no = $1 AND reference_no = $2 ORDER BY id DESC`,
    values: [purchasing_doc_no, reference_no],
  });
  if (rows.some((r) => r.status === APPROVED)) return 1;
  if (!forVendor && rows[0]?.status === REJECTED) return 1;
  return 0;
};

const list = async (req, res) => {
  try {
    const pre = `SELECT * FROM ${QAP_SUBMISSION} WHERE purchasing_doc_no = $1 ORDER BY id ASC`;

    const result = await getQuery({ query: pre, values: [req.query.poNo] });
    if (!result.length) {
      return resSend(res, true, 200, "No QAP found.", null, null);
    }
    return resSend(res, true, 200, "data fetched successfully.", result, null);
  } catch (err) {
    console.error("data not fetched", err);
    resSend(res, false, 500, Messages.SOMTHING_WENT_WRONG, null, null);
  }
};

const internalDepartmentList = async (req, res) => {
  try {
    const result = await getQuery({ query: `SELECT id, name FROM sub_dept`, values: [] });
    resSend(res, true, 200, "data fetched successfully.", result, null);
  } catch (err) {
    console.error("data not fetched", err);
    resSend(res, false, 500, Messages.SOMTHING_WENT_WRONG, null, null);
  }
};

const internalDepartmentEmpList = async (req, res) => {
  const sub_dept_id = req.query.sub_dept_id;
  try {
    const q = `SELECT t1.emp_id, t2.cname as empName, t3.name as sub_dept_name
	FROM emp_department_list 
    	AS t1 
      LEFT JOIN 
      	pa0002 
       AS t2 
       ON 
       	t1.emp_id = t2.PERNR :: character varying

        LEFT JOIN 
      	sub_dept 
       AS t3 
       ON 
       	t1.sub_dept_id = t3.id 
      
        WHERE 
        t1.sub_dept_id = $1`;

    const response = await getQuery({ query: q, values: [sub_dept_id] });
    resSend(res, true, 200, "oded!", response, null);
  } catch (err) {
    console.error("data not fetched", err);
  }
};

// eslint-disable-next-line no-unused-vars
async function handelMail(tokenData, payload, event) {
  try {
    let emailUserDetailsQuery;
    let emailUserDetails;
    let dataObj = payload;

    if (tokenData.user_type == USER_TYPE_VENDOR && payload.status == SUBMITTED) {
      // QA NODAL OFFICERS
      emailUserDetailsQuery = getUserDetailsQuery("nodal_officers");
      emailUserDetails = await getQuery({
        query: emailUserDetailsQuery,
        values: [],
      });
      await sendMail(QAP_UPLOAD_BY_VENDOR, dataObj, { users: emailUserDetails }, QAP_UPLOAD_BY_VENDOR);
    }

    if (tokenData.user_type != USER_TYPE_VENDOR && tokenData.internal_role_id == ASSIGNER && payload.status == ASSIGNED) {
      // QA NODAL OFFICERS
      emailUserDetailsQuery = getUserDetailsQuery("qa_officers");
      emailUserDetails = await getQuery({
        query: emailUserDetailsQuery,
        values: [],
      });
      await sendMail(QAP_ASSIGNMENT, dataObj, { users: emailUserDetails }, QAP_ASSIGNMENT);
    }
    if (tokenData.internal_role_id == ASSIGNER && payload.status == APPROVED) {
      // QA NODAL OFFICERS
      emailUserDetailsQuery = getUserDetailsQuery("vendor_by_po", "$1");
      emailUserDetails = await getQuery({
        query: emailUserDetailsQuery,
        values: [payload.purchasing_doc_no],
      });
      dataObj = { ...dataObj, vendor_name: emailUserDetails[0].u_name };
      await sendMail(QAP_APPROVE_REJECT, dataObj, { users: emailUserDetails }, QAP_APPROVE_REJECT);
    }

    if (tokenData.internal_role_id == ASSIGNER && payload.status == REJECTED) {
      // QA NODAL OFFICERS
      emailUserDetailsQuery = getUserDetailsQuery("vendor_by_po", "$1");
      emailUserDetails = await getQuery({
        query: emailUserDetailsQuery,
        values: [payload.purchasing_doc_no],
      });
      dataObj = { ...dataObj, vendor_name: emailUserDetails[0].u_name };
      await sendMail(QAP_APPROVE_REJECT, dataObj, { users: emailUserDetails }, QAP_APPROVE_REJECT);
    }
    if (tokenData.internal_role_id == ASSIGNER && (payload.status == ACCEPTED || payload.status == UPDATED)) {
      // QA NODAL OFFICERS
      emailUserDetailsQuery = getUserDetailsQuery("vendor_by_po", "$1");
      emailUserDetails = await getQuery({
        query: emailUserDetailsQuery,
        values: [payload.purchasing_doc_no],
      });
      dataObj = { ...dataObj, vendor_name: emailUserDetails[0].u_name };
      await sendMail(QAP_ACCEPT_UPDATE, dataObj, { users: emailUserDetails }, QAP_ACCEPT_UPDATE);
    }

  } catch (error) {
    console.error("handelMail qap", error.toString(), error.stack);
  }
}

async function insertQapSave(req, res) {
  try {
    const tokenData = { ...req.tokenData };
    const { purchasing_doc_no, reference_no, remarks, action_type, file, supporting_doc } = req.body;

    if (!reference_no) {
      return resSend(res, false, 200, "Please send valid reference_no!.", null, null);
    }
    if (!canUseQapDraft(tokenData)) {
      return resSend(res, false, 200, "Please login as valid user!.", null, null);
    }

    const columns = await getQapSaveColumns();
    const payload = {
      purchasing_doc_no,
      reference_no,
      remarks,
      action_type,
      supporting_doc: supporting_doc || null,
      created_at: getEpochTime(),
      created_by_id: tokenData.vendor_code,
      man_no: tokenData.vendor_code,
    };

    // The uploaded QAP file is stored in whichever way qap_save was designed.
    if (file) {
      if (columns.has("qapfile")) {
        payload.qapfile = file;
      } else if (columns.has("file_name") && columns.has("file_path")) {
        const parsed = JSON.parse(file);
        payload.file_name = parsed.fileName || null;
        payload.file_path = parsed.filePath || null;
      } else {
        return resSend(
          res,
          false,
          500,
          `Failed to save QAP: qap_save has no column for the QAP file. Existing columns: ${[...columns].join(", ")}`,
          null,
          null,
        );
      }
    }

    const { q, val } = generateQuery(INSERT, QAP_SAVE, payload);
    const response = await getQuery({ query: q, values: val });

    return resSend(res, true, 200, "Data inserted.", response, null);
  } catch (error) {
    console.error("insertQapSave error", error);
    return resSend(res, false, 500, `Failed to save QAP: ${error.message}`, null, null);
  }
}

async function getQapSave(req, res) {
  try {
    const tokenData = req.tokenData;

    if (!req.query.reference_no || !canUseQapDraft(tokenData)) {
      return resSend(res, true, 200, "Please send valid payload!.", null, null);
    }

    const getQapSaveQuery = `SELECT * FROM ${QAP_SAVE} WHERE reference_no = $1 AND man_no = $2`;
    const resgetQapSave = await getQuery({
      query: getQapSaveQuery,
      values: [req.query.reference_no, tokenData.vendor_code],
    });

    if (!resgetQapSave.length) {
      return resSend(res, true, 200, "No QAP found.", null, null);
    }

    return resSend(res, true, 200, "data fetched successfully.", resgetQapSave, null);
  } catch (err) {
    console.error("getQapSave error", err);
    resSend(res, false, 500, Messages.SOMTHING_WENT_WRONG, null, null);
  }
}

async function deleteQapSave(req, res) {
  try {
    const tokenData = req.tokenData;

    if (!req.query.reference_no || !canUseQapDraft(tokenData)) {
      return resSend(res, true, 200, "you dont have permination!.", null, null);
    }

    const deleteQapSaveQuery = `DELETE FROM ${QAP_SAVE} WHERE reference_no = $1 AND man_no = $2`;
    const deleteQapSave = await getQuery({
      query: deleteQapSaveQuery,
      values: [req.query.reference_no, tokenData.vendor_code],
    });

    return resSend(res, true, 200, "delete successfully.", deleteQapSave, null);
  } catch (error) {
    console.error("[error]", error);
    resSend(res, false, 500, Messages.SOMTHING_WENT_WRONG, null);
  }
}

const checkActualSub = async (purchasing_doc_no, client) => {
  const GET_LATEST_QA_query = `SELECT count(*) as count FROM actualsubmissiondate WHERE purchasing_doc_no = $1 and milestoneText = $2 LIMIT 1`;

  const result = await poolQuery({
    client,
    query: GET_LATEST_QA_query,
    values: [purchasing_doc_no, A_QAP_DATE],
  });
  if (result && result[0].count > 0) {
    return false;
  }

  return true;
};

module.exports = {
  submitQAP,
  list,
  internalDepartmentList,
  internalDepartmentEmpList,
  insertQapSave,
  getQapSave,
  deleteQapSave,
};