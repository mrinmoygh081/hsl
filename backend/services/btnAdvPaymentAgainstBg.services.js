
const { poolQuery } = require("../config/pgDbConfig");
const { BTN_ADVANCE_BILL, MID_QAP, MID_DRAWING, MID_ILMS, MID_SDBG, ACTION_ADVANCE_BG_SUBMISSION, ACTION_IB, UPDATE } = require("../lib/constant");
const { APPROVED, BTN_STATUS_NOT_SUBMITTED, STATUS_RECEIVED, BTN_STATUS_DRETURN, SUBMITTED_BY_VENDOR, SUBMIT_BY_DO, REJECTED, BTN_STATUS_BANK, BTN_STATUS_HOLD_TEXT, BTN_STATUS_PROCESS, BTN_STATUS_PAYMENT_DONE_TEXT } = require("../lib/status");
const { BTN_ADV_BILL_HYBRID } = require("../lib/tableName");
const { getEpochTime, generateQuery } = require("../lib/utils");
const { getVendorDetails } = require("../utils/btnUtils");

const advBillHybridbtnPayload = (payload) => {
  if (!payload || !Object.keys(payload).length)
    throw new Error("Invalid payload in advBillHybridbtnPayload");

  const pl = {
    btn_num: payload.btn_num,
    stage: payload.stage || "",
    yard: payload.yard || "",
    purchasing_doc_no: payload.purchasing_doc_no,
    invoice_no: payload.invoice_no || "",
    invoice_filename: payload.invoice_filename || "",
    invoice_file_path: payload.invoice_file_path || "",
    invoice_value: payload.invoice_value || "",
    invoice_date: payload.invoice_date || "",
    invoice_type: payload.invoice_type,
    // grn_nos: payload.grn_nos || "",
    // icgrn_nos: payload.icgrn_nos || "",
    // suppoting_invoice_filename: payload.suppoting_invoice_filename || "",
    invoice_supporting_filename: payload.suppoting_invoice_filename || "",
    invoice_supporting_file_path: payload.suppoting_invoice_file_path || "",
    net_claim_amount: payload.net_claim_amount || "",
    cgst: payload.cgst || "0",
    sgst: payload.sgst || "0",
    igst: payload.igst || "0",
    net_with_gst: payload.net_with_gst || "0",
    // c_sdbg_date: payload.c_sdbg_date || "",
    // a_sdbg_date: payload.a_sdbg_date || "",
    c_drawing_date: payload.c_drawing_date || "",
    a_drawing_date: payload.a_drawing_date || "",
    // c_qap_date: payload.c_qap_date || "",
    // a_qap_date: payload.a_qap_date || "",
    vendor_code: payload.vendor_code || "",
    bg_details: payload.bg_details,
    btn_type: BTN_ADVANCE_BILL,
    hsn_gstn_icgrn: true,
    // associated_po: JSON.stringify(payload.associated_po || []),
    // updated_by: payload.updated_by || "",
    created_at: payload.created_at || "",
    created_by_id: payload.created_by_id || "",
  };

  return pl;
};
const advBillHybridbtnDOPayload = (payload, tokenData) => {
  if (!payload || !Object.keys(payload).length)
    throw new Error("Invalid payload in advBillHybridbtnPayload");

  //  Retension if any(%) Remarks for Retension Other Deduction Deduction Remarks
  // Total deductions	Net payable amountPenalty for Drawing submissionEstimated PenaltyMax Penalty

  const pl = {
    btn_num: payload.btn_num,
    purchasing_doc_no: payload.purchasing_doc_no,
    basic_amount: payload.basic_amount,
    drg_penalty: payload.drg_penalty,
    drg_penalty_pct: payload.drg_penalty_pct,
    max_penalty: payload.max_penalty,
    estimated_penalty_amount: payload.estimated_penalty_amount,
    total_penalty_amount: payload.total_penalty_amount,
    retention_amount: payload.retention_amount,
    retention_rate: payload.retention_rate,
    retention_remarks: payload.retention_remarks,
    deduction_remarks: payload.deduction_remarks,
    other_deduction: payload.other_deduction,
    total_retention_and_penalty: payload.total_retention_and_penalty,
    net_payable_amount: payload.net_payable_amount,
    created_at: payload.created_at || getEpochTime(),
    created_by: tokenData.vendor_code
  };

  return pl;
};



/**
 * CHECK IF CONTRACTUAL SUBMISSION HAD
 * BUT ACTUCAL SUBMISSION DATE MISSING OR NOT SUBMIT
 * @param c_dates Array
 * @param a_dates Array
 * @returns Object
 */

function checkMilestonDates(c_dates, a_dates) {
  // const arr = new Set([parseInt(MID_SDBG), parseInt(MID_DRAWING), parseInt(MID_QAP), parseInt(MID_ILMS)]);
  const arr = new Set([parseInt(MID_DRAWING), parseInt(MID_QAP), parseInt(MID_ILMS)]);
  const c_dates_filter = c_dates.filter((el) => arr.has(parseInt(el.MID)));
  const a_dates_filter = a_dates.filter((el) => arr.has(parseInt(el.MID)));
  const mtextObj = {
    [MID_SDBG]: "SDBG",
    [MID_DRAWING]: "Drawing",
    [MID_QAP]: "QAP",
    [MID_ILMS]: "ILMS",
  };
  for (const item of c_dates_filter) {
    const i = a_dates_filter.findIndex((el) => parseInt(el.MID) == parseInt(item.MID));
    if (i < 0) {
      return {
        success: false,
        msg: `Please submit ${mtextObj[item.MID]} to process BTN !`,
      };
    }
  }

  return { success: true, msg: "No milestone missing" };
}



async function getBgApprovedFiles(client, purchasing_doc_no) {
  const query = ` SELECT reference_no, file_name, file_path FROM sdbg WHERE purchasing_doc_no = $1 AND status = $2 AND action_type IN($3, $4)`;
  const values = [purchasing_doc_no, APPROVED, ACTION_ADVANCE_BG_SUBMISSION, ACTION_IB];
  const bgFiles = await poolQuery({ client, query, values });
  return bgFiles;

}



/**
 * Fetch BTN advance bill details
 */
async function getAdvBillHybridBTNDetails(client, { btn_num }) {
  const query = `SELECT 
    adbh.*,
    adbh_do.drg_penalty,
    adbh_do.max_penalty,
    adbh_do.total_penalty_amount,
    adbh_do.estimated_penalty_amount,
    adbh_do.retention_amount,
    adbh_do.retention_remarks,
    adbh_do.deduction_remarks,
    adbh_do.retention_rate,
    adbh_do.total_retention_and_penalty,
    adbh_do.net_payable_amount,
    adbh_do.basic_amount,
    adbh_do.drg_penalty_pct,
    adbh_do.other_deduction,
    lfa1.name1 as vendor_name
  FROM ${BTN_ADV_BILL_HYBRID} as adbh
    left join btn_adv_bill_against_bg_do as adbh_do on (adbh.btn_num = adbh_do.btn_num )
    left join lfa1 as lfa1 on (adbh.vendor_code = lfa1.lifnr )
  WHERE adbh.btn_num = $1`;
  const result = await poolQuery({ client, query, values: [btn_num] });
  return { data: result, message: "Fetched successfully", success: true, statusCode: 200 };
}


/**
 * Fetch initial vendor data by PO number
 */
async function getInitalData(client, { poNo }) {
  const result = await getVendorDetails(client, [poNo]);
  const bgData = await getBgApprovedFiles(client, poNo);
  let data = {};
  data = {
    ...result[0],
    bgData: bgData
  }

  return { data, message: "Fetched successfully", success: true, statusCode: 200 };
}


async function btnAdvBillAgainstBgCurrentDetailsCheck(client, data) {

    let btnstausCount = `SELECT btn_num, status  FROM btn_list WHERE 1 = 1`;
    const valueArr = [];
    let count = 0;
    if (data.btn_num) {
      btnstausCount += ` AND btn_num = $${++count}`;
      valueArr.push(data.btn_num);
    }

    const checkStatus = new Set([STATUS_RECEIVED, REJECTED, BTN_STATUS_BANK, BTN_STATUS_HOLD_TEXT, BTN_STATUS_PROCESS, SUBMIT_BY_DO, BTN_STATUS_PAYMENT_DONE_TEXT]);

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

async function updateBtnAdvBillAgainstBg(client, btn_num, btnPayload) {
    const { q, val } = generateQuery(UPDATE, BTN_ADV_BILL_HYBRID, btnPayload, { btn_num });
    await poolQuery({ client, query: q, values: val });
}

module.exports = {
  advBillHybridbtnPayload,
  advBillHybridbtnDOPayload,
  checkMilestonDates,
  getBgApprovedFiles,
  getAdvBillHybridBTNDetails,
  getInitalData,
  btnAdvBillAgainstBgCurrentDetailsCheck,
  updateBtnAdvBillAgainstBg
};