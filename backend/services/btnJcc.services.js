const { poolQuery, poolClient } = require("../config/pgDbConfig");
const { BTN_CLAIM_AGAINST_JCC, YES_SORT_FORM } = require("../lib/constant");
const { resSend } = require("../lib/resSend");
const { APPROVED } = require("../lib/status");
const { getEpochTime } = require("../lib/utils");
const { getVendorDetails } = require("../utils/btnUtils");
const Message = require("../utils/messages");

/**---------------------------------------------------------------------- */

const getWdcInfoServiceHybrid = async (req, res) => {
  let client;
  try {
    client = await poolClient();

    const { purchasing_doc_no, reference_no, type } = req.query;
    if (type === "list") {
      let wdcListQuery = `SELECT DISTINCT(reference_no), created_at FROM wdc`;
      let condQuery = ' WHERE 1 = 1';
      let count = 0;
      // TO GET ONLY WDC .. NO JCC OR THERS
      const val = ['JCC'];
      condQuery += ` AND action_type = $${++count}`;
      if (purchasing_doc_no) {
        val.push(purchasing_doc_no);
        condQuery += `  AND purchasing_doc_no = $${++count}`;
      }

      condQuery += ` AND status = $${++count}`;
      val.push(APPROVED)

      wdcListQuery += condQuery;

      const wdcList = await poolQuery({ client, query: wdcListQuery, values: val });
      return resSend(res, true, 200, Message.DATA_FETCH_SUCCESSFULL, wdcList, null);
    }

    if (!reference_no) {
      return resSend(res, false, 400, Message.MANDATORY_PARAMETR_MISSING, "Reference_no missing", null);
    }

    const q = `
              SELECT wdc.*,
              	wdc.assigned_to AS certifying_by,
              	users.cname as certifying_by_name
              FROM
              	wdc AS wdc
              LEFT JOIN pa0002 AS users
              	ON(users.pernr :: character varying = wdc.assigned_to)
              WHERE (reference_no = $1 AND status = $2 AND action_type = $3) LIMIT 1`;

    let result = await poolQuery({ client, query: q, values: [reference_no, APPROVED, 'WDC'] });

    if (!result.length) {
      return resSend(res, false, 200, "WDC not approved yet.", [], null);
    }

    resSend(res, true, 200, Message.DATA_FETCH_SUCCESSFULL, result, null);
  } catch (error) {
    console.error("[error]", error);
    resSend(res, false, 500, Message.SOMTHING_WENT_WRONG, null, null);
  } finally {
    if (client) client.release();
  }

};

const jccBtnforwordToFinacePaylaod = (payload) => {

  const obj = {
    btn_num: payload.btn_num,
    recomend_payment: payload.recomend_payment,
    net_payable_amount: payload.net_payable_amount,
    created_at: getEpochTime(),
    created_by_id: payload.created_by_id
  }
  return obj;
}

const jccBtnbtnAssignPayload = (payload) => {

  return {
    btn_num: payload.btn_num,
    purchasing_doc_no: payload.purchasing_doc_no,
    assign_by: payload.assign_by,
    assign_to: payload.assign_to,
    last_assign: true,
    assign_by_fi: "",
    assign_to_fi: "",
    last_assign_fi: false,
  }
}

const jccPayloadObj = (payload) => {

  const obj = {
    btn_num: payload.btn_num,
    purchasing_doc_no: payload.purchasing_doc_no,
    vendor_code: payload.vendor_code,
    invoice_no: payload.jcc_ref_number,
    yard: payload.yard,
    invoice_type: "JCC",
    invoice_date: payload.jcc_date || null,
    bill_certifing_authority: payload.bill_certifing_authority,
    net_claim_amount: payload.net_claim_amount || "0",
    jcc_ref_number: payload.jcc_ref_number,
    hsn_gstn_icgrn: "1",
    remarks: payload.remarks || null,
    ref_invoice1_no: payload.ref_invoice1_no || null,
    ref_invoice1_filename: payload.ref_invoice1_filename || null,
    ref_invoice1_file_path: payload.ref_invoice1_file_path || null,
    ref_invoice1_amount: payload.ref_invoice1_amount ?? "0",
    ref_invoice1_remarks: payload.ref_invoice1_remarks || null,
    ref_invoice2_no: payload.ref_invoice2_no || null,
    ref_invoice2_filename: payload.ref_invoice2_filename || null,
    ref_invoice2_file_path: payload.ref_invoice2_file_path || null,
    ref_invoice2_amount: payload.ref_invoice2_amount ?? "0",
    ref_invoice2_remarks: payload.ref_invoice2_remarks || null,
    ref_invoice3_no: payload.ref_invoice3_no || null,
    ref_invoice3_filename: payload.ref_invoice3_filename || null,
    ref_invoice3_file_path: payload.ref_invoice3_file_path || null,
    ref_invoice3_amount: payload.ref_invoice3_amount ?? "0",
    ref_invoice3_remarks: payload.ref_invoice3_remarks || null,
    ref_invoice4_no: payload.ref_invoice4_no || null,
    ref_invoice4_filename: payload.ref_invoice4_filename || null,
    ref_invoice4_file_path: payload.ref_invoice4_file_path || null,
    ref_invoice4_amount: payload.ref_invoice4_amount ?? "0",
    ref_invoice4_remarks: payload.ref_invoice4_remarks || null,
    created_by_id: payload.created_by_id,
    created_at: getEpochTime(),
    btn_type: BTN_CLAIM_AGAINST_JCC,

  }

  return obj;
}

async function getJccBTNDetails(client, data) {
  try {

    if (!data.btn_num) {
      return { success: false, statusCode: 200, message: "Please send btn number", data: Message.MANDATORY_INPUTS_REQUIRED };
    }
    const val = [];
    val.push(data.btn_num);

    const getBtnQuery =
      `SELECT
                s_btn.*,
                btn_assign.assign_by,
                btn_assign.assign_to,
                users_btn_assign_to.cname AS assign_to_name,
                users_assign_to_fi.cname AS assign_by_fi_name,
                btn_assign.assign_by_fi,
                btn_assign.assign_to_fi,
                btn_assign.last_assign,
                btn_assign.last_assign_fi,
                btn_authority.recomend_payment,
                users.cname AS bill_certifing_authority_name
            FROM 
              btn_jcc AS s_btn 
            LEFT JOIN btn_assign AS btn_assign
                ON(s_btn.btn_num = btn_assign.btn_num)
            LEFT JOIN pa0002 as users 
                ON(users.pernr :: character varying = s_btn.bill_certifing_authority)
            LEFT JOIN pa0002 as users_btn_assign_to
                ON(users_btn_assign_to.pernr :: character varying = btn_assign.assign_to) 
            LEFT JOIN pa0002 as users_assign_to_fi
                ON(users_assign_to_fi.pernr :: character varying = btn_assign.assign_to_fi) 
            LEFT JOIN btn_jcc_certify_authority as btn_authority 
                ON(s_btn.btn_num = btn_authority.btn_num)
            WHERE s_btn.btn_num = $1`;
    // AND s_btn.bill_certifing_authority = '600700'
    // btn_assign.*,
    // LEFT JOIN btn_assign AS btn_assign
    const result = await poolQuery({ client, query: getBtnQuery, values: val });
    const vendor = await getVendorDetails(client, [data.poNo || ""])
    let response = result[0] || {};
    let response2 = vendor[0] || {};

    response = { ...response, ...response2 };

    return { success: true, statusCode: 200, message: "Value fetch success", data: response };
  } catch (error) {
    console.error("getJccBTNDetails error", error.message);

    throw error;
  }
}

async function checkHrCompliances(client, data) {

  let hrComplianceQuery =
    `SELECT hr_compliance_data.* 
	        FROM hr_compliance
	      LEFT JOIN hr_compliance_data ON(hr_compliance.ref_group = hr_compliance_data.ref_group )`;
  let condQuery = " WHERE 1 = 1 ";
  let count = 0;
  const val = [];
  if (data.poNo) {
    condQuery += ` AND  hr_compliance.purchasing_doc_no = $${++count} `;
    val.push(data.poNo);
  }
  condQuery += ` AND hr_compliance_data.status = $${++count}`;
  val.push(APPROVED)
  hrComplianceQuery += condQuery;

  const compliences = await poolQuery({ client, query: hrComplianceQuery, values: val });

  const response = {
    status: false,
    leave_salary_compliance: "N",
    bonus_compliance: "N",
    last_complient_date: null,
    hr_remarks: "Compliance Missing"
  }
  if (!compliences.length) {
    return response;
  }

  compliences.forEach(ele => {
    if (ele.compliance && typeof ele.compliance == "string") {
      const compl = ele.compliance.toLowerCase() + "_compliance";
      response[compl] = "Y"
    }
  });

  if (response.leave_salary_compliance == YES_SORT_FORM && response.bonus_compliance == YES_SORT_FORM) {
    response.status = true;
  }

  return response;

}

module.exports = {
  jccPayloadObj,
  jccBtnforwordToFinacePaylaod,
  jccBtnbtnAssignPayload,
  getJccBTNDetails,
  getWdcInfoServiceHybrid,
  checkHrCompliances
}