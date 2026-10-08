const { getQuery } = require("../config/pgDbConfig");
const { USER_TYPE_VENDOR, USER_TYPE_HSL } = require("../lib/constant");
const { WDC_DELEGATION } = require("../lib/event");
const { SUBMITTED, REJECTED, APPROVED } = require("../lib/status");
const { getEpochTime } = require("../lib/utils");
const { getUserDetailsQuery } = require("../utils/mailFunc");
const { sendMail } = require("./mail.services");

/**
 * WDC TABLE COLUMNS WITH SET DATA
 * @param {*} tokenData
 * @param {*} obj
 * @returns
 */
const wdcVendorPayload = (tokenData, obj) => {
  return {
    reference_no: obj.reference_no,
    purchasing_doc_no: obj.purchasing_doc_no,
    action_type: obj.action_type,
    work_done_by: obj.work_done_by,
    work_title: obj.work_title,
    vendor_code: obj.vendor_code,
    attendance_report: obj.attendance_report,
    yard_no: obj.yard_no,
    stage_details: obj.stage_details,
    job_location: obj.job_location,
    unit: obj.unit,
    guarantee_defect_liability_start_date: obj.guarantee_defect_liability_start_date,
    guarantee_defect_liability_end_date: obj.guarantee_defect_liability_end_date,
    guarantee_defect_liability_status: obj.guarantee_defect_liability_status,
    total_amount: obj.total_amount,
    total_amount_status: obj.total_amount_status,
    remarks: obj.remarks,
    status: obj.status,
    updated_by: obj.updated_by,
    created_at: getEpochTime(),
    created_by_name: obj.created_by_name,
    created_by_id: obj.created_by_id,
    assigned_to: obj.assigned_to,
    jcc_job_start_date: obj.jcc_job_start_date,
    jcc_job_end_date: obj.jcc_job_end_date,
    inspection_note_ref_no: obj.inspection_note_ref_no,
    hinderence_report_cerified_by_berth: obj.hinderence_report_cerified_by_berth,
    file_attendance_report: obj.file_attendance_report,
    file_attendance_report_file_path: obj.file_attendance_report_file_path,
    file_hinderence_report_cerified_by_berth: obj.file_hinderence_report_cerified_by_berth,
    file_hinderence_report_cerified_by_berth_file_path: obj.file_hinderence_report_cerified_by_berth_file_path,
    file_inspection_note_ref_no: obj.file_inspection_note_ref_no,
    file_inspection_note_ref_no_file_path: obj.file_inspection_note_ref_no_file_path,
    action_by: tokenData.vendor_code,
    action_on: obj.action_on,
    guarantee_defect_liability_start: obj.guarantee_defect_liability_start,
    guarantee_defect_liability_end: obj.guarantee_defect_liability_end,
    jcc_job_start: obj.jcc_job_start,
    jcc_job_end: obj.jcc_job_end,
    delegate_to: obj.delegate_to,
    penalty_details: obj.penalty_details,
  };
};

/**
 * WDC LINE TABLE COLUMNS
 * @param {*} obj
 * @returns
 */
const wdcLinePayload = (obj) => {
  return {
    reference_no: obj.reference_no,
    purchasing_doc_no: obj.purchasing_doc_no,
    lineitem: obj.lineitem,
    sublineitem: obj.sublineitem,
    claim_qty: obj.claim_qty,
    contractual_start: obj.contractual_start,
    contractual_completion: obj.contractual_completion,
    actual_start: obj.actual_start,
    actual_completion: obj.actual_completion,
    hinderance: obj.hinderance,
    claim_amount: obj.claim_amount,
    delay: obj.delay || "0",
    wdc_id: obj.wdc_id,
    description: obj.description,
    open_qty: obj.open_qty,
    unit: obj.unit,
  };
};

function comparePreviousDataAndSetNewData(oldItems, newItems) {
  return newItems.map((nItem) => ({ ...wdcLinePayload(nItem) }));

}

async function handeWdclMail(tokenData, payload, event) {
  try {
    let emailUserDetailsQuery;
    let emailUserDetails;

    let dataObj = { ...payload };

    if (tokenData.user_type == USER_TYPE_VENDOR && payload.status == SUBMITTED) {
      let buildQuery = "SELECT * FROM (";
      buildQuery += getUserDetailsQuery("vendor_and_do", "$1");
      buildQuery += "UNION";
      buildQuery += getUserDetailsQuery("wdc_certifing_authrity", "$2");
      buildQuery += ") AS mail_info";
      emailUserDetails = await getQuery({
        query: buildQuery,
        values: [payload.purchasing_doc_no, parseInt(payload.assigned_to)],
      });
      await sendMail(event, dataObj, { users: emailUserDetails }, event);
    } else if (tokenData.user_type == USER_TYPE_HSL && (payload.status == REJECTED || payload.status == APPROVED)) {
      emailUserDetailsQuery = getUserDetailsQuery("vendor_by_po", "$1");

      emailUserDetails = await getQuery({
        query: emailUserDetailsQuery,
        values: [payload.purchasing_doc_no],
      });
      dataObj = { ...dataObj, vendor_name: emailUserDetails[0]?.u_name };
      await sendMail(event, dataObj, { users: emailUserDetails }, event);
    } else {
      let buildQuery = "";
      buildQuery += getUserDetailsQuery("wdc_certifing_authrity", "$1");

      emailUserDetails = await getQuery({ query: buildQuery, values: [payload.action_on] });

      dataObj = { ...dataObj, vendor_name: emailUserDetails[0]?.u_name };
      await sendMail(WDC_DELEGATION, dataObj, { users: emailUserDetails }, WDC_DELEGATION);
    }
  } catch (error) {
    console.error("handel wdc mail btn", error.toString(), error);
  }
}

const wdcTableCopyData = (wdcTabelData) => {
  if (!wdcTabelData || !Object.keys(wdcTabelData).length) return {};
  return {
    reference_no: wdcTabelData.reference_no,
    purchasing_doc_no: wdcTabelData.purchasing_doc_no,
    action_type: wdcTabelData.action_type,
    work_done_by: wdcTabelData.work_done_by,
    work_title: wdcTabelData.work_title,
    vendor_code: wdcTabelData.vendor_code,
    inspection_note_ref_no: wdcTabelData.inspection_note_ref_no,
    file_inspection_note_ref_no: wdcTabelData.file_inspection_note_ref_no,
    hinderence_report_cerified_by_berth: wdcTabelData.hinderence_report_cerified_by_berth,
    file_hinderence_report_cerified_by_berth: wdcTabelData.file_hinderence_report_cerified_by_berth,
    attendance_report: wdcTabelData.attendance_report,
    file_attendance_report: wdcTabelData.file_attendance_report,
    yard_no: wdcTabelData.yard_no,
    stage_details: wdcTabelData.stage_details,
    job_location: wdcTabelData.job_location,
    unit: wdcTabelData.unit,
    guarantee_defect_liability_start: wdcTabelData.guarantee_defect_liability_start,
    guarantee_defect_liability_end: wdcTabelData.guarantee_defect_liability_end,
    guarantee_defect_liability_status: wdcTabelData.guarantee_defect_liability_status,
    total_amount: wdcTabelData.total_amount,
    total_amount_status: wdcTabelData.total_amount_status,
    remarks: wdcTabelData.remarks,
    status: wdcTabelData.status,
    updated_by: wdcTabelData.updated_by,
    created_at: wdcTabelData.created_at,
    created_by_name: wdcTabelData.created_by_name,
    created_by_id: wdcTabelData.created_by_id,
    assigned_to: wdcTabelData.assigned_to,
    jcc_job_start: wdcTabelData.jcc_job_start,
    jcc_job_end: wdcTabelData.jcc_job_end,
    file_attendance_report_file_path: wdcTabelData.file_attendance_report_file_path,
    file_hinderence_report_cerified_by_berth_file_path: wdcTabelData.file_hinderence_report_cerified_by_berth_file_path,
    file_inspection_note_ref_no_file_path: wdcTabelData.file_inspection_note_ref_no_file_path,
    action_by: wdcTabelData.action_by,
    action_on: wdcTabelData.action_on,
    delegate_to: wdcTabelData.delegate_to,
    penalty_details: wdcTabelData.penalty_details,
    remarks2: wdcTabelData.remarks2,
    remarks3: wdcTabelData.remarks3,
  };
};

const wdcLineTableCopyData = (wdcLineItems) => {
  if (!wdcLineItems || !Array.isArray(wdcLineItems) || !wdcLineItems.length) return [];
  return wdcLineItems.map((ele) => ({
    reference_no: ele.reference_no,
    purchasing_doc_no: ele.purchasing_doc_no,
    lineitem: ele.lineitem,
    sublineitem: ele.sublineitem,
    claim_qty: ele.claim_qty,
    contractual_start: ele.contractual_start,
    contractual_completion: ele.contractual_completion,
    actual_start: ele.actual_start,
    actual_completion: ele.actual_completion,
    hinderance: ele.hinderance,
    claim_amount: ele.claim_amount,
    delay: ele.delay,
    wdc_id: ele.wdc_id,
    description: ele.description,
    open_qty: ele.open_qty,
    unit: ele.unit,
  }));
};

module.exports = { wdcVendorPayload, comparePreviousDataAndSetNewData, handeWdclMail, wdcTableCopyData, wdcLineTableCopyData };
