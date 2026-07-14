const { qapPayload, setActualSubmissionDate, create_reference_no } = require("../../services/po.services");
const { resSend } = require("../../lib/resSend");
const { getQuery, poolClient, poolQuery } = require("../../config/pgDbConfig");
const { generateQuery, getEpochTime } = require("../../lib/utils");
const { INSERT, USER_TYPE_GRSE_QAP, QAP_STAFF, USER_TYPE_VENDOR, ASSIGNER, A_QAP_DATE, MID_QAP } = require("../../lib/constant");
const { QAP_SUBMISSION, QAP_SAVE } = require("../../lib/tableName");
const { APPROVED, RE_SUBMITTED, ACCEPTED, REJECTED, SAVED, ASSIGNED, UPDATED, SUBMITTED } = require("../../lib/status");
const {
  QAP_UPLOAD_BY_VENDOR,
  QAP_ASSIGNMENT,
  QAP_APPROVE_REJECT,
  QAP_ACCEPT_UPDATE,
} = require("../../lib/event");
// const { mailTrigger } = require("../sendMailController");
// const { deptLogEntry } = require("../../log/deptActivities");
const { getUserDetailsQuery } = require("../../utils/mailFunc");
const { sendMail } = require("../../services/mail.services");
const Messages = require("../../utils/messages");

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

    if ((tokenData.user_type == USER_TYPE_VENDOR && payload.status === SUBMITTED) && (!filePath || !fileName)) {
      return resSend(res, false, 200, Messages.FILE_REQUIRED_MSG, Messages.MANDATORY_INPUTS_REQUIRED, null);
    }

    let supporting_doc;
    // if (req.files.supporting_doc && req.files.supporting_doc.length > 0) {
    //   supporting_doc = req.files.supporting_doc.map((elem) => {
    //     let value = {};
    //     value.file_name = elem.filename;
    //     value.file_path = elem.path;
    //     return value;
    //   });
    // }
    supporting_doc = payload.supporting_doc ? JSON.stringify(payload.supporting_doc) : "";
    payload = {
      ...payload,
      fileName,
      filePath,
      supporting_doc: supporting_doc,
    }

    payload.updated_by = tokenData.user_type === USER_TYPE_VENDOR ? "VENDOR" : "GRSE";
    payload.action_by_id = tokenData.vendor_code;
    const activity_type = payload.status;
    const purchasing_doc_no = payload.purchasing_doc_no;
    const verifyStatusForStaff = new Set([REJECTED, ACCEPTED, SAVED, APPROVED, UPDATED]);

    if (!payload.purchasing_doc_no || !payload.remarks || payload.remarks.trim() === "" || !payload.status || payload.status.trim() === "") {
      return resSend(res, false, 200, "Remarks is mandotory!", null, null);
    }

    let message = ``;

    // Check if already accepted/rejected/approved and if GRSE

    if (tokenData?.user_type !== USER_TYPE_VENDOR && payload.status !== "ASSIGNED") {
      if (!payload.reference_no || payload.reference_no == "") {
        return resSend(res, false, 200, "reference_no is mandotory!", null, null);
      }
      let count_val = await checkIsApprovedOrRejected(client, purchasing_doc_no, payload.reference_no, APPROVED, REJECTED);
      if (count_val > 0) {
        return resSend(res, false, 200, `You can't take any action against this reference no.`, null, null);
      }
    }

    ///////// CHECK DEPERTMENT /////////////////
    if (tokenData.department_id && tokenData.department_id === USER_TYPE_GRSE_QAP) {
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
            // message = `This QAP has already ${ASSIGNED}`;
            // return resSend(res, true, 200, message, null, null);
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
        let count_val = await checkIsApprovedOrRejected(client, purchasing_doc_no, payload.reference_no, APPROVED, REJECTED);
        if (count_val > 0) {
          return resSend(res, false, 200, `You can't take any action against this reference no.`, null, null);
        }
      }

      const reference_no = payload.reference_no && payload.reference_no != "" ? payload.reference_no : await create_reference_no("QAP", tokenData.vendor_code);

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
    if (tokenData.user_type === USER_TYPE_VENDOR && activity_type != SUBMITTED && activity_type != RE_SUBMITTED) {
      return resSend(res, false, 200, `Vendor can only send status for ${SUBMITTED}/${RE_SUBMITTED}`, null, null);
    }

    const { q, val } = generateQuery(INSERT, QAP_SUBMISSION, insertObj);

    const response = await poolQuery({ client, query: q, values: val });

    await checkActualSub(payload.purchasing_doc_no, client);
    //if (checkAS) {
    if (insertObj.status === APPROVED) {
      await setActualSubmissionDate(insertObj, MID_QAP, tokenData, SUBMITTED);
    }
    // }

    if (response) {
      // payload.insertId = response.insertId;
      // payload.sendAt = new Date(payload.created_at);
      handelMail(tokenData, payload, QAP_UPLOAD_BY_VENDOR);
      resSend(res, true, 200, "Inserted successfully", response, null);
    } else {
      resSend(res, false, 400, "No data inserted", [], null);
    }
  } catch (error) {
    console.error("QAP Submissio api", error);

    return resSend(res, false, 500, Messages.SOMTHING_WENT_WRONG, null, null);
  } finally {
   if(client) client.release();
  }

};

const checkIsApprovedOrRejected = async (client, purchasing_doc_no, reference_no, status1, status2) => {
  const check = `SELECT COUNT(status) AS count_val FROM qap_submission WHERE purchasing_doc_no = $1 AND reference_no = $2 AND (status = $3 OR status = $4)`;
  const resAssigneQry = await poolQuery({
    client,
    query: check,
    values: [purchasing_doc_no, reference_no, status1, status2],
  });
  return resAssigneQry[0].count_val;
};

// const getQAPData = async (getQuery, purchasing_doc_no, drawingStatus) => {
//   // const Q = `SELECT purchasing_doc_no FROM ${QAP_SUBMISSION} WHERE purchasing_doc_no = ? AND status = ?`;
//   const result = await query({
//     query: getQuery,
//     values: [purchasing_doc_no, drawingStatus],
//   });
//   return result;
// };

const list = async (req, res) => {
  try {
    // const tokenData = req.tokenData;
    const pre = `SELECT * FROM ${QAP_SUBMISSION} WHERE purchasing_doc_no = $1 ORDER BY id ASC`;
    // const pre = `
    //             SELECT
    //             qap.*,
    //             vendor.SMTP_ADDR AS vendor_email,
    //             grse_officers_assignFrom.USRID_LONG AS assigned_from_email,
    //             grse_officers_assignTo.USRID_LONG AS assigned_to_email
    //             FROM qap_submission
    //                 AS qap
    //             LEFT JOIN
    //                 adr6 AS vendor
    //             ON
    //                 vendor.PERSNUMBER = qap.vendor_code
    //             LEFT JOIN
    //                 pa0105
    //                 AS
    //                     grse_officers_assignFrom
    //                  ON
    //                      (grse_officers_assignFrom.PERNR = qap.assigned_from AND grse_officers_assignFrom.SUBTY = "0030")
    //                LEFT JOIN
    //                 pa0105
    //                 AS
    //                     grse_officers_assignTo
    //                  ON
    //                      (grse_officers_assignTo.PERNR = qap.assigned_to AND grse_officers_assignTo.SUBTY = "0030")

    //                 WHERE qap.purchasing_doc_no = $1 ORDER BY qap.id ASC`;
    // let qry = ``;
    // let valArr = ``;
    // if (tokenData.user_type === USER_TYPE_VENDOR) {
    //     qry = `( qap.purchasing_doc_no = ? AND qap.vendor_code = ? )`;
    //     valArr = [req.query.poNo, tokenData.vendor_code];
    // }
    // if (tokenData.department_id === USER_TYPE_GRSE_QAP && tokenData.internal_role_id === QAP_ASSIGNER) {
    //     qry = `qap.purchasing_doc_no = ?`;
    //     valArr = [req.query.poNo];
    // }
    // if (tokenData.department_id === USER_TYPE_GRSE_QAP && tokenData.internal_role_id === QAP_STAFF) {
    //     qry = `( qap.purchasing_doc_no = ? AND qap.assigned_to = ? )`;
    //     valArr = [req.query.poNo, tokenData.vendor_code];
    // }
    // const finalQuery = pre + qry;
    // if (finalQuery == "") {
    //     resSend(res, true, 200, "no user type or deperment found.", fileData, null);
    // }

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

// async function poContactDetails(purchasing_doc_no) {
//   const po_contact_details_query = `SELECT 
//         t1.EBELN, 
//         t1.ERNAM AS dealingOfficerId, 
//         t1.LIFNR AS vendor_code, 
//         t2.CNAME AS dealingOfficerName, 
//         t3.USRID_LONG AS dealingOfficerMail, 
//         t4.NAME1 as vendor_name, 
//         t4.ORT01 as vendor_address, 
//         t5.SMTP_ADDR as vendor_mail_id
//     FROM 
//         ekko AS t1 
//     LEFT JOIN 
//         pa0002 AS t2 
//     ON 
//         t1.ERNAM= t2.PERNR 
//     LEFT JOIN 
//         pa0105 AS t3 
//     ON 
//         (t2.PERNR = t3.PERNR AND t3.SUBTY = '0030') 
//     LEFT JOIN 
//         lfa1 AS t4 
//     ON 
//         t1.LIFNR = t4.LIFNR 
//     LEFT JOIN 
//         adr6 AS t5
//        ON
//       t1.LIFNR = t5.PERSNUMBER


//     WHERE 
//         t1.EBELN = $1`;

//   const result = await getQuery({
//     query: po_contact_details_query,
//     values: [purchasing_doc_no],
//   });

//   return result;
// }

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

// async function handelMail(tokenData, payload) {
//   if (tokenData.user_type === USER_TYPE_VENDOR) {
//     if (payload.status === SUBMITTED) {
//       // await logEntry(payload, tokenData.vendor_code, payload.assigned_from, null);
//       // await mailSendToAssignee(payload);
//       // await logEntry(payload, tokenData.vendor_code, null, null);
//       await Promise.all([
//         mailSendToAssignee(payload),
//         logEntry(payload, tokenData.vendor_code, null, null),
//       ]);
//     }
//     if (payload.status === RE_SUBMITTED) {
//       // await logEntry(payload, tokenData.vendor_code, payload.assigned_from, payload.assigned_to);
//       // await mailSendToAssigneeAndStaff(payload);
//       // await logEntry(payload, tokenData.vendor_code, null, null);
//       await Promise.all([
//         mailSendToAssigneeAndStaff(payload),
//         logEntry(payload, tokenData.vendor_code, null, null),
//       ]);
//     }
//   } else if (tokenData.user_type !== USER_TYPE_VENDOR) {
//     if (payload.status === ACCEPTED) {
//       // await logEntry(payload, tokenData.vendor_code, payload.vendor_code, null);
//       // await logEntry(payload, tokenData.vendor_code, null, null);
//       // await mailSendToStaffAndVendor(payload);
//       await Promise.all([
//         logEntry(payload, tokenData.vendor_code, null, null),
//         mailSendToStaffAndVendor(payload),
//       ]);
//     }
//     if (payload.status === REJECTED) {
//       // await logEntry(payload, tokenData.vendor_code, payload.vendor_code, null);
//       // await logEntry(payload, tokenData.vendor_code, null, null);
//       // await mailSendToAssigneeAndVendor(payload);
//       await Promise.all([
//         logEntry(payload, tokenData.vendor_code, null, null),
//         mailSendToAssigneeAndVendor(payload),
//       ]);
//     }
//     if (payload.status === APPROVED) {
//       // await logEntry(payload, tokenData.vendor_code, payload.vendor_code, payload.assigned_to);
//       // await logEntry(payload, tokenData.vendor_code, null, null);
//       // await mailSendToAssigneeAndVendor(payload);

//       await Promise.all([
//         logEntry(payload, tokenData.vendor_code, null, null),
//         mailSendToAssigneeAndVendor(payload),
//       ]);
//     }
//     if (payload.status === ASSIGNED) {
//       // await logEntry(payload, tokenData.vendor_code, null, null);
//       // await mailSendToStaffAndVendor(payload);

//       await Promise.all([
//         logEntry(payload, tokenData.vendor_code, null, null),
//         mailSendToStaffAndVendor(payload),
//       ]);
//     }
//   }
// }

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

    // switch (event) {
    //   case QAP_UPLOAD_BY_VENDOR:

    //     break;
    //   case QAP_ASSIGNMENT:

    //     break;
    //   case QAP_APPROVE_REJECT:

    //     break;

    //   default:
    //     break;
    // }
  } catch (error) {
    console.error("handelMail qap", error.toString(), error.stack);
  }
}

// async function logEntry(
//   payload,
//   vendor_code,
//   assigned_from,
//   assigner_person_id
// ) {
//   try {
//     const data = [];
//     if (assigned_from) {
//       data.push(assigned_from);
//     }
//     if (assigner_person_id) {
//       data.push(assigner_person_id);
//     }
//     if (vendor_code) {
//       data.push(vendor_code);
//     }

//     const logPayload = [];
//     for (let i = 0; i < data.length; i++) {
//       logPayload.push({
//         user_id: data[i],
//         vendor_code: payload.vendor_code,
//         depertment: 3,
//         action: payload.status,
//         item_info_id: payload.insertId,
//         remarks: payload.remarks,
//         purchasing_doc_no: payload.purchasing_doc_no,
//         created_at: payload.created_at,
//         created_by_id: payload.action_by_id,
//       });
//     }
//     const log = await deptLogEntry(logPayload);
//   } catch (error) {
//   }
// }

// async function getAssigneeMailId() {
//   try {
//     const mailIdQuery = `
//         SELECT
//         assignee.USRID_LONG as assigned_from_email,
//         assignFrom_detail.CNAME AS assigned_from_name
//         FROM
//             depertment_master
//         AS
//             dept_master
//         LEFT JOIN
//             auth
//         AS
//             auth
//         ON
//             (auth.department_id = dept_master.id AND auth.internal_role_id = ?)
//         LEFT JOIN
//             pa0105
//         AS
//             assignee
//         ON
//             (assignee.PERNR = auth.vendor_code AND assignee.SUBTY = ? )
//         LEFT JOIN
//             pa0002
//         AS
//             assignFrom_detail
//         ON
//             assignFrom_detail.PERNR = auth.vendor_code
//         WHERE
//             dept_master.id = ? ;`;

//     const result = await query({ query: mailIdQuery, values: [1, "0030", 3] });
//     return result;
//   } catch (error) { }
// }

async function insertQapSave(req, res) {
  // return resSend(res, true, 200, "qapSave!", req.query, null);
  try {
    const tokenData = { ...req.tokenData };

    let payload = { ...req.body, created_at: getEpochTime() };

    if (!req.body.reference_no) {
      return resSend(res, false, 200, "Please send valid reference_no!.", null, null);
    }
    if (tokenData.user_type === USER_TYPE_VENDOR) {
      return resSend(res, false, 200, "Please login as valid user!.", null, null);
    }

    payload.created_by_id = tokenData.vendor_code;
    payload.man_no = tokenData.vendor_code;
    const { q, val } = generateQuery(INSERT, QAP_SAVE, payload);
    const response = await getQuery({ query: q, values: val });

    return resSend(res, true, 200, "Data inserted.", response, null);
  } catch (error) {
    console.error(error);
    return resSend(res, false, 400, "error.", error, null);
  }
}

async function getQapSave(req, res) {
  // return resSend(res, true, 200, "getQapSave!", req.query, null);
  try {
    const tokenData = req.tokenData;

    if (!req.query.reference_no || tokenData.department_id != USER_TYPE_GRSE_QAP) {
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

    if (!req.query.reference_no || tokenData.department_id != USER_TYPE_GRSE_QAP) {
      return resSend(res, true, 200, "you dont have permination!.", null, null);
    }

    const deleteQapSaveQuery = `DELETE FROM ${QAP_SAVE} WHERE reference_no = $1`;
    const deleteQapSave = await getQuery({
      query: deleteQapSaveQuery,
      values: [req.query.reference_no],
    });

    return resSend(res, true, 200, "delete successfully.", deleteQapSave, null);
  } catch (error) {
    console.error("[error]", error);
    resSend(res, false, 500,Messages.SOMTHING_WENT_WRONG, null);
  }
}

// const get_latest_QA_with_reference = async (client, purchasing_doc_no, reference_no) => {
//   const GET_LATEST_QA_query = `SELECT file_name,file_path,action_type,vendor_code,assigned_from,assigned_to,created_at,status FROM qap_submission WHERE purchasing_doc_no = $1 and reference_no = $2 ORDER BY qap_submission.created_at DESC LIMIT 1`;

//   const result = await poolQuery({
//     client,
//     query: GET_LATEST_QA_query,
//     values: [purchasing_doc_no, reference_no],
//   });

//   return result;
// };

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
