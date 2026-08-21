/* eslint-disable no-undef */
/* eslint-disable no-unsafe-finally */
const {
  getQuery,
  poolClient,
  poolQuery,
  executeQuery,
} = require("../config/pgDbConfig");
const path = require("path");
const { makeHttpRequest } = require("../config/sapServerConfig");
const {
  INSERT,
  USER_TYPE_VENDOR,
  UPDATE,
  MID_SDBG,
  MID_ILMS,
  MID_QAP,
  MID_DRAWING,
  USER_TYPE_HSL_FINANCE,
  ACTION_DD,
  ACTION_IB,
} = require("../lib/constant");
const {
  BTN_RETURN_DO,
  BTN_FORWORD_FINANCE,
  BTN_UPLOAD_CHECKLIST,
  BTN_ASSIGN_TO_STAFF,
  BTN_REJECT,
} = require("../lib/event");
const { resSend } = require("../lib/resSend");
const fs = require("fs/promises");
const {
  SUBMITTED,
  FORWARD_TO_FINANCE,
  REJECTED,
  ASSIGNED,
  STATUS_RECEIVED,
  SUBMIT_BY_DO,
  SUBMITTED_BY_DO,
  SUBMITTED_BY_VENDOR,
  F_STATUS_FORWARDED_TO_FINANCE,
  BTN_STATUS_BANK,
  BTN_STATUS_HOLD_TEXT,
  BTN_STATUS_PROCESS,
  BTN_STATUS_NOT_SUBMITTED,
  BTN_STATUS_DRETURN,
  SUBMITTED_BY_CAUTHORITY,
  BTN_STATUS_PAYMENT_DONE_TEXT,
} = require("../lib/status");
const {
  BTN_MATERIAL,
  BTN_LIST,
  BTN_MATERIAL_DO,
  BTN_ASSIGN,
} = require("../lib/tableName");
const {
  getEpochTime,
  getYyyyMmDd,
  generateQuery,
  generateInsertUpdateQuery,
} = require("../lib/utils");
const { sendMail } = require("../services/mail.services");
const { create_btn_no } = require("../services/po.services");
const {
  getSDBGApprovedFiles,
  getPBGApprovedFiles,
  fetchBTNListByPOAndBTNNum,
  getSDFiles,
  updateInvoiceDate,
  calculateTotalGrnValue,
} = require("../utils/btnUtils");
const { convertToEpoch, formatDashedDate } = require("../utils/dateTime");
const { getUserDetailsQuery } = require("../utils/mailFunc");
const { checkTypeArr } = require("../utils/smallFun");
const Message = require("../utils/messages");
const {
  getGateEntryDetails,
  getGrnDetails,
  getIcgrnDetails,
  getAssociatePoList,
  checkInoiceFiles,
  getReturnedGrnDetails,
  getGrnIcgrnByInvoiceService,
} = require("../services/btn.services");
const { getQueryForbtnSaveToSap } = require("../services/sap.btn.services");
const {
  checkInvoice,
  getContractualDates,
  setContractualDateIntoPayload,
  getAactualDates,
  setAactualDateIntoPayload,
  materialBtnFinalPayload,
  materialBtnAssignPayload,
  materialBtnForwordToFinacePayload,
  materialBtnInitialPayload,
  updateMaterialBtn,
} = require("../services/btnMaterial.services");

const fetchBTNByNum = async (req, res) => {
  const { id, btn_num } = req.query;
  if (!id || !btn_num) {
    return resSend(
      res,
      false,
      200,
      "PO number or BTN number is missing, please refresh and retry!",
      null,
      null,
    );
  }

  let btnQ = `SELECT btn.*, ge_d.inv_date as invoice_date FROM btn as btn 
    LEFT JOIN zmm_gate_entry_d as ge_d 
      ON(ge_d.ebeln = btn.purchasing_doc_no AND ge_d.invno = btn.invoice_no )
    WHERE purchasing_doc_no = $1 and btn_num = $2`;

  let result = await getQuery({
    query: btnQ,
    values: [id, btn_num],
  });

  result = result.map((el) => {
    if (el.icgrn_nos) {
      try {
        el.icgrn_nos = JSON.parse(el.icgrn_nos);
      } catch (error) {
        console.error("el.icgrn_nos parsing error", error);
        // el.icgrn_nos = el.icgrn_nos;
      }
    }
    return el;
  });

  return resSend(res, true, 200, "ALL data from BTNs", result, null);
};

const fetchBTNByNumForDO = async (req, res) => {
  const { btn_num } = req.query;
  if (!btn_num) {
    return resSend(
      res,
      false,
      200,
      "BTN number is missing, please refresh and retry!",
      null,
      null,
    );
  }

  let btnDOQ = `SELECT * FROM ${BTN_MATERIAL_DO} WHERE btn_num = $1`;

  let doRes = await getQuery({
    query: btnDOQ,
    values: [btn_num],
  });

  return resSend(res, true, 200, "ALL data from BTNs", doRes, null);
};

const getBTNData = async (req, res) => {
  try {
    const { id } = req.query;
    // GET Contractual Dates from other Table
    let c_sdbg_date;
    let c_drawing_date;
    let c_qap_date;
    let c_ilms_date;
    let c_sdbg_date_q = `SELECT mid, plan_date as "PLAN_DATE", mtext as "MTEXT" FROM zpo_milestone WHERE ebeln = $1`;
    let c_dates = await getQuery({
      query: c_sdbg_date_q,
      values: [id],
    });
    checkTypeArr(c_dates) &&
      c_dates.forEach((item) => {
        if (Number(item.mid) === Number(MID_SDBG)) {
          c_sdbg_date = item.PLAN_DATE;
        } else if (Number(item.mid) === Number(MID_DRAWING)) {
          c_drawing_date = item.PLAN_DATE;
        } else if (Number(item.mid) === Number(MID_QAP)) {
          c_qap_date = item.PLAN_DATE;
        } else if (Number(item.mid) === Number(MID_ILMS)) {
          c_ilms_date = item.PLAN_DATE;
        }
      });

    // GET Actual Dates from other Table
    let a_sdbg_date;
    let a_drawing_date;
    let a_qap_date;
    let a_ilms_date;
    let a_sdbg_date_q = `SELECT milestoneid, actualsubmissiondate AS "PLAN_DATE", milestonetext AS "MTEXT" FROM actualsubmissiondate WHERE purchasing_doc_no = $1`;
    let a_dates = await getQuery({
      query: a_sdbg_date_q,
      values: [id],
    });
    checkTypeArr(a_dates) &&
      a_dates.forEach((item) => {
        if (Number(item.milestoneid) === Number(MID_SDBG)) {
          a_sdbg_date = item.PLAN_DATE;
        } else if (Number(item.milestoneid) === Number(MID_DRAWING)) {
          a_drawing_date = item.PLAN_DATE;
        } else if (Number(item.milestoneid) === Number(MID_QAP)) {
          a_qap_date = item.PLAN_DATE;
        } else if (Number(item.milestoneid) === Number(MID_ILMS)) {
          a_ilms_date = item.PLAN_DATE;
        }
      });

    let obj = {
      c_sdbg_date,
      c_drawing_date,
      c_qap_date,
      c_ilms_date,
      a_sdbg_date,
      a_drawing_date,
      a_qap_date,
      a_ilms_date,
    };

    // GET Approved SDBG by PO Number
    let sdbg_filename_result = await getSDBGApprovedFiles(id);

    if (checkTypeArr(sdbg_filename_result)) {
      obj = { ...obj, sdbg_filename: sdbg_filename_result };
    }
    let ib_filename = await getSDFiles(id, ACTION_IB);
    let dd_filename = await getSDFiles(id, ACTION_DD);

    obj = {
      ...obj,
      ib_filename,
      dd_filename,
    };

    // GET Approved SDBG by PO Number
    let pbg_filename_result = await getPBGApprovedFiles(id);

    if (checkTypeArr(pbg_filename_result)) {
      obj = { ...obj, pbg_filename: pbg_filename_result };
    }

    resSend(res, true, 200, "Succesfully fetched all data!", obj, null);
  } catch (error) {
    console.error(error);
    resSend(
      res,
      false,
      200,
      "Something went wrong when fetching the dates!",
      null,
      null,
    );
  }
};

const addToBTNList = async (data, status, client) => {
  let payload = {
    btn_num: data?.btn_num,
    purchasing_doc_no: data?.purchasing_doc_no,
    net_claim_amount: data?.net_claim_amount,
    net_payable_amount: data?.net_payable_amount,
    vendor_code: data?.vendor_code,
    created_at: data?.created_at,
    btn_type: data?.btn_type,
    assign_by: data?.vendor_code,
    assign_to: data?.assign_to,
    status: status,
  };
  let { q, val } = generateQuery(INSERT, BTN_LIST, payload);
  let res;
  if (!client) {
    res = await getQuery({ query: q, values: val });
  } else {
    res = await poolQuery({ client, query: q, values: val });
  }
  if (res?.length > 0) {
    return { status: true, data: res };
  }
  return { status: false, data: null };
};

// eslint-disable-next-line no-unused-vars
const insertUpdateToBTNList = async (client, data, status, isInserted) => {
  let payload = {
    btn_num: data?.btn_num,
    purchasing_doc_no: data?.purchasing_doc_no,
    net_claim_amount: data?.net_claim_amount,
    net_payable_amount: data?.net_payable_amount,
    vendor_code: data?.vendor_code,
    created_at: data?.created_at,
    btn_type: data?.btn_type,
    status: status,
    assign_by: data?.created_by,
    assign_to: data?.assign_to,
    remarks: data?.remarks,
  };

  let assign_q = generateQuery(INSERT, BTN_LIST, payload);

  let res = await poolQuery({
    client,
    query: assign_q.q,
    values: assign_q.val,
  });

  if (!res.error) {
    return { status: true, data: res };
  } else {
    return { status: false, data: null };
  }
};

const fetchBTNList = async (req, res) => {
  try {
    const { id } = req.query;
    if (!id) {
      return resSend(
        res,
        false,
        200,
        "PO number is missing, please refresh and retry!",
        null,
        null,
      );
    }
    //     let btn_list_q = `SELECT LIST.BTN_NUM,
    // 	LIST.PURCHASING_DOC_NO,
    // 	LIST.NET_CLAIM_AMOUNT,
    // 	LIST.NET_PAYABLE_AMOUNT,
    // 	LIST.VENDOR_CODE,
    // 	LIST.BTN_TYPE,
    //   LIST.STATUS,
    //   LIST.REMARKS,
    // 	LIST.CREATED_AT,
    // 	LIST.assign_by,
    // 	LIST.assign_to,
    // 	LIST.CREATED_AT,
    // 	SERVICE.BILL_CERTIFING_AUTHORITY,
    // 	BTN.INVOICE_NO,
    // 	T_ASSIGN_BY.CNAME AS ASSIGN_BY_NAME,
    // 	T_ASSIGN_TO.CNAME AS ASSIGN_TO_NAME,
    // -- 	BTN_ASSIGN.ASSIGN_BY_FI,
    // -- 	T_ASSIGN_BY_FI.CNAME AS ASSIGN_BY_FI_NAME,
    // 	BTN_ASSIGN.ASSIGN_TO_FI,
    // 	T_ASSIGN_TO_FI.CNAME AS ASSIGN_TO_FI_NAME
    // FROM BTN_LIST AS LIST
    // LEFT JOIN BTN_SERVICE_HYBRID AS SERVICE ON (LIST.BTN_NUM = SERVICE.BTN_NUM)
    // LEFT JOIN BTN AS BTN ON (LIST.BTN_NUM = BTN.BTN_NUM)
    // LEFT JOIN BTN_ASSIGN AS BTN_ASSIGN ON (BTN_ASSIGN.BTN_NUM = LIST.BTN_NUM)
    // LEFT JOIN PA0002 AS T_ASSIGN_BY ON(T_ASSIGN_BY.PERNR :: CHARACTER varying = LIST.ASSIGN_BY)
    // LEFT JOIN PA0002 AS T_ASSIGN_TO ON(T_ASSIGN_TO.PERNR :: CHARACTER varying = LIST.ASSIGN_TO)
    // LEFT JOIN PA0002 AS T_ASSIGN_BY_FI ON(T_ASSIGN_BY_FI.PERNR :: CHARACTER varying = BTN_ASSIGN.ASSIGN_BY_FI)
    // LEFT JOIN PA0002 AS T_ASSIGN_TO_FI ON(T_ASSIGN_TO_FI.PERNR :: CHARACTER varying = BTN_ASSIGN.ASSIGN_TO_FI)
    // WHERE LIST.PURCHASING_DOC_NO = $1`;

    let btn_list_q = `SELECT 
        LIST.BTN_NUM,
        LIST.PURCHASING_DOC_NO,
        LIST.NET_CLAIM_AMOUNT,
        LIST.NET_PAYABLE_AMOUNT,
        LIST.VENDOR_CODE,
        LIST.BTN_TYPE,
        LIST.STATUS,
        LIST.REMARKS,
        LIST.CREATED_AT,
        LIST.assign_by,
        LIST.assign_to,
        LIST.CREATED_AT,
        SERVICE_BTN.BILL_CERTIFING_AUTHORITY,
        SERVICE_BTN.DELEGATE_TO,
        SERVICE_BTN.DELEGATE_ACTION_BY,
        COALESCE(BTN.INVOICE_NO, SERVICE_BTN.INVOICE_NO, btn_jcc.INVOICE_NO, btn_pbg.INVOICE_NO, btn_any_other_claim.letter_reference_no, btn_adv_bill_against_bg.INVOICE_NO) AS invoice_no,
        COALESCE(NULLIF(T_ASSIGN_BY.CNAME, ''), V_ASSIGN_BY.name1) AS ASSIGN_BY_NAME,
        COALESCE(NULLIF(T_ASSIGN_TO.CNAME, ''), V_ASSIGN_TO.name1) AS ASSIGN_TO_NAME,
        V_ASSIGN_BY.name1 AS V_ASSIGN_BY_NAME,
        V_ASSIGN_TO.name1 AS V_ASSIGN_TO_NAME
    FROM 
        BTN_LIST AS LIST
    LEFT JOIN 
        BTN AS BTN ON (LIST.BTN_NUM = BTN.BTN_NUM)
    LEFT JOIN 
      BTN_SERVICE_HYBRID AS SERVICE_BTN ON (LIST.BTN_NUM = SERVICE_BTN.BTN_NUM)
    LEFT JOIN 
      btn_jcc AS btn_jcc ON (LIST.BTN_NUM = btn_jcc.BTN_NUM)
    LEFT JOIN 
      btn_pbg AS btn_pbg ON (LIST.BTN_NUM = btn_pbg.BTN_NUM)
    LEFT JOIN 
      btn_any_other_claim AS btn_any_other_claim ON (LIST.BTN_NUM = btn_any_other_claim.BTN_NUM)
    LEFT JOIN 
      btn_adv_bill_against_bg AS btn_adv_bill_against_bg ON (LIST.BTN_NUM = btn_adv_bill_against_bg.BTN_NUM)
    LEFT JOIN 
        PA0002 AS T_ASSIGN_BY ON (T_ASSIGN_BY.PERNR::CHARACTER varying = LIST.ASSIGN_BY)
    LEFT JOIN 
        PA0002 AS T_ASSIGN_TO ON (T_ASSIGN_TO.PERNR::CHARACTER varying = LIST.ASSIGN_TO)
    LEFT JOIN 
        lfa1 AS V_ASSIGN_BY ON (V_ASSIGN_BY.lifnr::CHARACTER varying = LIST.ASSIGN_BY)
    LEFT JOIN 
        lfa1 AS V_ASSIGN_TO ON (V_ASSIGN_TO.lifnr::CHARACTER varying = LIST.ASSIGN_TO)
    WHERE 
        LIST.PURCHASING_DOC_NO = $1`;

    let btn_list = await getQuery({
      query: btn_list_q,
      values: [id],
    });
    if (btn_list.length > 0) {
      return resSend(
        res,
        true,
        200,
        "BTN list has been fetched succesfully!",
        btn_list,
        null,
      );
    } else {
      return resSend(res, true, 200, "No btn found", btn_list, null);
    }
  } catch (error) {
    console.error("[ERROR] fetch btn list", error);
    resSend(res, false, 500, Message.SOMTHING_WENT_WRONG, null, null);
  }
};

// const submitBTN = async (req, res) => {
//   let client;
//   try {
//     client = await poolClient();
//     await client.query("BEGIN");
//     try {
//       let { purchasing_doc_no, invoice_no, invoice_date, invoice_type, invoice_value, cgst, igst, sgst, debit_note, credit_note, hsn_gstn_icgrn, associated_po } = req.body;
//       let payloadFiles = req.files;
//       const tokenData = { ...req.tokenData };
//       let payload = {
//         ...req.body,
//         vendor_code: tokenData?.vendor_code,
//         created_by_id: tokenData?.vendor_code,
//         btn_type: BTN_HYBRID_BILL_MATERIAL,
//         updated_by: "VENDOR",
//       };

//       delete payload.associated_po;
//       delete payload.invoice_date;
//       // Check required fields
//       if (!hsn_gstn_icgrn) {
//         return resSend(res, false, 200, "Please check HSN code, GSTIN, Tax rate is as per PO!", null, null);
//       }

//       // Check required fields
//       // if (!invoice_value || !invoice_value.trim() === "" || parseFloat(invoice_value) < 0) {
//       //   return resSend(res, false, 200, "Basic Value is mandatory.", null, null);
//       // }
//       if (!invoice_value || isNaN(invoice_value) || parseInt(invoice_value) < 0) {
//         return resSend(res, false, 200, "Basic Value is mandatory!", null, null);
//       }

//       if (!purchasing_doc_no || !invoice_no) {
//         return resSend(res, false, 200, "Invoice Number is missing!", null, null);
//       }

//       // check invoice number is already present in DB
//       // let check_invoice_q = `SELECT count(*) as count FROM btn WHERE invoice_no = $1 and vendor_code = $2`;
//       // let check_invoice = await getQuery({
//       //   query: check_invoice_q,
//       //   values: [invoice_no, tokenData.vendor_code],
//       // });

//       let check_invoice_q = `SELECT
//   t1.*
// FROM
//   btn_list AS t1
// WHERE
//   t1.created_at = (
//       SELECT
//           MAX(t1_inner.created_at)
//       FROM
//           btn_list AS t1_inner
//       LEFT JOIN
//           btn AS t2
//       ON
//           t1_inner.btn_num = t2.btn_num
//       WHERE
//           t2.invoice_no = $1 AND t1_inner.purchasing_doc_no = $2
//   )`;
//       let check_invoice = await poolQuery({
//         client,
//         query: check_invoice_q,
//         values: [invoice_no, purchasing_doc_no],
//       });
//       if (check_invoice.length == 0 || (check_invoice.length > 0 && check_invoice[0].status == REJECTED)) {
//         if (checkTypeArr(check_invoice) && check_invoice[0].count > 0) {
//           return resSend(res, false, 200, "BTN is already created under the invoice number.", null, null);
//         }

//         // Handle uploaded files
//         let invoice_filename = null,
//           invoice_file_path = null;
//         if (payloadFiles["invoice_filename"]) {
//           invoice_filename = payloadFiles["invoice_filename"][0]?.filename;
//           invoice_file_path = payloadFiles["invoice_filename"][0]?.path;
//           payload = { ...payload, invoice_filename, invoice_file_path };
//         }
//         let suppoting_invoice_filename = null,
//           suppoting_invoice_file_path = null;
//         if (payloadFiles["invoice_supporting_doc"]) {
//           suppoting_invoice_filename = payloadFiles["invoice_supporting_doc"][0]?.filename;
//           suppoting_invoice_file_path = payloadFiles["invoice_supporting_doc"][0]?.path;
//           payload = {
//             ...payload,
//             suppoting_invoice_filename,
//             suppoting_invoice_file_path,
//           };
//         }

//         let debit_credit_filename = null,
//           debit_credit_file_path = null;
//         if (payloadFiles["debit_credit_filename"]) {
//           debit_credit_filename = payloadFiles["debit_credit_filename"][0]?.filename;
//           debit_credit_file_path = payloadFiles["debit_credit_filename"][0]?.path;
//           payload = {
//             ...payload,
//             debit_credit_filename,
//             debit_credit_file_path,
//           };
//         }

//         let resICGRN = await getGRNICGRNsValue({ purchasing_doc_no, invoice_no });
//         if (!resICGRN) {
//           return resSend(res, false, 200, `Invoice number is not valid!`, null, null);
//         }
//         const inv_date = invoice_date * 1000 || new Date().getTime();
//         // const updatInv = await updateInvoiceDate(client, { inv_date: formatDashedDate(new Date(inv_date).getTime()) }, resICGRN.gate_entry_data);
//          await updateInvoiceDate(client, { inv_date: formatDashedDate(new Date(inv_date).getTime()) }, { ...resICGRN, purchasing_doc_no, invoice_no });

//         payload = {
//           ...payload,
//           invoice_type,
//           grn_nos: JSON.stringify(resICGRN.grn_nos),
//           icgrn_total: resICGRN.total_price,
//           icgrn_nos: JSON.stringify(resICGRN.icgrn_nos),
//         };

//         let demand_raise_filename = null,
//           demand_raise_file_path = null;
//         if (payloadFiles["demand_raise_filename"]) {
//           demand_raise_filename = payloadFiles["demand_raise_filename"][0]?.filename;
//           demand_raise_file_path = payloadFiles["demand_raise_filename"][0]?.path;
//           payload = {
//             ...payload,
//             demand_raise_filename,
//             demand_raise_file_path,
//           };
//         }

//         // payloadFiles["demand_raise_filename"]
//         //   ? (payload = {
//         //     ...payload,
//         //     demand_raise_filename:
//         //       payloadFiles["demand_raise_filename"][0]?.filename,
//         //   })
//         //   : null;

//         // generate btn num
//         const btn_num = await create_btn_no(client);
//         payload = { ...payload, btn_num };

//         // MATH Calculation
//         if (!debit_note || debit_note === "") {
//           debit_note = 0;
//         }
//         if (!credit_note || credit_note === "") {
//           credit_note = 0;
//         }
//         if (!cgst || cgst === "") {
//           cgst = 0;
//         }
//         if (!sgst || sgst === "") {
//           sgst = 0;
//         }
//         if (!igst || igst === "") {
//           igst = 0;
//         }

//         let net_claim_amount = parseFloat(invoice_value) + parseFloat(debit_note) - parseFloat(credit_note);
//         net_claim_amount = net_claim_amount.toFixed(4)

//         let totalGST = parseFloat(cgst) + parseFloat(sgst) + parseFloat(igst);
//         let net_with_gst = net_claim_amount;
//         if (totalGST > 0) {
//           net_with_gst = net_claim_amount * (1 + totalGST / 100);
//           net_with_gst = parseFloat(net_with_gst.toFixed(2));
//         }

//         payload = { ...payload, net_claim_amount, net_with_gst };

//         // GET Contractual Dates from other Table
//         let c_sdbg_date_q = `SELECT PLAN_DATE as "PLAN_DATE", MTEXT as "MTEXT", MID AS "MID" FROM zpo_milestone WHERE EBELN = $1`;
//         let c_dates = await poolQuery({
//           client,
//           query: c_sdbg_date_q,
//           values: [purchasing_doc_no],
//         });

//         c_dates.forEach((item) => {
//           if (item.PLAN_DATE && item.MTEXT === C_SDBG_DATE) {
//             payload = {
//               ...payload,
//               c_sdbg_date: new Date(item.PLAN_DATE).getTime(),
//             };
//           } else if (item.PLAN_DATE && item.MTEXT === C_DRAWING_DATE) {
//             payload = {
//               ...payload,
//               c_drawing_date: new Date(item.PLAN_DATE).getTime(),
//             };
//           } else if (item.PLAN_DATE && item.MTEXT === C_QAP_DATE) {
//             payload = {
//               ...payload,
//               c_qap_date: new Date(item.PLAN_DATE).getTime(),
//             };
//           } else if (item.PLAN_DATE && item.MTEXT === C_ILMS_DATE) {
//             payload = {
//               ...payload,
//               c_ilms_date: new Date(item.PLAN_DATE).getTime(),
//             };
//           }
//         });

//         // GET Actual Dates from other Table
//         let a_sdbg_date_q = `SELECT actualSubmissionDate AS "PLAN_DATE", milestoneText AS "MTEXT", milestoneid AS "MID" FROM actualsubmissiondate WHERE purchasing_doc_no = $1`;
//         let a_dates = await poolQuery({
//           client,
//           query: a_sdbg_date_q,
//           values: [purchasing_doc_no],
//         });

//         a_dates.forEach((item) => {
//           if (item.MTEXT === A_SDBG_DATE) {
//             if (!item.PLAN_DATE) {
//               return resSend(res, false, 200, `${A_SDBG_DATE} is missing!`, null, null);
//             }
//             payload = { ...payload, a_sdbg_date: item.PLAN_DATE };
//           } else if (item.MTEXT === A_DRAWING_DATE) {
//             if (!item.PLAN_DATE) {
//               return resSend(res, false, 200, `${A_SDBG_DATE} is missing!`, null, null);
//             }
//             payload = { ...payload, a_drawing_date: item.PLAN_DATE };
//           } else if (item.MTEXT === A_QAP_DATE) {
//             if (!item.PLAN_DATE) {
//               return resSend(res, false, 200, `${A_QAP_DATE} is missing!`, null, null);
//             }
//             payload = { ...payload, a_qap_date: item.PLAN_DATE };
//           } else if (item.MTEXT === A_ILMS_DATE) {
//             if (!item.PLAN_DATE) {
//               return resSend(res, false, 200, `${A_ILMS_DATE} is missing!`, null, null);
//             }
//             payload = { ...payload, a_ilms_date: item.PLAN_DATE };
//           }
//         });

//         // checking no submitted milestones by vendor
//         const checkMissingMilestone = checkActualDates(c_dates, a_dates);
//         if (!checkMissingMilestone.success) {
//           return resSend(res, false, 200, checkMissingMilestone.msg, null, null);
//         }

//         // created at
//         let created_at = getEpochTime();
//         const getDoQuery = getUserDetailsQuery("do", "$1");
//         const doDetails = await poolQuery({
//           client,
//           query: getDoQuery,
//           values: [purchasing_doc_no],
//         });
//         payload = {
//           ...payload,
//           created_at,
//           assign_to: doDetails[0]?.u_id || null,
//         };

//         // INSERT Data into btn List table

//         // let payload = {
//         //   btn_num: data?.btn_num,
//         //   purchasing_doc_no: data?.purchasing_doc_no,
//         //   net_claim_amount: data?.net_claim_amount,
//         //   net_payable_amount: data?.net_payable_amount,
//         //   vendor_code: data?.vendor_code,
//         //   created_at: data?.created_at,
//         //   btn_type: data?.btn_type,
//         //   assign_by: data?.vendor_code,
//         //   assign_to: data?.assign_to,
//         //   status: SUBMITTED_BY_VENDOR,
//         // };
//         // let assign_q = generateQuery(INSERT, BTN_LIST, payload);
//         // let res = await poolQuery({
//         //   client,
//         //   query: assign_q.q,
//         //   values: assign_q.val,
//         // });

//         let resBtnList = await addToBTNList(payload, SUBMITTED_BY_VENDOR, client);
//         if (!resBtnList?.status) {
//           return resSend(res, false, 200, `Something went wrong when try to insert in btn list table. Try again!`, null, null);
//         }

//         delete payload.assign_to;
//         let { q, val } = generateQuery(INSERT, BTN_MATERIAL, payload);
//         const result = await poolQuery({ client, query: q, values: val });
//         try {
//           associated_po = JSON.parse(associated_po);
//         } catch (error) {
//           console.error("associated_po parse error", error, error.message);
//         }

//         if (associated_po && associated_po !== "" && Array.isArray(associated_po)) {
//           await Promise.all(
//             associated_po.map(async (item) => {
//               if (item && item?.a_po !== "") {
//                 payload.purchasing_doc_no = item.a_po;
//                 payload.assign_to = doDetails[0]?.u_id || null;
//                 let resBtnList = await addToBTNList(payload, SUBMITTED_BY_VENDOR, client);
//                 if (!resBtnList?.status) {
//                   return resSend(res, false, 200, `Something went wrong. Try again!`, null, null);
//                 }
//                 delete payload.assign_to;
//                 let { q, val } = generateQuery(INSERT, BTN_MATERIAL, payload);
//                 let res = await poolQuery({ client, query: q, values: val });
//                 if (res.length <= 0) {
//                   return resSend(res, false, 200, "Something went wrong for Associated PO!", null, null);
//                 }
//               }
//             })
//           );
//         }

//         if (result.length > 0) {
//           await client.query("COMMIT");
//           handelMail(tokenData, { ...payload, status: SUBMITTED });
//           return resSend(res, true, 200, "BTN number is generated and saved succesfully!", null, null);
//         } else {
//           await client.query("ROLLBACK");
//           return resSend(res, false, 200, "Data not inserted! Try Again!", null, null);
//         }
//       } else {
//         return resSend(res, false, 200, "BTN is already created under the invoice number.", null, null);
//       }
//     } catch (error) {
//       console.error("[ERROR] submitBTN", error);
//       resSend(res, true, 500, Message.SOMTHING_WENT_WRONG, null, null);
//     }
//   } catch (error) {
//     console.error("[ERROR] submitBTN", error);
//     resSend(res, true, 500, Message.SOMTHING_WENT_WRONG, null, null);
//   } finally {
//     if (client) client.release();
//   }
// };
// const submitBTN = async (req, res) => {
//   try {

//     await withTransaction(async (client) => {

//       let {
//         purchasing_doc_no,
//         invoice_no,
//         invoice_date,
//         invoice_type,
//         invoice_value,
//         cgst,
//         igst,
//         sgst,
//         debit_note,
//         credit_note,
//         associated_po,
//       } = req.body;

//       const tokenData = req.tokenData;

//       // INITIAL PAYLOAD VALIDATE AND SET INITIAL PAYLOAD

//       const declaration1 = 'I hereby declare that all the entries are correct';
//       const declaration2 = 'Whether HSN code, GSTIN, Tax rate is as per PO';

//       // FORMAT INVOICET TO UPDATE INVOICE DATE IF INVOICE DATE IS MISSING IN _D SAP TABLE
//       const inv_date = invoice_date * 1000 || new Date().getTime();

//       const initialPayload = materialBtnInitialPayload({ ...req.body, status: SUBMITTED_BY_VENDOR }, tokenData);
//       console.log("initialPayload", initialPayload);

//       if (!initialPayload.success) {
//         return resSend(res, false, 200, Message.INVALID_PAYLOAD, {}, initialPayload.errors);
//       }

//       // CHECK INVOICE THAT ALREADY PLACED ANY BTN BY SAME INVOICE NO
//       let check_invoice = await checkInvoice(client, invoice_no, purchasing_doc_no);

//       if (check_invoice.length == 0 || (check_invoice.length > 0 && check_invoice[0].status == REJECTED)) {
//         if (checkTypeArr(check_invoice) && check_invoice[0].count > 0) {
//           return resSend(res, false, 200, "BTN is already created under the invoice number.", null, null);
//         }

//         let resICGRN = await getGRNICGRNsValue(client, { purchasing_doc_no, invoice_no });

//         console.log("resICGRN resICGRN resICGRN resICGRN resICGRN", resICGRN);

//         if (!resICGRN) {
//           return resSend(res, false, 200, `Invoice number is not valid!`, null, null);
//         }

//         /**
//          * CALCULATION :
//          * GST AMT
//          * NET CLAIM AMOUNT
//          * NET WITH GST
//          */

//         let net_claim_amount = parseFloat(invoice_value) + parseFloat(debit_note) - parseFloat(credit_note);
//         net_claim_amount = net_claim_amount.toFixed(4)

//         const totalGST = parseFloat(cgst) + parseFloat(sgst) + parseFloat(igst);
//         let net_with_gst = net_claim_amount;

//         if (totalGST > 0) {
//           net_with_gst = net_claim_amount * (1 + totalGST / 100);
//           net_with_gst = parseFloat(net_with_gst.toFixed(2));
//         }

//         const getDoQuery = getUserDetailsQuery("do", "$1");

//         // GET Contractual/actual Dates from other Table

//         let [c_dates, a_dates, btn_num, doDetails] = await Promise.all(
//           [
//             getContractualDates(client, purchasing_doc_no),
//             getAactualDates(client, purchasing_doc_no),
//             create_btn_no(client),
//             poolQuery({ client, query: getDoQuery, values: [purchasing_doc_no] })
//           ]);

//         const contractualDatesData = setContractualDateIntoPayload(c_dates);

//         // GET Actual Dates from other Table

//         const actualDatesData = setAactualDateIntoPayload(a_dates);

//         // checking no submitted milestones by vendor
//         const checkMissingMilestone = checkActualDates(c_dates, a_dates);
//         if (!checkMissingMilestone.success) {
//           return resSend(res, false, 200, "milestone missing", null, null);
//         }

//         // ASSAMBLE MORE DATA IN PAYLOAD DATA

//         let payload = {
//           ...initialPayload.data,
//           ...contractualDatesData,
//           ...actualDatesData,
//           btn_num,
//           vendor_code: tokenData.vendor_code,

//           invoice_type,
//           invoice_date: inv_date,

//           gate_entry_no: resICGRN?.gate_entry_no || "",
//           gate_entry_date: resICGRN?.gate_entry_date || "",

//           grn_nos: JSON.stringify(resICGRN.grn_nos),
//           icgrn_nos: JSON.stringify(resICGRN.icgrn_nos),
//           icgrn_total: invoice_value,

//           net_claim_amount,
//           net_with_gst,

//           declaration1,
//           declaration2,
//           associated_po,

//           created_at: getEpochTime()
//         };

//         /**--------------------------DATA SAVING STARTED--------------------------- */

//         // SETTING UP FINAL PAYLOAD FOR MATERIAL BTN SAVE
//         const materialBtnFinalPayloadData = materialBtnFinalPayload(payload, tokenData);
//         console.log("materialBtnFinalPayloadData data", materialBtnFinalPayloadData);

//         const { q, val } = generateQuery(INSERT, BTN_MATERIAL, materialBtnFinalPayloadData);

//         await poolQuery({ client, query: q, values: val });

//         // BTN LIST TABLE INSERT DATA
//         const btnListTablePayload = {
//           ...materialBtnFinalPayloadData,
//           assign_to: doDetails[0]?.u_id || null,
//           assign_by: tokenData.vendor_code,
//         }
//         await addToBTNList(btnListTablePayload, SUBMITTED_BY_VENDOR, client);

//         // UPDATE INVOICE DATE IF INVOICE DATE IS MISSING IN _D SAP TABLE
//         // const inv_date = invoice_date * 1000 || new Date().getTime();
//         // const updatInv = await updateInvoiceDate(client, { inv_date: formatDashedDate(new Date(inv_date).getTime()) }, resICGRN.gate_entry_data);
//         await updateInvoiceDate(client, { inv_date: formatDashedDate(new Date(inv_date).getTime()) }, { ...resICGRN, purchasing_doc_no, invoice_no });

//         // if (associated_po && associated_po !== "" && Array.isArray(associated_po)) {
//         if (associated_po && associated_po !== "") {
//           try {
//             associated_po = JSON.parse(associated_po);
//             const associatePoFunctionList = [];
//             associated_po.forEach((item) => {
//               if (item && item?.a_po !== "") {
//                 payload.purchasing_doc_no = item.a_po;

//                 associatePoFunctionList.push(addToBTNList({ ...payload, assign_to: doDetails[0]?.u_id }, SUBMITTED_BY_VENDOR, client))

//                 const associatePoQuery = generateQuery(INSERT, BTN_MATERIAL, payload);

//                 associatePoFunctionList.push(poolQuery({ client, query: associatePoQuery.q, values: associatePoQuery.val }))

//               }
//             })

//             await Promise.all(associatePoFunctionList);
//           } catch (error) {
//             console.error("associated_po parse error", error, error.message);
//           }
//         }

//         handelMail(tokenData, { ...payload, status: SUBMITTED });
//         resSend(res, true, 200, "BTN number is generated and saved succesfully!", null, null);
//       } else {
//         return resSend(res, false, 200, "BTN is already created under the invoice number.", null, null);
//       }
//     })
//   } catch (error) {
//     console.error("[ERROR] submitBTN", error);
//     resSend(res, true, 500, Message.SOMTHING_WENT_WRONG, null, null);
//   }
// };

const submitBTN = async (req, res) => {
  let client; // Declare client outside so finally block can see it
  try {
    let {
      purchasing_doc_no,
      invoice_no,
      invoice_date,
      invoice_type,
      invoice_value,
      cgst,
      sgst,
      igst,
      debit_note,
      credit_note,
      associated_po,
    } = req.body;

    const tokenData = req.tokenData;
    const declaration1 = "I hereby declare that all the entries are correct";
    const declaration2 = "Whether HSN code, GSTIN, Tax rate is as per PO";

    // 1. INITIAL VALIDATION (Before DB connection even opens)
    const initialPayload = materialBtnInitialPayload(
      { ...req.body, status: SUBMITTED_BY_VENDOR },
      tokenData,
    );
    if (!initialPayload.success) {
      return resSend(
        res,
        false,
        200,
        Message.INVALID_PAYLOAD,
        {},
        initialPayload.errors,
      );
    }

    // 2. START MANUAL TRANSACTION
    client = await poolClient();
    await client.query("BEGIN");

    // 3. CHECK INVOICE
    let check_invoice = await checkInvoice(
      client,
      invoice_no,
      purchasing_doc_no,
    );

    if (
      checkTypeArr(check_invoice) &&
      check_invoice.length > 0 &&
      check_invoice[0].status !== REJECTED
    ) {
      await client.query("ROLLBACK"); // <-- Crucial: Rollback before early return!
      return resSend(
        res,
        false,
        200,
        "BTN is already created under the invoice number.",
        null,
        null,
      );
    }

    let resICGRN = await getGRNICGRNsValue(client, {
      purchasing_doc_no,
      invoice_no,
    });
    if (!resICGRN) {
      await client.query("ROLLBACK"); // <-- Crucial: Rollback before early return!
      return resSend(
        res,
        false,
        200,
        `Invoice number is not valid!`,
        null,
        null,
      );
    }

    if (!invoice_date) {
      await client.query("ROLLBACK"); // <-- Crucial: Rollback before early return!
      return resSend(res, false, 200, `Invoice date missing`, null, null);
    }

    // INVOICE DATE CONVERT TO EPOCH TIME
    const inv_date = new Date(invoice_date).getTime();
    // 4. CALCULATIONS
    let net_claim_amount =
      parseFloat(invoice_value) +
      parseFloat(debit_note) -
      parseFloat(credit_note);
    net_claim_amount = net_claim_amount.toFixed(4);

    const totalGST = parseFloat(cgst) + parseFloat(sgst) + parseFloat(igst);
    let net_with_gst = net_claim_amount;

    if (totalGST > 0) {
      net_with_gst = net_claim_amount * (1 + totalGST / 100);
      net_with_gst = parseFloat(net_with_gst.toFixed(2));
    }

    // 5. FETCH DATA SEQUENTIALLY
    const getDoQuery = getUserDetailsQuery("do", "$1");
    const c_dates = await getContractualDates(client, purchasing_doc_no);
    const a_dates = await getAactualDates(client, purchasing_doc_no);
    const btn_num = await create_btn_no(client);
    const doDetails = await poolQuery({
      client,
      query: getDoQuery,
      values: [purchasing_doc_no],
    });

    // Validate milestones
    const checkMissingMilestone = checkActualDates(c_dates, a_dates);
    if (!checkMissingMilestone.success) {
      await client.query("ROLLBACK"); // <-- Crucial: Rollback before early return!
      return resSend(res, false, 200, "milestone missing", null, null);
    }

    // 6. ASSEMBLE FINAL PAYLOAD
    const contractualDatesData = setContractualDateIntoPayload(c_dates);
    const actualDatesData = setAactualDateIntoPayload(a_dates);

    let payload = {
      ...initialPayload.data,
      ...contractualDatesData,
      ...actualDatesData,
      btn_num,
      vendor_code: tokenData.vendor_code,
      invoice_type,
      invoice_date: inv_date,
      gate_entry_no: resICGRN?.gate_entry_no || "",
      gate_entry_date: resICGRN?.gate_entry_date || "",
      grn_nos: JSON.stringify(resICGRN.grn_nos),
      icgrn_nos: JSON.stringify(resICGRN.icgrn_nos),
      icgrn_total: invoice_value,
      net_claim_amount,
      net_with_gst,
      declaration1,
      declaration2,
      associated_po,
      created_at: getEpochTime(),
    };

    const materialBtnFinalPayloadData = materialBtnFinalPayload(
      payload,
      tokenData,
    );
    const { q, val } = generateQuery(
      INSERT,
      BTN_MATERIAL,
      materialBtnFinalPayloadData,
    );

    // 7. EXECUTE DATABASE WRITES
    await poolQuery({ client, query: q, values: val });

    const btnListTablePayload = {
      ...materialBtnFinalPayloadData,
      assign_to: doDetails[0]?.u_id || null,
      assign_by: tokenData.vendor_code,
    };
    await addToBTNList(btnListTablePayload, SUBMITTED_BY_VENDOR, client);

    await updateInvoiceDate(
      client,
      { inv_date: invoice_date },
      { ...resICGRN, purchasing_doc_no, invoice_no },
    );

    // 8. HANDLE ASSOCIATED POs (Using sequential loop to prevent connection errors)
    if (associated_po && associated_po !== "") {
      try {
        const parsedAssociatedPo = JSON.parse(associated_po);
        for (const item of parsedAssociatedPo) {
          if (item && item?.a_po !== "") {
            payload.purchasing_doc_no = item.a_po;

            await addToBTNList(
              { ...payload, assign_to: doDetails[0]?.u_id },
              SUBMITTED_BY_VENDOR,
              client,
            );
            const associatePoQuery = generateQuery(
              INSERT,
              BTN_MATERIAL,
              payload,
            );
            await poolQuery({
              client,
              query: associatePoQuery.q,
              values: associatePoQuery.val,
            });
          }
        }
      } catch (parseError) {
        console.error("associated_po parse error", parseError);
        // We don't necessarily have to break the whole transaction for a JSON parse error,
        // but if you want to abort on bad JSON, add: await client.query("ROLLBACK"); return resSend(...);
      }
    }

    // 9. COMMIT TRANSACTION IF EVERYTHING SUCCEEDED
    await client.query("COMMIT");

    // Post-commit actions (emails, responses)
    handelMail(tokenData, { ...payload, status: SUBMITTED });
    return resSend(
      res,
      true,
      200,
      `BTN ${btn_num} is generated and saved successfully!`,
      null,
      null,
    );
  } catch (error) {
    console.error("[ERROR] submitBTN", error);
    if (client) await client.query("ROLLBACK"); // Safety net for unexpected code crashes
    return resSend(res, false, 500, Message.SOMTHING_WENT_WRONG, null, null);
  } finally {
    if (client) client.release(); // Always release connection back to pool
  }
};

const submitBTNByDO = async (req, res) => {
  let client;
  try {
    const {
      btn_num,
      purchasing_doc_no,
      net_payable_amount,
      assign_to,
      status,
    } = req.body;
    const tokenData = req.tokenData;

    // 1. FAIL-FAST VALIDATIONS
    if (!btn_num || typeof btn_num !== "string") {
      return resSend(
        res,
        false,
        200,
        "BTN number is missing!",
        "No BTN number",
        null,
      );
    }

    if (
      status !== REJECTED &&
      (!net_payable_amount || Number(net_payable_amount) <= 0)
    ) {
      return resSend(
        res,
        false,
        200,
        "Net payable is missing or invalid.",
        null,
        null,
      );
    }

    // Initialize base payload
    let payload = {
      ...req.body,
      created_by: tokenData.vendor_code,
      created_at: getEpochTime(),
    };

    // 2. DATABASE TRANSACTION INITIALIZATION
    client = await poolClient();
    await client.query("BEGIN");

    // 3. BUSINESS VALIDATION
    const btnCurrentStatus = await btnCurrentDetailsCheck(client, { btn_num });
    if (btnCurrentStatus.isInvalid) {
      await client.query("ROLLBACK"); // Prevent dangling transaction transaction leaks
      return resSend(
        res,
        false,
        200,
        `BTN ${btn_num} ${btnCurrentStatus.message}`,
        btn_num,
        null,
      );
    }

    // 4. HANDLE REJECTED STATUS BRANCH
    if (status === REJECTED) {
      const getVendorQuery = getUserDetailsQuery("vendor_by_po", "$1");
      const vendorDetails = await getQuery({
        query: getVendorQuery,
        values: [purchasing_doc_no],
      });

      payload.assign_to = vendorDetails[0]?.u_id;

      await btnReject(payload, tokenData, client);
      await client.query("COMMIT");

      handelMail(tokenData, { btn_num, status: REJECTED }, BTN_REJECT);
      return resSend(res, true, 200, "Rejected successfully !!", null, null);
    }

    // 5. HANDLE SUBMIT/APPROVE FLOW (Non-Rejected)
    const btnListTableData = await fetchBTNListByPOAndBTNNum(
      btn_num,
      purchasing_doc_no,
    );
    if (!btnListTableData?.status) {
      await client.query("ROLLBACK");
      return resSend(res, false, 200, btnListTableData?.message, null, null);
    }

    const btnListPayload = btnListTableData?.data || {};
    payload.net_claim_amount = btnListPayload?.net_claim_amount;
    payload.btn_type = btnListPayload?.btn_type;
    payload.net_payable_amount = net_payable_amount;
    payload.ld_ge_date = convertToEpoch(new Date(payload.ld_ge_date));

    // SAVE DATA ONE BY ONE BECAUSE OF TRANSITION QUERY

    /** btn_assign table inserted */
    const btnAssignPayload = materialBtnAssignPayload({
      ...payload,
      assign_by: tokenData.vendor_code,
    });
    const assignQuery = await generateInsertUpdateQuery(
      btnAssignPayload,
      BTN_ASSIGN,
      ["btn_num", "purchasing_doc_no"],
    );
    await poolQuery({ client, query: assignQuery.q, values: assignQuery.val });

    /** btn_do table inserted */
    const btnDoPayload = materialBtnForwordToFinacePayload({ ...payload });
    const btnDoQuery = await generateInsertUpdateQuery(
      btnDoPayload,
      BTN_MATERIAL_DO,
      ["btn_num", "purchasing_doc_no"],
    );
    await poolQuery({ client, query: btnDoQuery.q, values: btnDoQuery.val });

    /** btn_list table inserted */
    await insertUpdateToBTNList(client, payload, SUBMITTED_BY_DO);

    /** btn status update*/
    await updateMaterialBtn(client, btn_num, { status: SUBMITTED_BY_DO });

    // 6. EXTERNAL SAP INTEGRATION
    const isSapSynced = await btnSubmitByDo(
      { btn_num, purchasing_doc_no, assign_to },
      tokenData,
    );
    if (!isSapSynced) {
      await client.query("ROLLBACK");
      return resSend(res, false, 200, "SAP not connected.", null, null);
    }

    // 7. TRANSACTION SUCCESS COMMIT
    await client.query("COMMIT");

    handelMail(tokenData, {
      ...payload,
      assign_to,
      status: SUBMIT_BY_DO,
    });

    return resSend(res, true, 200, "BTN has been updated!", null, null);
  } catch (error) {
    console.error("[ERROR] submitBTNByDO:", error);
    if (client) await client.query("ROLLBACK");
    return resSend(
      res,
      false,
      500,
      Message.SOMTHING_WENT_WRONG,
      error.message,
      null,
    );
  } finally {
    if (client) client.release();
  }
};

// const submitBTNByDO = async (req, res) => {
//   let client;
//   try {

//     // EXTRACT SOME DATA FOR USE
//     const { btn_num, purchasing_doc_no, net_payable_amount, assign_to, status } = req.body;
//     const tokenData = req.tokenData;

//     let payload = {
//       ...req.body,
//       created_by: tokenData.vendor_code,
//       created_at: getEpochTime()
//     };

//     if (!btn_num) {
//       return resSend(res, false, 200, "BTN number is missing!", "No BTN number", null);
//     }

//     client = await poolClient();
//     await client.query("BEGIN");
//     // BTN VALIDATION
//     const btnCurrnetStatus = await btnCurrentDetailsCheck(client, {
//       btn_num,
//     });
//     if (btnCurrnetStatus.isInvalid) {
//       return resSend(res, false, 200, `BTN ${btn_num} ${btnCurrnetStatus.message}`, btn_num, null);
//     }

//     if (status === REJECTED) {
//       try {
//         const getVendorQuery = getUserDetailsQuery("vendor_by_po", "$1");
//         const vendorDetails = await getQuery({
//           query: getVendorQuery,
//           values: [purchasing_doc_no],
//         });
//         payload = { ...payload, assign_to: vendorDetails[0]?.u_id };
//         await btnReject(payload, tokenData, client);
//         handelMail(tokenData, { btn_num, status: REJECTED }, BTN_REJECT);
//         await client.query("COMMIT");
//         return resSend(res, true, 200, "Rejected successfully !!", null, null);
//       } catch (error) {
//         await client.query("ROLLBACK");
//         return resSend(res, false, 200, "Rejected error !!", error.message, null);
//       }
//     }

//     /**
//      * DO ACTIVITY SAVE IF BTN STATUS NOT REJECTED
//      */

//     // Check required fields
//     if (!net_payable_amount || Number(net_payable_amount) <= 0) {
//       return resSend(res, false, 200, "Net payable is missing!", null, null);
//     }

//     // GET AND INSERT data into BTN List Table
//     let btnListTableData = await fetchBTNListByPOAndBTNNum(btn_num, purchasing_doc_no);

//     if (!btnListTableData?.status) {
//       return resSend(res, false, 200, btnListTableData?.message, null, null);
//     }

//     const btn_list_payload = btnListTableData?.data || {};

//     btn_list_payload.net_payable_amount = net_payable_amount;

//     payload = {
//       ...payload,
//       net_claim_amount: btn_list_payload?.net_claim_amount,
//       btn_type: btn_list_payload?.btn_type,
//     };

//     // BTN ASSIGN BY FINANCE AUTHORITY
//     const btnAssignPaylaod = materialBtnAssignPayload({ ...payload, assign_by: tokenData.vendor_code });
//     const assignQuery = await generateInsertUpdateQuery(btnAssignPaylaod, BTN_ASSIGN, ["btn_num", "purchasing_doc_no"]);
//     await poolQuery({ client, query: assignQuery.q, values: assignQuery.val });

//     /**
//      * GATE ENTRY LD DATE ADD IN PAYLOAD WITH CONVERTED EPOCH TIMESTAMP
//      */
//     payload.ld_ge_date = convertToEpoch(new Date(payload.ld_ge_date));

//     //*** BTN DO SET DATA ***//

//     const btnDoPaylaod = materialBtnForwordToFinacePayload({ ...payload });

//     /**
//      * BTN LIST TABLE INSERT &
//      * BTN DO TABLE INSERT/UPDATE
//      * BTN TABLE UPDATE
//   */

//     // --- BTN DO TABLE INERT/UPDATE QUERY -- //
//     const btnDoQuery = await generateInsertUpdateQuery(btnDoPaylaod, BTN_MATERIAL_DO, ["btn_num", "purchasing_doc_no"]);

//     // --- BTN TABLE UPDATE QUERY -- //
//     const btnTableUpdatQuery = generateQuery(UPDATE, BTN_MATERIAL_DO, { net_payable_amount }, { btn_num });

//     await Promise.all([
//       insertUpdateToBTNList(client, payload, SUBMITTED_BY_DO),
//       poolQuery({ client, query: btnDoQuery.q, values: btnDoQuery.val }),
//       poolQuery({ client, query: btnTableUpdatQuery.q, values: btnTableUpdatQuery.val }),
//       updateMaterialBtn(client, btn_num, { status: SUBMITTED_BY_DO })
//     ])

//     // ** SAP DATA SEND **//

//     // const sendSap = true // await btnSubmitByDo({ btn_num, purchasing_doc_no, assign_to }, tokenData);
//     const sendSap = await btnSubmitByDo({ btn_num, purchasing_doc_no, assign_to }, tokenData);

//     if (sendSap == false) {
//       await client.query("ROLLBACK");
//       return resSend(res, false, 200, `SAP not connected.`, null, null);
//     } else if (sendSap == true) {
//       await client.query("COMMIT");
//       handelMail(tokenData, {
//         ...payload,
//         assign_to,
//         status: SUBMIT_BY_DO,
//       });
//     }

//     resSend(res, true, 200, "BTN has been updated!", null, null);

//   } catch (error) {
//     console.error("[ERROR] submitBTNByDO", error);
//     if (client) await client.query("ROLLBACK");
//     resSend(res, false, 500, Message.SOMTHING_WENT_WRONG, null, null);
//   } finally {
//     if (client) client.release();
//   }
// }

// const submitBTNByDO = async (req, res) => {
//   try {
//     const client = await poolClient();
//     await client.query("BEGIN");
//     try {
//       let { btn_num, purchasing_doc_no, net_payable_amount, assign_to, status } = req.body;
//       const tokenData = { ...req.tokenData };

//       let payload = {
//         ...req.body,
//         created_by: tokenData?.vendor_code,
//       };

//       if (!btn_num) {
//         return resSend(res, false, 200, "BTN number is missing!", "No BTN number", null);
//       }

//       // BTN VALIDATION
//       const btnCurrnetStatus = await btnCurrentDetailsCheck(client, {
//         btn_num,
//       });
//       if (btnCurrnetStatus.isInvalid) {
//         return resSend(res, false, 200, `BTN ${btn_num} ${btnCurrnetStatus.message}`, btn_num, null);
//       }

//       if (status === REJECTED) {
//         try {
//           const getVendorQuery = getUserDetailsQuery("vendor_by_po", "$1");
//           const vendorDetails = await getQuery({
//             query: getVendorQuery,
//             values: [purchasing_doc_no],
//           });
//           payload = { ...payload, assign_to: vendorDetails[0]?.u_id };
//           await btnReject(payload, tokenData, client);
//           handelMail(tokenData, { btn_num, status: REJECTED }, BTN_REJECT);
//           await client.query("COMMIT");
//           return resSend(res, true, 200, "Rejected successfully !!", null, null);
//         } catch (error) {
//           await client.query("ROLLBACK");
//           return resSend(res, false, 200, "Rejected error !!", error.message, null);
//         }
//       }

//       // Check required fields
//       if (!net_payable_amount) {
//         return resSend(res, false, 200, "Net payable is missing!", null, null);
//       }

//       // Check BTN by BTN Number
//       let checkBTNR = await checkBTNRegistered(btn_num, purchasing_doc_no);
//       let isInserted = false;
//       let whereCondition;
//       if (checkBTNR) {
//         //return resSend(res, false, 200, "BTN is already submitted!", null, null);
//         isInserted = true;
//       }

//       // created at
//       let created_at = getEpochTime(); //new Date().toLocaleDateString();
//       payload = { ...payload, created_at };

//       // INSERT data into BTN List Table
//       let d = await fetchBTNListByPOAndBTNNum(btn_num, purchasing_doc_no);
//       if (d?.status) {
//         let btn_list_payload = d?.data;
//         btn_list_payload.net_payable_amount = net_payable_amount;
//         payload = {
//           ...payload,
//           net_claim_amount: btn_list_payload?.net_claim_amount,
//           btn_type: btn_list_payload?.btn_type,
//         };
//       } else {
//         return resSend(res, false, 200, d?.message, null, null);
//       }

//       // INSERT data into BTN ASSIGN Table
//       let assign_payload = {
//         btn_num,
//         purchasing_doc_no,
//         assign_by: payload.created_by,
//         assign_to,
//         last_assign: true,
//         assign_by_fi: "",
//         assign_to_fi: "",
//         last_assign_fi: false,
//       };

//       let assign_q;
//       if (isInserted == true) {
//         // update
//         whereCondition = {
//           btn_num: assign_payload.btn_num,
//           purchasing_doc_no: assign_payload.purchasing_doc_no,
//         };
//         assign_q = generateQuery(UPDATE, BTN_ASSIGN, assign_payload, whereCondition);
//       } else {
//         //insert
//         assign_q = generateQuery(INSERT, BTN_ASSIGN, assign_payload);
//       }

//       // let assign_q = generateQuery(INSERT, BTN_ASSIGN, assign_payload);
//       await poolQuery({
//         client,
//         query: assign_q.q,
//         values: assign_q.val,
//       });

//       payload.vendor_code = tokenData?.vendor_code;

//       let resBtnList = await insertUpdateToBTNList(client, payload, SUBMITTED_BY_DO, isInserted);
//       if (!resBtnList?.status) {
//         return resSend(res, false, 200, `Something went wrong in BTN List!`, null, null);
//       }
//       // return false;
//       // INSERT Data into btn_do BTN_MATERIAL_DO table

//       delete payload.assign_to;
//       delete payload.p_sdbg_amount;
//       delete payload.p_estimate_amount;
//       delete payload.created_by;
//       delete payload.net_claim_amount;
//       delete payload.btn_type;
//       delete payload.vendor_code;
//       payload.created_at = convertToEpoch(new Date());
//       payload.ld_ge_date = convertToEpoch(new Date(payload.ld_ge_date));

//       let btn_do_q;
//       if (isInserted == true) {
//         // update
//         whereCondition = {
//           btn_num: payload.btn_num,
//           purchasing_doc_no: payload.purchasing_doc_no,
//         };
//         btn_do_q = await generateQuery(UPDATE, BTN_MATERIAL_DO, payload, whereCondition);
//       } else {
//         //insert
//         btn_do_q = await generateQuery(INSERT, BTN_MATERIAL_DO, payload);
//       }
//       //let { q, val } = generateQuery(INSERT, BTN_MATERIAL_DO, payload);
//       const result = await poolQuery({
//         client,
//         query: btn_do_q.q,
//         values: btn_do_q.val,
//       });

//       try {
//         const sendSap = await btnSubmitByDo({ btn_num, purchasing_doc_no, assign_to }, tokenData);

//         if (sendSap == false) {
//           await client.query("ROLLBACK");
//           return resSend(res, false, 200, `SAP not connected.`, null, null);
//         } else if (sendSap == true) {
//           await client.query("COMMIT");
//           handelMail(tokenData, {
//             ...payload,
//             assign_to,
//             status: SUBMIT_BY_DO,
//           });
//         }
//       } catch (error) {
//         console.error("error", error.message);
//       }
//       if (!result.error) {
//         return resSend(res, true, 200, "BTN has been updated!", null, null);
//       } else {
//         // return resSend(res, false, 200, JSON.stringify(result), null, null);
//       }
//     } catch (error) {
//       console.error("[ERROR] submitBTNByDO", error);
//       resSend(res, false, 500, Message.SOMTHING_WENT_WRONG, null, null);
//     } finally {
//       client.release();
//     }
//   } catch (error) {
//     console.error("[ERROR] submitBTNByDO", error);
//     resSend(res, true, 500, Message.SOMTHING_WENT_WRONG, null, null);
//   }

// };

/**
 * BTN DATA SEND TO SAP SERVER WHEN BTN SUBMIT BY FINNANCE AUTHRITY
 * @param {Object} btnPayload
 * @param {Object} tokenData
 */

// eslint-disable-next-line no-unused-vars
async function btnSaveToSap(btnPayload, tokenData) {
  let status = false;
  try {
    let vendorQuery = await getQueryForbtnSaveToSap(btnPayload);
    let btnDetails = await getQuery({
      query: vendorQuery,
      values: [btnPayload.assign_to_fi, btnPayload.btn_num],
    });

    // CALCULATION
    let basic_ammount = parseFloat(btnDetails[0]?.net_claim_amount) || 0;
    // if (btnPayload.btn_type === BTN_CLAIM_AGAINST_PBG) {
    //   basic_ammount = parseFloat(btnDetails[0]?.claim_amount) || 0;
    //   btnDetails[0].net_with_gst = basic_ammount.toFixed(3) || 0;
    // }
    const cgst = parseFloat(btnDetails[0]?.cgst) || 0;
    const igst = parseFloat(btnDetails[0]?.igst) || 0;
    const sgst = parseFloat(btnDetails[0]?.sgst) || 0;

    let cgst_ammount = "0";
    let igst_ammount = "0";
    let sgst_ammount = "0";

    if (basic_ammount && basic_ammount >= 0) {
      basic_ammount = basic_ammount?.toFixed(3);
    }

    if (cgst && basic_ammount) {
      cgst_ammount = parseFloat(basic_ammount * (cgst / 100)).toFixed(3);
    }
    if (igst && basic_ammount) {
      igst_ammount = parseFloat(basic_ammount * (igst / 100)).toFixed(3);
    }
    if (sgst && basic_ammount) {
      sgst_ammount = parseFloat(basic_ammount * (sgst / 100)).toFixed(3);
    }

    const btn_payload = {
      ZBTNO: btnPayload?.btn_num || "", // BTN Number
      // ERDAT: getYyyyMmDd(getEpochTime()), // BTN Create Date
      // ERZET: timeInHHMMSS(), // 134562,  // BTN Create Time
      // ERNAM: tokenData?.vendor_code || "", // Created Person Name
      // LAEDA: "", // Not Needed
      STCD3: btnDetails[0]?.stcd3 || "",
      AENAM: btnDetails[0]?.vendor_name || "", // Vendor Name
      LIFNR: btnDetails[0]?.vendor_code || "", // Vendor Codebtn_v2
      ZVBNO: btnDetails[0]?.invoice_no || "", // Invoice Number
      EBELN: btnDetails[0]?.purchasing_doc_no || "", // PO Number
      ACC: btnDetails[0]?.yard || "", // yard number
      FSTATUS: F_STATUS_FORWARDED_TO_FINANCE, // sap deparment forword status
      // ZRMK1: "Forwared To Finance", // REMARKS
      CGST: cgst_ammount,
      IGST: igst_ammount,
      SGST: sgst_ammount,
      BASICAMT: basic_ammount,
      TOT_AMT: btnDetails[0]?.net_with_gst || "0",
      // TOT_AMT: btnDetails[0]?.net_payable_amount || "0", // changed as discuss with Mr. Naskar and Rana
      ACTIVITY: btnPayload.activity || "", // activity
      FRERDAT: getYyyyMmDd(getEpochTime()),
      FRERZET: timeInHHMMSS(),
      FRERNAM: btnDetails[0]?.assign_to || "", // SET BY DO FINACE AUTHIRITY  PERSON (DO SUBMIT)
      FPERNR1: btnPayload?.assign_to_fi || "", // assigned_to
      FPERNAM: btnDetails[0]?.finance_auth_name || "", // ASSINGEE NAME
    };

    const sapBaseUrl = process.env.SAP_HOST_URL || "http://10.181.1.31:8010";
    const postUrl = `${sapBaseUrl}/sap/bc/zobps_out_api`;
    console.log("btnPayload", postUrl, btn_payload);
    const postResponse = await makeHttpRequest(postUrl, "POST", btn_payload);
    if (
      postResponse.statusCode &&
      postResponse.statusCode >= 200 &&
      postResponse.statusCode <= 226
    ) {
      status = true;
    }
    console.log("POST Response from the server:", postResponse);
  } catch (error) {
    console.error("Error making the request:", error.message);
  } finally {
    return status;
  }
}

/**
 * BTN DATA SEND TO SAP SERVER WHEN BTN SUBMIT BY FINNANCE STAFF
 * @param {Object} btnPayload
 * @param {Object} tokenData
 */
async function btnSubmitByDo(btnPayload, tokenData) {
  let status = false;
  try {
    const vendorQuery = `WITH ranked_assignments AS (
            SELECT
                btn_assign.*,
                ROW_NUMBER() OVER (PARTITION BY btn_assign.btn_num ORDER BY btn_assign.ctid DESC) AS rn
            FROM
                btn_assign
        )
        SELECT 
          btn.btn_num, 
        	btn.purchasing_doc_no,
        	btn.cgst, 
        	btn.sgst, 
        	btn.igst, 
        	btn.net_claim_amount, 
        	btn.invoice_no,
        	btn.vendor_code,
        	ged.invno, 
        	ged.inv_date as invoice_date,
        	vendor.stcd3,
        	users.pernr as finance_auth_id,
        	users.cname as finance_auth_name,
        	vendor.name1 as vendor_name,
        	assign_users.cname as assign_name,
        	ranked_assignments.assign_by as assign_id

        FROM 
            public.btn AS btn
        LEFT JOIN 
            ranked_assignments
            ON (btn.btn_num = ranked_assignments.btn_num
            AND ranked_assignments.rn = 1)
        LEFT JOIN zmm_gate_entry_d as ged
        		ON( btn.purchasing_doc_no = ged.ebeln AND btn.invoice_no = ged.invno)
        LEFT JOIN lfa1 as vendor
        		ON(btn.vendor_code = vendor.lifnr)
        LEFT JOIN pa0002 as users
        		ON(users.pernr::character varying = $1)
        LEFT JOIN pa0002 as assign_users
        		ON(assign_users.pernr::character varying = ranked_assignments.assign_by)
        WHERE 
            btn.btn_num = $2`;

    let btnDetails = await getQuery({
      query: vendorQuery,
      values: [btnPayload.assign_to, btnPayload.btn_num],
    });

    let btn_payload = {
      EBELN: btnPayload.purchasing_doc_no || btnDetails[0]?.purchasing_doc_no, // PO NUMBER
      LIFNR: btnDetails[0]?.vendor_code, // VENDOR CODE
      RERNAM: btnDetails[0]?.vendor_name, // REG CREATOR NAME --> VENDOR NUMBER
      STCD3: btnDetails[0]?.stcd3, // VENDOR GSTIN NUMBER
      ZVBNO: btnDetails[0]?.invno, // GATE ENTRY INVOCE NUMBER
      VEN_BILL_DATE: getYyyyMmDd(
        new Date(btnDetails[0]?.invoice_date).getTime(),
      ), // GATE ENTRY INVOICE DATE
      PERNR: tokenData.vendor_code, // DO ID
      ZBTNO: btnPayload.btn_num, //  BTN NUMBER
      ERDAT: btnPayload.btn_num.substring(0, 8), //getYyyyMmDd(getEpochTime()), // VENDOR BILL SUBMIT DATE
      ERZET: timeInHHMMSS(), // VENDOR BILL SUBMIT TIME
      RERDAT: btnPayload.btn_num.substring(0, 8), // getYyyyMmDd(getEpochTime()), //REGISTRATION NUMBER --- VENDOR BILL SUBMIT DATE
      RERZET: timeInHHMMSS(), //REGISTRATION NUMBER --- VENDOR BILL SUBMIT TIME
      DPERNR1: tokenData.vendor_code, // DO NUMBER
      DRERDAT1: getYyyyMmDd(getEpochTime()), // DEPARTMETN RECECE DATE --> WHEN SUBMIT DO
      DRERZET1: timeInHHMMSS(), // DEPARTMETN RECECE TIME --> WHEN SUBMIT DO
      DRERNAM1: tokenData.name, // DEPARTMETN RECECE DO ID --> WHEN SUBMIT DO
      DAERDAT: getYyyyMmDd(getEpochTime()), // DEPARTMENT APPROVAL DATE --> DO SUBMISSION DATE
      DAERZET: timeInHHMMSS(), // DEPARTMENT APPROVAL DATE --> DO SUBMISSION TIME
      DAERNAM: tokenData.name, // DEPARTMENT APPROVAL NAME --> DO NAME

      // DEERDAT: "", // REJECTION DATE
      // DEERZET: timeInHHMMSS(), // REJECTION TIME
      // DEERNAM: "", // DO ( WHO REJECTED)
      // ZRMK2: "", // "REJECTION REASON REMARKS / DO SUBMIT REMARKS"

      DFERDAT: getYyyyMmDd(getEpochTime()), // DO SUBMIT DATE
      DEFRZET: timeInHHMMSS(), // DO SUBMIT TIEM
      DEFRNAM: tokenData.name || "", // DO SUBMIT NAME ( DO NAME)
      DSTATUS: "4", // "4"
      DPERNR: tokenData.vendor_code, //  (DO)

      FPRNR1: btnPayload.assign_to || "", // FINACE AUTHIRITY ID ( )
      FPRNAM1: btnDetails[0]?.assign_name || "", // FINANCE
      FSTATUS: "", // BLANK STATUS
    };

    /**
     * IF BTN REJECTED BY DO
     */
    if (btnPayload.status === REJECTED) {
      btn_payload = {
        ...btn_payload,
        DEERDAT: getYyyyMmDd(getEpochTime()), // REJECTION DATE
        DEERZET: timeInHHMMSS(), // REJECTION TIME
        DEERNAM: tokenData.name, // DO ( WHO REJECTED)
        ZRMK2: btnPayload.rejectedMessage || "Rejeced by DO", // "REJECTION REASON REMARKS / DO SUBMIT REMARKS"
        DSTATUS: "2", // rejected status
      };
    }

    const sapBaseUrl = process.env.SAP_HOST_URL || "http://10.181.1.31:8010";
    const postUrl = `${sapBaseUrl}/sap/bc/zobps_do_out`;
    console.log("btnPayload--", postUrl, btn_payload);
    const postResponse = await makeHttpRequest(postUrl, "POST", btn_payload);
    if (
      postResponse.statusCode &&
      postResponse.statusCode >= 200 &&
      postResponse.statusCode <= 226
    ) {
      status = true;
    }
    console.log("POST Response from the server:", postResponse);
  } catch (error) {
    console.error("Error making the request:", error.message);
  } finally {
    return status;
  }
}

/**
 * GET VALUE BY INVOICE NUMBER
 * LOGIC GE_D INVOICE_NO
 * -> JOIN(_D.ZMBLNR == MSEG.MBLNR)  // GRN DETAILS
 * -> JOIN (MSEG.MBLNR = QALS.MBLNR) // ICGRN DETAILS
 *
 * BOTH getGrnIcgrnByInvoice && getGRNICGRNsValue FUNCTION ARE SAME,
 * IF CHANGE ANY ONE OF THOSE FUNCTION, CHANGE BOTH
 *
 * @param {*} req
 * @param {*} res
 * @returns
 */

const getExtractedData = async (req, res) => {
  let client;

  try {
    // --------------------------------------------------
    // 1. Validate uploaded file
    // --------------------------------------------------

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No PDF file uploaded",
      });
    }

    const { invoice_date } = req.body;

    console.log("File:", req.file.originalname);
    console.log("Invoice Date:", invoice_date);

    console.log("File received:", req.file.originalname);
    console.log("Mimetype:", req.file.mimetype);
    console.log("Size:", req.file.size);
    console.log("Path:", req.file.path);

    client = await poolClient();
    // #################### Save uploaded file in database starts ####################

    // const query = `INSERT INTO files
    //                             (id, file_name, file_path, used)
    //                         VALUES
    //                             ($1, $2, $3, $4)`;

    // const values = [
    //   "4000234573", // id
    //   req.file.originalname, // file_name
    //   req.file.path, // file_path
    //   "N", // used
    //   // "2026-08-18", // created_at
    //   // "1234", // created_by
    // ];

    // const data = await executeQuery({ client, query: query, values: values });
    // console.log(5454, "File saved successfully", data);
    // //   try {
    // //         const result = await query(sql, values);

    // //         console.log("File saved successfully:", result.rows[0]);

    // //       } catch (error) {
    // //         console.error("Error saving file details:", error);

    // //         return res.status(500).json({
    // //           success: false,
    // //           message: "Failed to save file details",
    // //           error: error.message,
    // //         });

    /*
    Save with existing function
    */
    // #################### Save uploaded file in database Ends ######################

    // --------------------------------------------------
    // 2. Read uploaded file
    // --------------------------------------------------

    const fileBuffer = await fs.readFile(req.file.path);

    // --------------------------------------------------
    // 3. Call extraction API
    // --------------------------------------------------
    const formData = new FormData();

    // Converting Buffer -> Blob
    const fileBlob = new Blob([fileBuffer], {
      type: req.file.mimetype || "application/pdf",
    });

    formData.append("File", fileBlob, req.file.originalname);

    const response = await fetch("http://localhost:8000/extract", {
      method: "POST",
      body: formData,
    });

    const result = await response.json();

    if (!result) {
      console.error("Extraction API error:", error);
      return resSend(res, false, 500, Message.SOMTHING_WENT_WRONG, "");
    }

    // --------------------------------------------------
    // 4. Get po & invoice number
    // --------------------------------------------------

    const poNumber = result.data.po_no;
    const invoiceNo = result.data.invoice_no;

    if (!invoiceNo) {
      return res.status(400).json({
        success: false,
        message: "Invoice number not found in extracted data",
      });
    }

    // --------------------------------------------------
    // 5. Rename uploaded file
    // --------------------------------------------------

    const oldPath = req.file.path;
    const extension = path.extname(req.file.originalname).toLowerCase();

    const normalizedInvoiceNo = String(invoiceNo).replace(
      /[^a-zA-Z0-9_-]/g,
      "_",
    );

    const uniqueId = `${Date.now()}-${Math.floor(performance.now() * 1000)}`;
    const newFileName = `${normalizedInvoiceNo}-${uniqueId}${extension}`;

    const newPath = path.join(path.dirname(oldPath), newFileName);

    await fs.rename(oldPath, newPath);

    console.log("New FileName:", newFileName);
    console.log("Old file:", oldPath);
    console.log("New file:", newPath);
    // const uniqueId = BigInt(Date.now()) * 1000n + BigInt(Math.floor(performance.now() * 1000));

    // ###############  Save extracted Data in temp file Starts ##################

    const query = `
          INSERT INTO temp_invoices (
            company_name,
            invoice_no,
            invoice_date,
            po_no,
            gst_no,
            sub_total,
            file_name,
            file_path
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)

          ON CONFLICT (invoice_no)
          DO UPDATE SET
            company_name = EXCLUDED.company_name,
            invoice_date = EXCLUDED.invoice_date,
            po_no = EXCLUDED.po_no,
            gst_no = EXCLUDED.gst_no,
            sub_total = EXCLUDED.sub_total,
            file_name = EXCLUDED.file_name,
            file_path = EXCLUDED.file_path

          RETURNING *;
        `;

    const values = [
      result.data.company_name || null,
      result.data.invoice_no || null,
      result.data.invoice_date || "2026-08-20",
      result.data.po_no || null,
      result.data.gst_no || null,
      result.data.subtotal || null,
      newFileName,
      newPath,
    ];

    // console.log(606, values);
    const dbResult = await client.query(query, values);

    // ###############  Save extracted Data in temp file Ends ##################

    // #################### validation checking with database table starts ####################

    const gstNo = result.data.gst_no;
    // const invoiceDate = result.data.invoice_date ;
    // const invoiceDate = "2026-07-19";
    const invoiceDate = invoice_date;

    if (!gstNo) {
      return res.status(400).json({
        success: false,
        message: "GST number not found in extracted data",
      });
    }

    if (!invoiceDate) {
      return res.status(400).json({
        success: false,
        message: "Invoice date not found in extracted data",
      });
    }

    //check extracted gstNo is in gst_records table

    const gstQuery = `
        SELECT
          gstrec_id,
          gst_no,
          vendor_code,
          vendor_name,
          gstr_start_date,
          gstr_end_date
        FROM gst_records
        WHERE gst_no = $1;
      `;

    const gstResult = await getQuery({ query: gstQuery, values: [gstNo] });

    if (gstResult.length === 0) {
      return {
        valid: false,
        status: 400,
        message: "GST number does not exist in GST records",
        gst_no: gstNo,
      };
    }
    if (gstResult.length > 0) {
      /* 
      one gst can have multiple row with different date range
      check if ok then find extracted gst_date >start_date and <end_date of table row record
        if satisfied then -->Go forward
        else return with message GST Return is out of date range
  
      */
      const gstPeriodQuery = `
      SELECT
          gstrec_id,
          gst_no,
          vendor_code,
          vendor_name,
          gstr_start_date,
          gstr_end_date
        FROM gst_records
        WHERE gst_no = $1
          AND $2::date >= gstr_start_date
          AND $2::date <= gstr_end_date
        ORDER BY gstr_end_date DESC
        LIMIT 1
      `;

      const gstPeriodResult = await getQuery({
        query: gstPeriodQuery,
        values: [gstNo, invoiceDate],
      });

      if (gstPeriodResult.length === 0) {
        return res.status(400).json({
          success: false,
          message: "GST return is out of date range for invoice date",
          gst_no: gstNo,
          invoice_date: invoiceDate,
          gst_records: gstPeriodResult,
        });
      }

      const gstRecord = gstPeriodResult[0];

      if (!gstRecord) {
        return res.status(400).json({
          success: false,
          message: "GST record not found for invoice date",
          gst_no: gstNo,
          invoice_date: invoiceDate,
        });
      }

      const grnData = await getGrnIcgrnByInvoiceService(
        client,
        poNumber,
        invoiceNo,
        // "4700026721",
        // "302",
      );

      if (grnData.success === false)
        return resSend(res, false, 400, grnData.message);

      const fechedGrnData = grnData?.data?.icgrn_nos;

      let totalAmount = 0;

      fechedGrnData.forEach((e) => {
        totalAmount += Number(e.accepted_quantity) * Number(e.price);
      });
      // console.log(302, grnData.data.icgrn_nos, totalAmount);

      if (totalAmount != 20000) {
        // return res.status(409).json({
        //   success: false,
        //   message: "Total claimed amount is not matched with ICGRN report",
        // });

        return resSend(
          res,
          true,
          200,
          "Total claimed amount is not matched with ICGRN report",
        );
      }
      return resSend(res, true, 200, grnData.message, {
        extractedData: result,
        grnData,
      });

      /*
       if gst records validation satisfied then check for amount matching
      if amount does not match then return with error else go for btn submission
      */
    }

    // #################### validation checking with database table Ends ######################
  } catch (error) {
    console.error("Error making the request:", error.message, error.stack);

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  } finally {
    if (client) {
      client.release();
    }
  }
};
const getGrnIcgrnByInvoice = async (req, res) => {
  console.log(5, req);
  let client;
  try {
    client = await poolClient();
    const { purchasing_doc_no, invoice_no } = req.body;
    let total_price = 0;
    let total_quantity = 0;
    let totalUnitPrice = 0;
    // let totalReturnQuantity = 0;
    // let totalReturnPrice = 0;
    if (!purchasing_doc_no || !invoice_no) {
      return resSend(
        res,
        true,
        200,
        "Please send a valid payload!",
        null,
        null,
      );
    }
    let gate_entry_v = await getGateEntryDetails(client, [
      purchasing_doc_no,
      invoice_no,
    ]);

    if (!gate_entry_v.length) {
      return resSend(
        res,
        false,
        200,
        "No record found under the invoice number!",
        { purchasing_doc_no, invoice_no },
        null,
      );
    }
    const grn_values = gate_entry_v.map((el) => el.grn_no);
    // gate_entry_v = gate_entry_v[0];

    // CHECK IF VALUE NEED ONLY FROM GRN
    const grn_value = (await getGrnDetails(client, grn_values)) || [];
    if (!grn_value.length) {
      return resSend(
        res,
        false,
        200,
        "Kindly complete the GRN for further processing of the BTN.",
        grn_value,
        gate_entry_v,
      );
    }

    // FOR GET VALID GE IF SAME GE OF MULTIPLE INV NO
    let geDetails;
    for (const grn of grn_value) {
      const ge = gate_entry_v.find(
        (gateentry) => gateentry.grn_no == grn.grn_no,
      );
      if (ge) {
        geDetails = ge;
        break;
      }
    }

    if (geDetails) {
      gate_entry_v = geDetails;
    } else {
      gate_entry_v = gate_entry_v[0];
    }

    /// get total grn value///

    const onlyGrnItems = grn_value.filter(
      (el) => el.grn_reqired == null || el.grn_reqired == "",
    );
    const icgrnItems = grn_value.filter((el) => el.grn_reqired == "X");
    const icgrnNosArr = icgrnItems.map((igNo) => igNo.grn_no);
    const grnNosArr = grn_value.map((igNo) => igNo.grn_no);

    const icgrn_no = await getIcgrnDetails(client, icgrnNosArr, {
      EBELN: purchasing_doc_no,
    });
    if (icgrnItems.length && !icgrn_no.length) {
      return resSend(
        res,
        false,
        200,
        "Kindly complete the ICGRN for further processing of the BTN.",
        { grn_value, icgrn_no },
      );
    }

    if (icgrn_no.length !== icgrnItems.length) {
      return resSend(res, false, 200, "Plese check some item ICGRN pending!", {
        grn_value,
        icgrn_no,
      });
    }

    // const icgrn_no = await getIcgrnDetails(client, grn_values);
    // if (icgrn_no.length == 0) {
    //   return resSend(res, false, 200, "Plese do ICGRN to Process BTN", null, null);
    // }

    const associatePoList = await getAssociatePoList(client, [
      purchasing_doc_no,
      invoice_no,
    ]);

    if (icgrn_no.length) {
      const totals = calculateTotals(icgrn_no);
      total_price = totals.totalPrice || 0;
      total_quantity = totals.totalQuantity;
    }
    let CAPEX_IND = false;
    if (onlyGrnItems.length) {
      const totals = calculateTotalGrnValue(onlyGrnItems);
      CAPEX_IND =
        totals.totalPrice.toFixed(2) !== totals.totalUnitPrice.toFixed(2);
      totalUnitPrice = totals.totalUnitPrice.toFixed(2);
      total_price += totals.totalPrice || 0;
      total_quantity += totals.totalQuantity;
    }

    // HANDLE MOMENTYPE 122 AN 123
    const returnedGrns = await getReturnedGrnDetails(client, grnNosArr);
    if (returnedGrns.length) {
      const calcReturnGrnDetails = calculateTotalGrnValue(returnedGrns);
      // totalReturnPrice = (calcReturnGrnDetails.totalReturnPrice).toFixed(3);
      // totalReturnQuantity = (calcReturnGrnDetails.totalReturnQuantity).toFixed(3);
      total_price = total_price - calcReturnGrnDetails.totalReturnPrice;
      total_quantity =
        total_quantity - calcReturnGrnDetails.totalReturnQuantity;
    }

    gate_entry_v.total_price = parseFloat(total_price.toFixed(2));
    gate_entry_v.total_quantity = parseFloat(total_quantity.toFixed(2));
    gate_entry_v.icgrn_nos = icgrn_no;
    gate_entry_v.grn_nos = grn_value;
    gate_entry_v.returnedGrns = returnedGrns;
    gate_entry_v.associatePoList = associatePoList;
    gate_entry_v.CAPEX_IND = CAPEX_IND;
    gate_entry_v.totalUnitPrice = totalUnitPrice;

    resSend(res, true, 200, "Invoice details fetched.", gate_entry_v, null);
  } catch (error) {
    console.error("Error making the request:", error.message, error.stack);
    resSend(res, true, 400, "error!", error.message, null);
  } finally {
    if (client) {
      client.release();
    }
  }
};

/**
 * getGRNICGRNsValue FUNCTION TOTAL GRN ICGRN DETAILS
 *
 * BOTH getGrnIcgrnByInvoice && getGRNICGRNsValue FUNCTION ARE SAME
 * CHECK BEFORE CHANGES AND DO SAME FOR FUNCTION getGrnIcgrnByInvoice & getGRNICGRNsValue
 * @param {*} data
 * @returns
 */
const getGRNICGRNsValue = async (client, data) => {
  // let client;
  // client = await poolClient();
  const { purchasing_doc_no, invoice_no } = data;
  let total_price = 0;
  let total_quantity = 0;
  // let totalReturnQuantity = 0;
  // let totalReturnPrice = 0;
  if (!purchasing_doc_no || !invoice_no) {
    return null;
    // return resSend(res, true, 200, "Please send a valid payload!", null, null);
  }
  let gate_entry_v = await getGateEntryDetails(client, [
    purchasing_doc_no,
    invoice_no,
  ]);

  if (!gate_entry_v.length) {
    return null;
    // return resSend(res, false, 200, "No record found under the invoice number!", null, null);
  }
  const grn_values = gate_entry_v.map((el) => el.grn_no);
  gate_entry_v = gate_entry_v[0];

  // CHECK IF VALUE NEED ONLY FROM GRN
  const grn_value = (await getGrnDetails(client, grn_values)) || [];
  if (!grn_value.length) {
    return null;
    // return resSend(res, false, 200, "Please do GRN/ICGRN to process BTN.", null, null);
  }

  /// get total grn value///

  const onlyGrnItems = grn_value.filter(
    (el) => el.grn_reqired == null || el.grn_reqired == "",
  );
  const icgrnItems = grn_value.filter((el) => el.grn_reqired == "X");

  const icgrnNosArr = icgrnItems.map((igNo) => igNo.grn_no);
  const icgrn_no = await getIcgrnDetails(client, icgrnNosArr, {
    EBELN: purchasing_doc_no,
  });
  if (icgrnItems.length && !icgrn_no.length) {
    return null;
    // return resSend(res, false, 200, "Plese do ICGRN to Process BTN.", null, null);
  }

  if (icgrn_no.length !== icgrnItems.length) {
    return null;
    // return resSend(res, false, 200, "Plese check some item ICGRN pending!", null, null);
  }

  // const icgrn_no = await getIcgrnDetails(client, grn_values);
  // if (icgrn_no.length == 0) {
  //   return resSend(res, false, 200, "Plese do ICGRN to Process BTN", null, null);
  // }
  const associatePoList = await getAssociatePoList(client, [
    purchasing_doc_no,
    invoice_no,
  ]);

  if (icgrn_no.length) {
    const totals = calculateTotals(icgrn_no);
    total_price = totals.totalPrice || 0;
    total_quantity = totals.totalQuantity;
  }
  if (onlyGrnItems.length) {
    const totals = calculateTotalGrnValue(onlyGrnItems);
    total_price += totals.totalUnitPrice || 0;
    total_quantity += totals.totalQuantity;
  }

  // HANDLE MOMENTYPE 122 AN 123
  const returnedGrns = await getReturnedGrnDetails(client, [purchasing_doc_no]);
  if (returnedGrns.length) {
    const calcReturnGrnDetails = calculateTotalGrnValue(returnedGrns);
    // totalReturnPrice = (calcReturnGrnDetails.totalReturnPrice).toFixed(3);
    // totalReturnQuantity = (calcReturnGrnDetails.totalReturnQuantity).toFixed(3);
    total_price = total_price - calcReturnGrnDetails.totalReturnPrice;
    total_quantity = total_quantity - calcReturnGrnDetails.totalReturnQuantity;
  }

  gate_entry_v.total_price = parseFloat(total_price.toFixed(2));
  gate_entry_v.total_quantity = parseFloat(total_quantity.toFixed(2));
  gate_entry_v.icgrn_nos = icgrn_no;
  gate_entry_v.grn_nos = grn_value;
  gate_entry_v.associatePoList = associatePoList;
  return gate_entry_v;
};

const timeInHHMMSS = () => {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const seconds = String(now.getSeconds()).padStart(2, "0");

  return hours + minutes + seconds;
};

// eslint-disable-next-line no-unused-vars
async function handelMail(tokenData, payload, event) {
  try {
    let emailUserDetailsQuery;
    let emailUserDetails;
    let dataObj = payload;

    if (
      tokenData.user_type == USER_TYPE_VENDOR &&
      payload.status == SUBMITTED
    ) {
      emailUserDetailsQuery = getUserDetailsQuery("vendor_and_do", "$1");

      emailUserDetails = await getQuery({
        query: emailUserDetailsQuery,
        values: [payload.purchasing_doc_no],
      });
      await sendMail(
        BTN_UPLOAD_CHECKLIST,
        dataObj,
        { users: emailUserDetails },
        BTN_UPLOAD_CHECKLIST,
      );
    }

    if (
      tokenData.user_type != USER_TYPE_VENDOR &&
      payload.status == FORWARD_TO_FINANCE
    ) {
      emailUserDetailsQuery = getUserDetailsQuery("venode_by_po");
      emailUserDetails = await getQuery({
        query: emailUserDetailsQuery,
        values: [payload.purchasing_doc_no],
      });
      await sendMail(
        BTN_FORWORD_FINANCE,
        dataObj,
        { users: emailUserDetails },
        BTN_FORWORD_FINANCE,
      );
    }
    if (
      tokenData.user_type != USER_TYPE_VENDOR &&
      payload.status == STATUS_RECEIVED
    ) {
      emailUserDetailsQuery = getUserDetailsQuery("finance_staff", "$1");
      emailUserDetails = await getQuery({
        query: emailUserDetailsQuery,
        values: [payload.assign_to_fi],
      });
      await sendMail(
        BTN_ASSIGN_TO_STAFF,
        dataObj,
        { users: emailUserDetails },
        BTN_ASSIGN_TO_STAFF,
      );
    }

    let buildQuery = "";

    if (tokenData.user_type != USER_TYPE_VENDOR && payload.status == REJECTED) {
      // emailUserDetailsQuery = getUserDetailsQuery('vendor_by_po', '$1');
      emailUserDetailsQuery = getUserDetailsQuery("vendor_by_btn", "$1");

      emailUserDetails = await getQuery({
        query: emailUserDetailsQuery,
        values: [payload.btn_num],
      });
      dataObj = { ...dataObj, vendor_name: emailUserDetails[0]?.u_name };
      await sendMail(
        BTN_REJECT,
        dataObj,
        { users: emailUserDetails },
        BTN_REJECT,
      );
    }
    if (tokenData.user_type != USER_TYPE_VENDOR && payload.status == ASSIGNED) {
      // emailUserDetailsQuery = getUserDetailsQuery('vendor_by_po', '$1');
      emailUserDetailsQuery = "SELECT * FROM (";
      buildQuery += getUserDetailsQuery("vendor_by_po", "$1");
      buildQuery += "UNION";
      buildQuery += getUserDetailsQuery("assingee", "$2");
      buildQuery += ") AS mail_info";

      emailUserDetails = await getQuery({
        query: emailUserDetailsQuery,
        values: [payload.purchasing_doc_no],
      });
      dataObj = { ...dataObj, vendor_name: emailUserDetails[0]?.u_name };
      await sendMail(
        BTN_RETURN_DO,
        dataObj,
        { users: emailUserDetails },
        BTN_RETURN_DO,
      );
    }
    if (
      tokenData.user_type != USER_TYPE_VENDOR &&
      payload.status == SUBMIT_BY_DO
    ) {
      // emailUserDetailsQuery = getUserDetailsQuery('vendor_by_po', '$1');

      emailUserDetailsQuery = "SELECT * FROM (";
      buildQuery += emailUserDetailsQuery;
      buildQuery += getUserDetailsQuery("vendor_by_po", "$1");
      buildQuery += "UNION";
      buildQuery += getUserDetailsQuery("finance_authority", "$2");
      buildQuery += ") AS mail_info";

      emailUserDetails = await getQuery({
        query: buildQuery,
        values: [payload.purchasing_doc_no, parseInt(payload.assign_to)],
      });
      dataObj = { ...dataObj, vendor_name: emailUserDetails[0]?.u_name };
      await sendMail(
        BTN_FORWORD_FINANCE,
        dataObj,
        { users: emailUserDetails },
        BTN_FORWORD_FINANCE,
      );
    }
  } catch (error) {
    console.error("handelMail btn", error.toString(), error.stack);
  }
}

const assignToFiStaffHandler = async (req, res) => {
  let client;
  try {
    const { btn_num, purchasing_doc_no, assign_to_fi } = req.body;
    const tokenData = { ...req.tokenData };

    client = await poolClient();
    await client.query("BEGIN");
    const btnCurrnetStatus = await btnCurrentDetailsCheck(client, {
      btn_num,
      status: STATUS_RECEIVED,
    });

    if (btnCurrnetStatus.isInvalid) {
      return resSend(
        res,
        false,
        200,
        `BTN ${btn_num} ${btnCurrnetStatus.message}`,
        btn_num,
        null,
      );
    }

    if (
      !btn_num ||
      btn_num === "" ||
      !purchasing_doc_no ||
      purchasing_doc_no === "" ||
      !assign_to_fi ||
      assign_to_fi === ""
    ) {
      return resSend(
        res,
        false,
        200,
        "Assign To is the mandatory!",
        null,
        null,
      );
    }

    const assign_q = `SELECT * FROM ${BTN_ASSIGN} WHERE btn_num = $1 and last_assign = $2`;
    let assign_fi_staff_v = await poolQuery({
      client,
      query: assign_q,
      values: [btn_num, true],
    });
    if (!checkTypeArr(assign_fi_staff_v)) {
      return resSend(
        res,
        false,
        200,
        "You're not authorized to perform the action!",
        null,
        null,
      );
    }

    const whereCon = {
      btn_num: btn_num,
    };
    const payload = {
      assign_by_fi: tokenData?.vendor_code,
      assign_to_fi: assign_to_fi,
      last_assign_fi: true,
    };

    let { q, val } = generateQuery(UPDATE, BTN_ASSIGN, payload, whereCon);
    await poolQuery({ client, query: q, values: val });

    let btn_list_q = ` SELECT * FROM btn_list WHERE btn_num = $1 
	                      AND purchasing_doc_no = $2
	                      AND (status = $3 or status = $4)
                        ORDER BY created_at DESC`;
    let btn_list = await poolQuery({
      client,
      query: btn_list_q,
      values: [
        btn_num,
        purchasing_doc_no,
        SUBMITTED_BY_DO,
        SUBMITTED_BY_CAUTHORITY,
      ],
    });

    if (btn_list.length < 0) {
      return resSend(
        res,
        false,
        200,
        "Vendor have to submit BTN first.",
        btn_list,
        null,
      );
    }

    let data = {
      btn_num,
      purchasing_doc_no,
      net_claim_amount: btn_list[0]?.net_claim_amount,
      net_payable_amount: btn_list[0]?.net_payable_amount,
      vendor_code: tokenData.vendor_code,
      created_at: getEpochTime(),
      btn_type: btn_list[0]?.btn_type,
      assign_by: tokenData?.vendor_code,
      assign_to: assign_to_fi,
    };

    await updateMaterialBtn(client, btn_num, { status: STATUS_RECEIVED });
    const result = await addToBTNListClient(client, data, STATUS_RECEIVED);

    if (result?.status) {
      handelMail(tokenData, {
        ...req.body,
        assign_to_fi,
        status: STATUS_RECEIVED,
      });
      try {
        const sendSap = await btnSaveToSap(
          { ...req.body, ...payload },
          tokenData,
        );
        if (sendSap == false) {
          await client.query("ROLLBACK");

          return resSend(res, false, 200, `SAP not connected.`, null, null);
        } else if (sendSap == true) {
          await client.query("COMMIT");
        }
      } catch (error) {
        console.error("[ERROR] btnSaveToSap", error.message);
      }
      resSend(res, true, 200, "Finance Staff has been assigned!", null, null);
    } else {
      resSend(res, false, 200, "Something went wrong in BTN List", null, null);
    }
  } catch (error) {
    console.error("[ERROR] btn assingToStaff", error);
    if (client) await client.query("ROLLBACK");
    resSend(res, false, 500, Message.SOMTHING_WENT_WRONG, null, null);
  } finally {
    if (client) client.release();
  }
};

/**
 * CHECK IF CONTRACTUAL SUBMISSION HAD
 * BUT ACTUCAL SUBMISSION DATE MISSING OR NOT SUBMIT
 * @param c_dates Array
 * @param a_dates Array
 * @returns Object
 */

function checkActualDates(c_dates, a_dates) {
  // const arr = new Set([parseInt(MID_SDBG), parseInt(MID_DRAWING), parseInt(MID_QAP), parseInt(MID_ILMS)]);
  const arr = new Set([
    parseInt(MID_DRAWING),
    parseInt(MID_QAP),
    parseInt(MID_ILMS),
  ]);
  const c_dates_filter = c_dates.filter((el) => arr.has(parseInt(el.MID)));
  const a_dates_filter = a_dates.filter((el) => arr.has(parseInt(el.MID)));
  const mtextObj = {
    [MID_SDBG]: "SDBG",
    [MID_DRAWING]: "Drawing",
    [MID_QAP]: "QAP",
    [MID_ILMS]: "ILMS",
  };
  for (const item of c_dates_filter) {
    const i = a_dates_filter.findIndex(
      (el) => parseInt(el.MID) == parseInt(item.MID),
    );
    if (i < 0) {
      return {
        success: false,
        msg: `Please submit ${mtextObj[item.MID]} to process BTN !`,
      };
    }
  }

  return { success: true, msg: "No milestone missing" };
}

async function btnReject(data, tokenData, client) {
  const obj = {
    btn_num: data.btn_num,
    remarks: data.remarks,
    assign_by: data.created_by,
    assign_to: data.assign_to,
  };

  // const { q, val } = generateQuery(UPDATE, BTN_MATERIAL, { status: REJECTED }, obj);
  // const result = await query({ query: q, values: val });

  await updateBtnListTable(client, obj);
  await updateMaterialBtn(client, data.btn_num, { status: REJECTED });
  const sendSap = await btnSubmitByDo({ ...data, assign_to: null }, tokenData);

  if (!sendSap || sendSap == false) {
    console.log("sendSap", sendSap);
    throw new Error("Sap Not connented");
  }
  return { btn_num: data.btn_num };
}

const updateBtnListTable = async (client, data) => {
  const getLatestDataQuery = `
      SELECT 
          btn_num, 
          purchasing_doc_no, 
          net_claim_amount, 
          net_payable_amount, 
          vendor_code, 
          status, 
          btn_type,
          created_at
      FROM public.btn_list where btn_num = $1 ORDER BY created_at DESC LIMIT 1`;
  const lasBtnDetails = await poolQuery({
    client,
    query: getLatestDataQuery,
    values: [data.btn_num],
  });
  let btnListTablePaylod = { btn_num: data.btn_num };

  if (lasBtnDetails.length) {
    btnListTablePaylod = {
      ...lasBtnDetails[0],
      ...btnListTablePaylod,
      assign_by: data?.assign_by,
      assign_to: data?.assign_to,
      status: REJECTED,
      created_at: getEpochTime(),
    };
    if (data.remarks) {
      btnListTablePaylod.remarks = data.remarks;
    }
    const { q, val } = generateQuery(INSERT, "btn_list", btnListTablePaylod);
    await poolQuery({ client, query: q, values: val });
    // if (data.fstatus == "5" || data.fstatus == 5) {
    //     await handelMail(btnListTablePaylod, client);
    // }
  } else {
    // console.log("NO BTN FOUND IN LIST TO BE UPDATED");
  }
};

async function btnCurrentDetailsCheck(client, data) {
  let btnstausCount = `SELECT btn_num, status  FROM btn_list WHERE 1 = 1`;
  const valueArr = [];
  let count = 0;
  if (data.btn_num) {
    btnstausCount += ` AND btn_num = $${++count}`;
    valueArr.push(data.btn_num);
  }
  // if (data.status) {
  //   btnstausCount += ` AND status = $${++count}`;
  //   valueArr.push(data.status);
  // }

  const checkStatus = new Set([
    STATUS_RECEIVED,
    REJECTED,
    BTN_STATUS_BANK,
    BTN_STATUS_HOLD_TEXT,
    BTN_STATUS_PROCESS,
    SUBMIT_BY_DO,
    BTN_STATUS_PAYMENT_DONE_TEXT,
  ]);

  if (data.status === STATUS_RECEIVED) {
    checkStatus.add(BTN_STATUS_DRETURN);
    checkStatus.add(SUBMITTED_BY_VENDOR);
    checkStatus.delete(STATUS_RECEIVED);
    checkStatus.delete(SUBMIT_BY_DO);
  }

  btnstausCount += " ORDER BY created_at DESC";
  btnstausCount += " LIMIT 1";

  const result = await poolQuery({
    client,
    query: btnstausCount,
    values: valueArr,
  });
  let isInvalid = false;

  // const result = [{ btn_num: 20240725999, date: 10, status: "BANK" },]
  // const checkStatus = new Set(["RECEIVED", "REJECTED", "BANK", "HOLD", "UNHOLD", "PROCESS"]);

  // console.log(result.length, checkStatus, btnstausCount, valueArr, "-------------------------");

  if (result.length) {
    const currentStatus = result.at(-1);
    if (checkStatus.has(currentStatus.status)) {
      isInvalid = true;
    }
    return {
      isInvalid,
      currentStatus: currentStatus.status,
      message: `already ${currentStatus.status}`,
    };
  }

  return {
    isInvalid: true,
    currentStatus: BTN_STATUS_NOT_SUBMITTED,
    message: `Current status ${BTN_STATUS_NOT_SUBMITTED}`,
  };
}

function calculateTotals(data) {
  let totalQuantity = 0;
  let totalPrice = 0;

  data.forEach((item) => {
    const quantity = item.quantity;
    const price = item.price;
    if (quantity && !isNaN(quantity)) {
      totalQuantity += parseFloat(quantity);
    }
    if (price && !isNaN(price) && quantity && !isNaN(quantity)) {
      totalPrice += parseFloat(price) * parseFloat(quantity);
    }
  });
  return {
    totalQuantity,
    totalPrice,
  };
}

const getFinanceEmpList = async (req, res) => {
  try {
    let q = `SELECT DISTINCT t1.pernr as userCode, t1.cname as empName, t3.name as role 
	FROM pa0002 
    	AS t1 
      LEFT JOIN 
      	auth 
       AS t2 
       ON 
       	t2.vendor_code = t1.PERNR :: character varying

	LEFT JOIN 
      	internal_role_master 
       AS t3 
       ON 
       	t3.id = t2.internal_role_id
	
        WHERE 
        t2.department_id = $1`;
    if (req.query.$select) {
      let select = req.query.$select;
      q = q.concat(` AND t2.internal_role_id = ${select}`);
    }

    const response = await getQuery({
      query: q,
      values: [USER_TYPE_HSL_FINANCE],
    });
    resSend(res, true, 200, "data fetched!", response, null);
  } catch (err) {
    console.error("data not fetched", err);
  }
};

const addToBTNListClient = async (client, data, status) => {
  let payload = {
    btn_num: data?.btn_num,
    purchasing_doc_no: data?.purchasing_doc_no,
    net_claim_amount: data?.net_claim_amount,
    net_payable_amount: data?.net_payable_amount,
    vendor_code: data?.vendor_code,
    created_at: data?.created_at,
    btn_type: data?.btn_type,
    assign_by: data?.assign_by,
    assign_to: data?.assign_to,
    status: status,
  };
  let { q, val } = generateQuery(INSERT, BTN_LIST, payload);
  let res = await poolQuery({ client, query: q, values: val });
  if (res.length > 0) {
    return { status: true, data: res };
  }
  return { status: false, data: null };
};

const checkInvoceFile = async (req, res) => {
  try {
    const queryParmas = req.query;
    const result = await checkInoiceFiles(queryParmas);
    if (result.length) {
      let finalReasponse = result[0] || {};
      finalReasponse = {
        ...finalReasponse,
        invoice_no: queryParmas?.invoice_no,
      };
      resSend(res, true, 200, "File fetched", finalReasponse, "");
    } else {
      resSend(res, false, 200, "File not present in OBPS system", {}, "");
    }
  } catch (error) {
    resSend(res, true, 500, "checkInvoceFile error!", error.message, null);
  }
};

module.exports = {
  fetchBTNList,
  getBTNData,
  submitBTN,
  submitBTNByDO,
  fetchBTNByNum,
  fetchBTNByNumForDO,
  getExtractedData,
  getGrnIcgrnByInvoice,
  btnSaveToSap,
  timeInHHMMSS,
  assignToFiStaffHandler,
  getFinanceEmpList,
  addToBTNList,
  btnCurrentDetailsCheck,
  btnReject,
  insertUpdateToBTNList,
  updateBtnListTable,
  checkInvoceFile,
};
