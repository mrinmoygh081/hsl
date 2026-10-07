const { poolQuery, getQuery } = require("../config/pgDbConfig");
const {
  INSERT,
  ACTION_SDBG,
  ACTION_PBG,
  MID_SDBG,
  USER_TYPE_VENDOR,
  YES_SORT_FORM,
  TYPE_WDC,
  NO_SORT_FORM,
  BTN_SERVICE_CONTRACT_BILL,
  UPDATE,
} = require("../lib/constant");
const { BTN_UPLOAD_CHECKLIST, BTN_REJECT, BTN_ASSIGN_TO_STAFF, BTN_FORWORD_FINANCE } = require("../lib/event");
const {
  APPROVED,
  REJECTED,
  STATUS_RECEIVED,
  BTN_STATUS_BANK,
  BTN_STATUS_HOLD_TEXT,
  BTN_STATUS_PROCESS,
  SUBMITTED_BY_CAUTHORITY,
  BTN_STATUS_DRETURN,
  SUBMITTED_BY_VENDOR,
  SUBMITTED,
  FORWARD_TO_FINANCE,
  STATUS_RECOMMEND,
  STATUS_DELEGATED,
  NOT_RECOMMEND,
} = require("../lib/status");
const { BTN_LIST, BTN_SERVICE_HYBRID, BTN_SERVICE_LINKEDWDC } = require("../lib/tableName");
const { getEpochTime, generateQuery, generateQueryForMultipleData, dynamicSepartedStringToStringArray } = require("../lib/utils");
const { calculateTotals, calculateTotalGrnValue } = require("../utils/btnUtils");
const { getUserDetailsQuery } = require("../utils/mailFunc");
const Message = require("../utils/messages");
const QueryBuilder = require("../utils/QueryBuilder");
const { getGrnDetails, getIcgrnDetails, getReturnedGrnDetailsByGrnNos } = require("./btn.services");
const { sendMail } = require("./mail.services");
const { getVendorDetails } = require("../utils/btnUtils");
/**
 * BTN PAYLOAD
 * @param {Object} payload
 * @returns Object
 */
const payloadObj = (payload) => {
  const obj = {
    btn_num: payload.btn_num,
    purchasing_doc_no: payload.purchasing_doc_no,
    vendor_code: payload.vendor_code,
    invoice_no: payload.invoice_no,
    invoice_value: payload.invoice_value,
    yard: payload.yard,
    cgst: payload.cgst || "0",
    igst: payload.igst || "0",
    sgst: payload.sgst || "0",
    invoice_filename: payload.invoice_filename || "",
    invoice_type: payload.invoice_type,
    invoice_date: payload.invoice_date || null,
    suppoting_invoice_filename: payload.suppoting_invoice_filename || "",
    debit_note: payload.debit_note || "0",
    credit_note: payload.credit_note || "0",
    debit_credit_filename: payload.debit_credit_filename,
    bill_certifing_authority: payload.bill_certifing_authority,
    current_ca: payload.bill_certifing_authority,
    net_claim_amount: payload.net_claim_amount || "0",
    net_claim_amt_gst: payload.net_claim_amt_gst || "0",
    wdc_number: JSON.stringify(payload.wdc_numbers),
    hsn_gstn_icgrn: payload.hsn_gstn_icgrn || 0,
    created_by_id: payload.created_by_id,
    created_at: getEpochTime(),
    btn_type: BTN_SERVICE_CONTRACT_BILL,
    units: payload.units ? JSON.stringify(payload.units) : JSON.stringify([]),
    outside: payload.outside,
    status: SUBMITTED_BY_VENDOR,
  };

  return obj;
};

/**
 * FORWORD TO FINANCE PAYLOAD
 * @param {Object} payload
 * @returns  Object
 */
const forwordToFinacePaylaod = (payload) => {
  const obj = {
    btn_num: payload.btn_num,
    check_wdc_number: payload.check_wdc_number || null,
    grn_no: payload.grn_no || null,
    wdc_details: payload.wdc_details || null,
    other_deduction: payload.other_deduction ? Number(payload.other_deduction).toFixed(3) : "0",
    deduction_remarks: payload.deduction_remarks || "",
    total_deduction: payload.total_deduction ? Number(payload.total_deduction).toFixed(3) : "0",
    net_payable_amount: payload.net_payable_amount || "0",
    estimated_ld: payload.estimated_ld ? Number(payload.estimated_ld).toFixed(3) : "0",
    retension_remarks: payload.retension_remarks || null,
    retension_amount: payload.retension_amount ? Number(payload.retension_amount).toFixed(3) : "0",
    retension_rate: payload.retension_rate || "0",
    max_ld: payload.max_ld || "0",
    remarks: payload.remarks || null,
    created_at: getEpochTime(),
    created_by_id: payload.created_by_id,
  };
  return obj;
};

/**
 * BTN Assign payload
 * @param {Object} payload
 * @returns Object
 */
const btnAssignPayload = (payload) => {
  return {
    btn_num: payload.btn_num,
    purchasing_doc_no: payload.purchasing_doc_no,
    assign_by: payload.assign_by,
    assign_to: payload.assign_to,
    last_assign: true,
    assign_by_fi: "",
    assign_to_fi: "",
    last_assign_fi: false,
  };
};

/**
 * BTN delegate payload
 * @param {Object} payload
 * @returns Object
 */
const btnDelegatePayload = (payload) => {
  return {
    btn_num: payload.btn_num,
    purchasing_doc_no: payload.purchasing_doc_no,
    is_delegated: YES_SORT_FORM,
    delegate_to: payload.delegate_to,
    current_ca: payload.delegate_to,
    remarks1: payload.remarks,
    delegate_by: payload.delegate_by,
    status: payload.status,
  };
};

/**
 * BTN Recomend/non-recomend payload
 * @param {Object} payload
 * @returns Object
 */
const btnRecomendPayload = (payload) => {
  return {
    btn_num: payload.btn_num,
    purchasing_doc_no: payload.purchasing_doc_no,
    remarks2: payload.remarks,
    delegate_action_by: payload.delegate_action_by,
    current_ca: payload.current_ca,
    status: payload.status,
    is_recomended: payload.status === STATUS_RECOMMEND ? YES_SORT_FORM : NO_SORT_FORM
  };
};

/**
 * FILES HANDLE TO PAYLOAD
 * @param {Object} payloadFiles
 * @returns
 */

/**
 * INSERT DATA IN BTN LIST TABLE
 * @param {Object} client
 * @param {Object} data
 * @param {String} status
 * @returns {Promise<Object>}
 * @throws {Error} If the query execution fails, an error is thrown
 */
const addToBTNListFn = async (client, data, status) => {

  let payload = {
    btn_num: data?.btn_num,
    purchasing_doc_no: data?.purchasing_doc_no,
    net_claim_amount: data?.net_claim_amount,
    net_payable_amount: data?.net_payable_amount,
    vendor_code: data?.vendor_code,
    created_at: getEpochTime(),
    btn_type: data?.btn_type,
    status: status,
    remarks: data.remarks || "",
    assign_by: data.assign_by,
    assign_to: data.assign_to,
  };

  let { q, val } = generateQuery(INSERT, BTN_LIST, payload);
  let res = await poolQuery({ client, query: q, values: val });
  if (res.length > 0) {
    return { status: true, data: res };
  }

};

/**
 * SDBG APPROVE FILE DATA
 * @param {Object} client
 * @param {Object} data
 * @returns  Object || Error
 */
const getSDBGApprovedFiles = async (client, data) => {

  let q = `SELECT file_name as sdbg_filename FROM sdbg WHERE purchasing_doc_no = $1 and status = $2 and action_type = $3`;
  let result = await poolQuery({ client, query: q, values: data });
  return result;

};

/**
 * PBG APPROVED FILE FOR THE PO
 * @param {Object} client
 * @param {Object} data
 * @returns {Promise<Object>}
 * @throws {Error} If the query execution fails, an error is thrown.
 */
const getPBGApprovedFiles = async (client, data) => {

  let q = `SELECT file_name as pbg_filename FROM sdbg WHERE purchasing_doc_no = $1 and status = $2 and action_type = $3`;
  let result = await poolQuery({ client, query: q, values: data });

  return result;

};

/**
 * ACTUAL SUBMISSION DATE
 * @param {Object} client
 * @param {Object} data
 * @returns {Promise<Object>}
 * @throws {Error} If the query execution fails, an error is thrown.
 */
const getActualSubminissionDate = async (client, data) => {

  let a_sdbg_date_q = `SELECT actualSubmissionDate AS "PLAN_DATE", milestoneText AS "MTEXT", milestoneid AS "MID" FROM actualsubmissiondate WHERE purchasing_doc_no = $1`;
  let a_dates = await poolQuery({
    client,
    query: a_sdbg_date_q,
    values: data,
  });
  return a_dates;

};

/**
 * CONTRACTUAL SUBMISSION DATE
 * @param {Object} client
 * @param {Object} data
 * @returns {Promise<Object>}
 * @throws {Error} If the query execution fails, an error is thrown.
 */
const getContractutalSubminissionDate = async (client, data) => {

  let c_sdbg_date_q = `SELECT PLAN_DATE as "PLAN_DATE", MTEXT as "MTEXT", MID AS "MID" FROM zpo_milestone WHERE EBELN = $1`;
  let c_dates = await poolQuery({
    client,
    query: c_sdbg_date_q,
    values: data,
  });
  return c_dates;

};

/**
 * CONTRACTUAL SUBMISSION DATE
 * @param {Object} client
 * @param {Object} data
 * @returns {Promise<Object>}
 * @throws {Error} If the query execution fails, an error is thrown.
 */
async function checkHrCompliance(client, data) {
  try {
    const hrUploadedData = await getHrComplianceDetails(client, data, true);
    if (!hrUploadedData.pf_compliance || hrUploadedData.pf_compliance != YES_SORT_FORM) {
      return { success: false, msg: `Please submit PF to process BTN !`, data: hrUploadedData };
    }
    if (!hrUploadedData.esi_compliance || hrUploadedData.esi_compliance != YES_SORT_FORM) {
      return { success: false, msg: `Please submit ESI to process BTN !`, data: hrUploadedData };
    }
    if (!hrUploadedData.wages_compliance || hrUploadedData.wages_compliance != YES_SORT_FORM) {
      return { success: false, msg: `Please submit WAGES to process BTN !`, data: hrUploadedData };
    }

    return { success: true, msg: "No milestone missing", data: hrUploadedData };
  } catch (error) {
    return { success: false, msg: "An error occurred while checking HR compliance. Please try again later." + error.message, data: {} };
  }
}

/**
 * GRN VALUE
 * @param {Object} client
 * @param {Object} data
 * @returns
 */
const getGrnIcgrnValue = async (client, data) => {
  try {
    if (!data.num || typeof data.num != "string" || !data.po) {
      return { success: false, statusCode: 200, message: "Please send GRN and PO", data: Message.MANDATORY_INPUTS_REQUIRED };
    }

    let total_price = 0;
    let total_quantity = 0;
    let totalUnitPrice = 0;
    let totalReturnPrice = 0;
    let totalReturnQuantity = 0;

    // grn string value to arr 
    const grnArr = commaSepartedStringToStringArrayGrnNos(data.num);

    // get grn values
    let grn_value = (await getGrnDetails(client, grnArr)) || [];

    const onlyGrnItems = grn_value.filter((el) => el.grn_reqired == null || el.grn_reqired == "");
    const icgrnItems = grn_value.filter((el) => el.grn_reqired == "X");

    const icgrnNosArr = icgrnItems.map((igNo) => igNo.grn_no);
    const icgrn_no = await getIcgrnDetails(client, icgrnNosArr);

    /** ONLY GRN MATERIL TOTAL */
    if (onlyGrnItems.length) {
      const totals = calculateTotalGrnValue(onlyGrnItems);
      total_price += totals.totalPrice || 0;
      total_quantity += totals.totalQuantity;
      totalUnitPrice += totals.totalUnitPrice || 0;
    }

    /** ICGRN MATERIL TOTAL */
    if (icgrn_no.length) {
      const totals = calculateTotals(icgrn_no);
      total_price = totals.totalPrice || 0;
      total_quantity = totals.totalQuantity;
      totalUnitPrice += totals.totalPrice || 0;
    }

    total_price = parseFloat(total_price.toFixed(3));
    total_quantity = parseFloat(total_quantity.toFixed(3));

    const returnedGrns = await getReturnedGrnDetailsByGrnNos(client, grnArr);

    if (returnedGrns.length) {
      const calcReturnGrnDetails = calculateTotalGrnValue(returnedGrns);
      totalReturnPrice = (calcReturnGrnDetails.totalReturnPrice).toFixed(3);
      totalReturnQuantity = (calcReturnGrnDetails.totalReturnQuantity).toFixed(3);
      total_price = (total_price - calcReturnGrnDetails.totalReturnUnitPrice);
      totalUnitPrice = (totalUnitPrice - calcReturnGrnDetails.totalReturnUnitPrice);
      total_quantity = (total_quantity - calcReturnGrnDetails.totalReturnQuantity);
      grn_value = remove122GrnData(grn_value, returnedGrns);

    }

    const line_item_array = grn_value.map((el) => ({
      ...el,
      claim_amount: (parseFloat(el.unit_quantity || 0) * parseFloat(el.unit_price || 0)).toFixed(3),
      lineitem: el.po_lineitem,
      claim_qty: el.quantity,
      description: el.mat_desc,
      unit: el.mat_unit,
    }));

    const totalCalcDetails = {
      total_price,
      total_quantity,
      totalUnitPrice,
      line_item_array,
      totalReturnPrice,
      totalReturnQuantity
    }

    return { success: true, statusCode: 200, message: "Value fetch success", data: totalCalcDetails };
  } catch (error) {
    console.error("Error making the request: ", error.message, error.stack);
    throw error;
  }
};

function remove122GrnData(grnAll = [], grn122 = []) {
  // Collect all mblnr values from grn122 into a Set for fast lookup
  const removeSet = new Set(grn122.map(g => g.lfbnr));

  // Filter grnAll, keeping only those not in removeSet
  return grnAll.filter(gAll => !removeSet.has(gAll.mblnr));
}

/**
 * commaSepartedStringToStringArrayGrnNos
 * convert string to string array with comma seperated
 * @param {string} data 
 * @returns 
 */
function commaSepartedStringToStringArrayGrnNos(grnNosSting) {
  if (grnNosSting && typeof grnNosSting == "string") {
    return grnNosSting
      .split(',')
      .map(item => item.trim())
      .filter(item => item && /^\d+$/.test(item));
  }
  return [];
}

/**
 * Service entry total value
 * @param {Object} client
 * @param {Object} data
 * @returns
 */
const getServiceEntryValue = async (client, data) => {
  try {

    const service_entry_numbers = dynamicSepartedStringToStringArray(data.num, ",");

    if (!data?.num || !data?.po || !service_entry_numbers?.length) {
      return { success: false, statusCode: 200, message: "Please send service entry number & po", data: Message.MANDATORY_INPUTS_REQUIRED };
    }

    const qb = new QueryBuilder("ESSR AS ESSR");
    qb.select(
      [
        "ESSR.EBELN",
        "ESSR.EBELP",
        "ESSR.LBLNI",
        "ESSR.PACKNO",
        `json_agg(json_build_object(
	        'claim_qty', ESLL_SUBLINE.MENGE,
          'lineitem', ESSR.EBELP,
	        'description', ESLL_SUBLINE.KTEXT1,
	        'sublineitem', ESLL_SUBLINE.EXTROW,
	        'unit', ESLL_SUBLINE.MEINS,
	        'claim_amount', ESLL_SUBLINE.NETWR
	        )) AS line_item_array`,
      ]
    );
    qb.joinTable("LEFT", "ESLL AS ESLL_PACK", "ESSR.PACKNO = ESLL_PACK.PACKNO")
    qb.joinTable("LEFT", "ESLL AS ESLL_SUBLINE", "ESLL_SUBLINE.PACKNO = ESLL_PACK.SUB_PACKNO AND ESLL_SUBLINE.DEL != 'X'");
    qb.whereIn("ESSR.WDC", service_entry_numbers);
    qb.where("ESSR.LOEKZ ", "!=", "X");
    qb.groupBy("ESSR.EBELN, ESSR.EBELP, ESSR.LBLNI, ESSR.PACKNO");

    const { sql, params } = qb.build();

    let result = await poolQuery({ client, query: sql, values: params });
    let total_quantity = 0;
    let total_price = 0;
    let line_item_array = [];

    if (result.length) {
      for await (const item of result) {
        const item_line_item_array = item.line_item_array || [];
        line_item_array = [...line_item_array, ...item_line_item_array];
        total_quantity += item_line_item_array.reduce((a, item) => a + parseFloat(item.claim_qty || 0), 0);
        total_price += item_line_item_array.reduce((a, item) => a + parseFloat(item.claim_amount || 0), 0);
      }
    }

    const filalResult = {
      total_quantity,
      total_price,
      line_item_array,
    };

    return { success: true, statusCode: 200, message: "Value fetch success", data: filalResult };
  } catch (error) {
    console.error("Error making the request:", error.message);
    throw error;
  }
};

/**
 * Calculate total value
 * GRN AND SERVICE ENTRY VALUE
 * @param {Object} client
 * @param {Object} obj
 * @returns
 */
async function calculateGRNServiceEntryValue(client, obj) {
  const searchValue = obj.grn_no || obj.check_wdc_number;

  if (!searchValue) {
    return { success: false, statusCode: 200, message: "Please send GRN / WDC NO", data: Message.MANDATORY_INPUTS_REQUIRED };
  }
  const result = await Promise.all([
    getGrnIcgrnValue(client, { num: decodeURIComponent(obj.grn_no) || "GRN-NO", po: obj.po }),
    getServiceEntryValue(client, { num: decodeURIComponent(obj.check_wdc_number) || "SERVICE-NO", po: obj.po }),
  ]);

  // GRN/ICGRN VALUE IF ANY ERROR
  if (!result[0].success) {
    return result[0];
  }

  // SERVICE ENTRY VALUE IF ANY ERROR
  if (!result[1].success) {
    return result[1];
  }

  let responseObj = {
    total_price: 0,
    total_quantity: 0,
    totalIcgrnValue: 0,
    totalIcgrnQty: 0,
    totalSirValue: 0,
    totalSirQty: 0,
    icgrnSubLineItem: [],
    sirSubLineItem: [],
  };

  // CALCULATE TOTAL ICGRN/GRN VALUE AND QUANTITY
  if (result[0]?.data) {
    responseObj.totalIcgrnValue = parseFloat(result[0].data.totalUnitPrice || 0);
    responseObj.totalIcgrnQty = parseFloat(result[0].data.total_quantity || 0);
    responseObj.icgrnSubLineItem = result[0].data.line_item_array ?? [];
    responseObj.total_price = parseFloat(result[0].data.totalUnitPrice || 0);
    responseObj.total_quantity = parseFloat(result[0].data.total_quantity || 0);
  }

  // CALCULATE TOTAL SERVICE ENTRY VALUE AND QUANTITY
  if (result[1]?.data) {
    responseObj.totalSirValue = parseFloat(result[1].data.total_price || 0);
    responseObj.totalSirQty = parseFloat(result[1].data.total_quantity || 0);
    responseObj.sirSubLineItem = result[1].data.line_item_array ?? [];
    responseObj.total_price = parseFloat(responseObj.total_price) + parseFloat(result[1].data.total_price);
    responseObj.total_quantity = parseFloat((result[1].data.total_quantity || 0) + responseObj.total_quantity);
  }

  // total price need to decimal with round off...
  responseObj["total_price"] = responseObj["total_price"].toFixed(2);

  return { success: true, message: "Data fetch success", statusCode: 200, data: responseObj };

}

/**
 * SERVICE ENTRY VALUE
 * @param {Object} client
 * @param {Object} data
 * @returns
 */
async function getServiceBTNDetails(client, data) {
  try {
    if (!data.btn_num) {
      return { success: false, statusCode: 200, message: "Please send btn number", data: Message.MANDATORY_INPUTS_REQUIRED };
    }
    const val = [];
    val.push(data.btn_num);

    const getBtnQuery = `SELECT
                s_btn.*,
                btn_assign.assign_by,
                btn_assign.assign_to,
                users_btn_assign_to.cname AS assign_to_name,
                users_assign_to_fi.cname AS assign_by_fi_name,
                btn_assign.assign_by_fi,
                btn_assign.assign_to_fi,
                btn_assign.last_assign,
                btn_assign.last_assign_fi,
                -- btn_authority.entry_number,
                -- btn_authority.entry_type,
                btn_authority.other_deduction,
                btn_authority.deduction_remarks,
                btn_authority.total_deduction,
                btn_authority.net_payable_amount,
                btn_authority.estimated_ld,
                btn_authority.retension_remarks,
                btn_authority.retension_amount,
                btn_authority.retension_rate,
                btn_authority.max_ld,
                btn_authority.retension_remarks,
                users.cname AS bill_certifing_authority_name
            FROM 
              btn_service_hybrid AS s_btn 
            LEFT JOIN btn_assign AS btn_assign
                ON(s_btn.btn_num = btn_assign.btn_num)
            LEFT JOIN pa0002 as users 
                ON(users.pernr :: character varying = s_btn.bill_certifing_authority)
            LEFT JOIN pa0002 as users_btn_assign_to
                ON(users_btn_assign_to.pernr :: character varying = btn_assign.assign_to) 
            LEFT JOIN pa0002 as users_assign_to_fi
                ON(users_assign_to_fi.pernr :: character varying = btn_assign.assign_to_fi) 
            LEFT JOIN btn_service_certify_authority as btn_authority 
                ON(s_btn.btn_num = btn_authority.btn_num)
            WHERE s_btn.btn_num = $1`;
    // AND s_btn.bill_certifing_authority = '600700'
    // btn_assign.*,
    // LEFT JOIN btn_assign AS btn_assign

    const result = await poolQuery({ client, query: getBtnQuery, values: val });

    let response = result[0] || {};
    response.wdc_details = {};
    // wdc_number_no

    let wdc_number_no = [];
    if (response.wdc_number && typeof response.wdc_number == 'string') {
      wdc_number_no = response.wdc_number.split(",");
    }

    const wdcData = await getWdcDetails(client, { wdc_number_no });
    if (wdcData && wdcData.length) {
      response.wdc_details = mergeWdcData(wdcData);
    }
    const supDocs = await supportingDataForServiceBtn(client, response.purchasing_doc_no);
    response = { ...response, ...supDocs };
    return { success: true, statusCode: 200, message: "Value fetch success", data: response };
  } catch (error) {
    console.error("getServiceBTNDetails error", error.message, error.stack);
    throw error;
  }
}

/**
 * Get a single Service BTN row with dynamic select fields and where conditions
 * @param {Object} client - pg client (optional)
 * @param {string[]} selectFields - fields to select
 * @param {Object} whereConditionObj - conditions { column: value }
 * @returns {Promise<Object|null>}
 */
async function getServiceBtn(client, selectFields = "*", whereConditionObj = {}) {
  try {
    const keys = Object.keys(whereConditionObj);
    const values = Object.values(whereConditionObj);

    const whereClause = keys.length ? "WHERE " + keys.map((key, i) => `"${key}" = $${i + 1}`).join(" AND ") : "";
    const query = ` SELECT ${selectFields} FROM ${BTN_SERVICE_HYBRID} ${whereClause} LIMIT 1 `;
    const executor = client ? poolQuery : getQuery;
    const result = await executor({ client, query, values });

    return result?.[0] || null;

  } catch (error) {
    console.error("getServiceBtn error:", error.message);
    throw error;
  }
}

async function supportingDataForServiceBtn(client, poNo) {
  const response = await Promise.all([
    // getHrComplianceDetails(client, [poNo], true),
    [],
    getSDBGApprovedFiles(client, [poNo, APPROVED, ACTION_SDBG]),
    getPBGApprovedFiles(client, [poNo, APPROVED, ACTION_PBG]),
    getVendorDetails(client, [poNo]),
    getContractutalSubminissionDate(client, [poNo]),
    getActualSubminissionDate(client, [poNo]),
  ]);

  let result = {
    hrDetais: response[0], //  getHrDetails,
  };
  if (response[1][0]) {
    result = { ...result, sdbgFiles: response[1] };
  }
  if (response[2][0]) {
    result = { ...result, pbgFiles: response[2] };
  }
  if (response[3][0]) {
    result = { ...result, ...response[3][0] };
  }

  if (response[4] && response[4][0]) {
    const con = response[4].find((el) => el.MID == MID_SDBG);
    result.c_sdbg_date = con?.PLAN_DATE;
  }
  if (response[5] && response[5][0]) {
    const act = response[5].find((el) => el.MID == parseInt(MID_SDBG));
    result.a_sdbg_date = act?.PLAN_DATE;
  }

  return result;
}

const updateServiceBtnListTable = async (client, data = {}, tokenData) => {
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
  const lasBtnDetails = await poolQuery({ client, query: getLatestDataQuery, values: [data.btn_num] });
  let btnListTablePaylod = { btn_num: data.btn_num };

  if (lasBtnDetails.length) {
    btnListTablePaylod = {
      ...lasBtnDetails[0],
      status: data.status || REJECTED,
      assign_by: tokenData.vendor_code,
      assign_to: data.assign_to || lasBtnDetails[0]?.vendor_code,
      remarks: data.remarks || "BTN Rejected",
      created_at: getEpochTime(),
    };
    const { q, val } = generateQuery(INSERT, "btn_list", btnListTablePaylod);

    await poolQuery({ client, query: q, values: val });
  } else {
  }
};

async function btnCurrentDetailsCheck(client, data, currentStatus) {

  const checkStatus = new Set([STATUS_RECEIVED, REJECTED, BTN_STATUS_BANK, BTN_STATUS_HOLD_TEXT, BTN_STATUS_PROCESS, SUBMITTED_BY_CAUTHORITY]);

  if (data.status === SUBMITTED_BY_CAUTHORITY) {
    checkStatus.add(BTN_STATUS_DRETURN);
    checkStatus.add(SUBMITTED_BY_VENDOR);
    checkStatus.add(STATUS_RECOMMEND);
    checkStatus.delete(STATUS_RECEIVED);
    checkStatus.delete(SUBMITTED_BY_CAUTHORITY);
  }
  if (data.status === STATUS_RECEIVED) {
    checkStatus.add(BTN_STATUS_DRETURN);
    checkStatus.add(SUBMITTED_BY_VENDOR);
    checkStatus.delete(SUBMITTED_BY_CAUTHORITY);
  }
  if (data.status === STATUS_DELEGATED) {
  }
  if (data.status === STATUS_RECOMMEND) {
    checkStatus.add(BTN_STATUS_DRETURN);
    checkStatus.add(SUBMITTED_BY_VENDOR);
    checkStatus.delete(SUBMITTED_BY_CAUTHORITY);
  }
  if (data.status === NOT_RECOMMEND) {
    checkStatus.add(BTN_STATUS_DRETURN);
    checkStatus.add(SUBMITTED_BY_VENDOR);
    checkStatus.delete(SUBMITTED_BY_CAUTHORITY);
  }

  let isInvalid = false;

  if (checkStatus.has(currentStatus.status)) {
    isInvalid = true;
  }
  return {
    isInvalid,
    currentStatus: currentStatus.status,
    message: `already ${currentStatus.status}`,
  };
}

// eslint-disable-next-line no-unused-vars
async function serviceBtnMailSend(tokenData, payload, event) {
  try {
    let emailUserDetailsQuery;
    let emailUserDetails;
    let dataObj = payload;
    // email done
    if (tokenData.user_type == USER_TYPE_VENDOR && payload.status == SUBMITTED) {

      let buildQuery = "";
      emailUserDetailsQuery = "SELECT * FROM (";
      buildQuery += emailUserDetailsQuery;
      buildQuery += getUserDetailsQuery("vendor_and_do", "$1");
      buildQuery += "UNION";
      buildQuery += getUserDetailsQuery("bill_certifing_authrity", "$2");
      buildQuery += ") AS mail_info";

      emailUserDetails = await getQuery({
        query: buildQuery,
        values: [payload.purchasing_doc_no, payload.bill_certifing_authority],
      });
      await sendMail(BTN_UPLOAD_CHECKLIST, dataObj, { users: emailUserDetails }, BTN_UPLOAD_CHECKLIST);
    }

    if (tokenData.user_type != USER_TYPE_VENDOR && payload.status == FORWARD_TO_FINANCE) {
      emailUserDetailsQuery = getUserDetailsQuery("venode_by_po");
      emailUserDetails = await getQuery({
        query: emailUserDetailsQuery,
        values: [payload.purchasing_doc_no],
      });
      await sendMail(BTN_FORWORD_FINANCE, dataObj, { users: emailUserDetails }, BTN_FORWORD_FINANCE);
    }

    // email done
    if (tokenData.user_type != USER_TYPE_VENDOR && payload.status == STATUS_RECEIVED) {
      emailUserDetailsQuery = getUserDetailsQuery("finance_staff", "$1");
      emailUserDetails = await getQuery({
        query: emailUserDetailsQuery,
        values: [payload.assign_to_fi],
      });

      await sendMail(BTN_ASSIGN_TO_STAFF, dataObj, { users: emailUserDetails }, BTN_ASSIGN_TO_STAFF);
    }
    // email done
    if (tokenData.user_type != USER_TYPE_VENDOR && payload.status == REJECTED) {

      emailUserDetailsQuery = getUserDetailsQuery("vendor_by_sbtn", "$1");

      emailUserDetails = await getQuery({
        query: emailUserDetailsQuery,
        values: [payload.btn_num],
      });

      dataObj = { ...dataObj, vendor_name: emailUserDetails[0]?.u_name };
      await sendMail(BTN_REJECT, dataObj, { users: emailUserDetails }, BTN_REJECT);
    }

    // WORKING -- ONLY SUBJECT ISSUE , SUBJECT MAY TO CHANGE
    if (tokenData.user_type != USER_TYPE_VENDOR && payload.status == SUBMITTED_BY_CAUTHORITY) {
      let buildQuery = "";
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
      await sendMail(BTN_FORWORD_FINANCE, dataObj, { users: emailUserDetails }, BTN_FORWORD_FINANCE);
    }
  } catch (error) {
    console.error("handelMail service btn", error.toString(), error.stack);
  }
}

const getWdcDetails = async (client, data) => {
  const { wdc_number_no } = data;
  if (!wdc_number_no?.length) return [];

  let variableCout = 0;
  // eslint-disable-next-line no-unused-vars
  const wdcRefPlaceholders = wdc_number_no.map((_, i) => `$${++variableCout}`).join(", ");

  let q = `SELECT 
        wdc.reference_no,
        wdc.purchasing_doc_no,
        wdc.action_type,
        wdc.total_amount,
        wdc.yard_no,
        wdc.stage_details,
        wdc.work_title,
        wdc.assigned_to,
        users.cname as assigned_to_name,
        COALESCE(
            JSON_AGG(
                JSONB_BUILD_OBJECT(
                    'wdc_reference_no', wdc_line.reference_no,
                    'claim_amount', wdc_line.claim_amount,
                    'lineitem', wdc_line.lineitem,
                    'sublineitem', wdc_line.sublineitem,
                    'claim_qty', wdc_line.claim_qty,
                    'description', wdc_line.description,
                    'delay', wdc_line.delay,
                    'actual_completion', wdc_line.actual_completion,
                    'unit', wdc_line.unit
                )
            ) FILTER (WHERE wdc_line.reference_no IS NOT NULL), 
            '[]'::json
        ) AS wdc_line_item,
        MAX(wdc_line.actual_completion) AS max_actual_completion
      FROM public.wdc AS wdc
      LEFT JOIN public.wdc_line AS wdc_line 
        ON wdc.reference_no = wdc_line.reference_no 
        AND wdc.created_at = wdc_line.wdc_id
      LEFT JOIN pa0002 as users
       ON wdc.assigned_to = users.pernr :: character varying
      WHERE wdc.reference_no IN(${wdcRefPlaceholders}) AND wdc.status = $${++variableCout} AND wdc.action_type = $${++variableCout}
      GROUP BY wdc.reference_no, wdc.purchasing_doc_no, wdc.action_type, wdc.total_amount, wdc.status, wdc.id, users.cname`;

  let result = await poolQuery({ client, query: q, values: [...wdc_number_no, APPROVED, TYPE_WDC] });

  return result;
};

function mergeWdcData(wdcData = []) {
  if (!Array.isArray(wdcData) || wdcData.length === 0) return {};

  const result = {
    purchasing_doc_no: wdcData[0]?.purchasing_doc_no || "",
    total_amount: 0,
    yard_no: [],
    stage_details: [],
    work_title: [],
    assigned_to: [],
    assigned_to_name: [],
    wdc_line_item: [],
    max_actual_completion: [],
  };

  wdcData.forEach(item => {
    // Safely parse total amount
    const amount = parseFloat(item.total_amount || 0);
    result.total_amount += amount;

    // Push all string-based data (to be joined later)
    result.yard_no.push(item.yard_no || "");
    result.stage_details.push(item.stage_details || "");
    result.work_title.push(item.work_title || "");
    result.assigned_to.push(`${item.assigned_to_name} (${item.assigned_to})`);
    result.assigned_to_name.push(item.assigned_to_name || "");
    result.max_actual_completion.push(item.max_actual_completion || "");

    // Merge all line items
    if (Array.isArray(item.wdc_line_item)) {
      result.wdc_line_item.push(...item.wdc_line_item);
    }
  });

  // Convert arrays to comma-separated strings
  return {
    purchasing_doc_no: result.purchasing_doc_no,
    total_amount: result.total_amount.toFixed(3),
    yard_no: result.yard_no.filter(Boolean).join(", "),
    stage_details: result.stage_details.filter(Boolean).join(", "),
    work_title: result.work_title.filter(Boolean).join(", "),
    assigned_to: result.assigned_to.filter(Boolean).join(", "),
    assigned_to_name: [...new Set(result.assigned_to_name.filter(Boolean))].join(", "), // unique names
    line_item_array: result.wdc_line_item,
    max_actual_completion: result.max_actual_completion.filter(Boolean).join(", "),
  };
}
/**
 * ALL BTN GET BY SAME WDC NO, 
 * NOW CHECK IF ALL BTN ARE REJECTED UNDER THE WDC LINK BTN
 * @param {*} allBtns 
 * @returns 
 */
const checkIsAllBtnRejectd = (allBtns) => {
  return allBtns.every((el) => el.status == REJECTED)
}

const checkIsRejectedTheBtnByWDCNo = async (client, btn_nums) => {
  const qb = new QueryBuilder("btn_service_hybrid");
  qb.select(["COUNT(btn_num) as btn_reject_count"]);
  qb.where("status", "=", REJECTED);
  qb.whereIn("btn_num", btn_nums.map((btn) => btn.btn_num));
  const checkIsRejectdQb = qb.toJSON();
  let check_rejected = await poolQuery({ client, query: checkIsRejectdQb.sql, values: checkIsRejectdQb.params });

  return check_rejected[0]?.btn_reject_count;

}

/**
 * getBtnNumbersAssocateWithBtn
 * @param {*} client 
 * @param {*} data 
 */
const getBtnNumbersAssocateWithBtn = async (client, data) => {

  const qb = new QueryBuilder("btn_service_linkedwdc as sbtn_linkedwdc");
  qb.select(["sbtn_linkedwdc.btn_num, sbtn.status, sbtn.created_at"])
    .joinTable("LEFT", `${BTN_SERVICE_HYBRID} AS sbtn `, "sbtn_linkedwdc.btn_num = sbtn.btn_num ")
    .whereIn("wdc_reference_no", data.wdc_numbers);
  const checkBtnNumberBuildQuery = qb.toJSON();

  let check_invoice = await poolQuery({
    client,
    query: checkBtnNumberBuildQuery.sql,
    values: checkBtnNumberBuildQuery.params
  });
  return check_invoice;
}

/**
 * GET HR COMPLIANCE UPLOADED DATA
 * @param {Object} client
 * @param {Object} data
 * @param {Boolean} monthFilter
 * @returns {Promise<Object>}
 * @throws {Error} If the query execution fails, an error is thrown
 */

const getHrComplianceDetails = async (client, data, invoice_date) => {
  let count = 0;
  let values = [];

  const purchasing_doc_no = data.purchasing_doc_no;

  let conditionQuery = " WHERE 1=1";
  conditionQuery += " AND hr_compliance_data.status = 'APPROVED' ";

  // units filter
  if (data.units?.length) {
    const unitsPlaceholders = data.units.map(() => `$${++count}`).join(", ");
    conditionQuery += ` AND hr_compliance.unit IN (${unitsPlaceholders})`;
    values.push(...data.units);
  }

  // purchasing_doc_no filter
  conditionQuery += ` AND hr_compliance.purchasing_doc_no = $${++count}`;
  values.push(purchasing_doc_no);

  // compliance month/year filter
  if (invoice_date) {
    const monthYearPairs = getPreviousMonthsYearWithCurrent(invoice_date, 1);
    if (monthYearPairs.length) {
      const monthYearConditions = monthYearPairs.map(({ month, year }) => {
        const mIndex = ++count;
        const yIndex = ++count;
        values.push(month, year);
        return `(hr_compliance_data.compliance_month = $${mIndex} AND hr_compliance_data.compliance_year = $${yIndex})`;
      });
      conditionQuery += ` AND ( ${monthYearConditions.join(" OR ")} )`;
    }
  }

  const q = `
      SELECT 
        hr_compliance.ref_group, 
        hr_compliance.unit, 
        hr_compliance_data.compliance_year, 
        hr_compliance_data.compliance_month,
        hr_compliance_data.compliance,
        hr_compliance_data.compliance_group_id
      FROM hr_compliance AS hr_compliance
      LEFT JOIN hr_compliance_data AS hr_compliance_data 
        ON hr_compliance_data.ref_group = hr_compliance.ref_group
    `;

  console.log("Compliance check query : ", q + conditionQuery, "values", values);
  const result = await poolQuery({ client, query: q + conditionQuery, values })
  console.log("Compliance query result result", result);
  return result;
};

function getPreviousMonthsYearWithCurrent(dateStr, monthsBack) {
  const date = new Date(dateStr);
  const result = [];

  for (let i = 0; i <= monthsBack; i++) {  // start from 0 to include current
    const prev = new Date(date);
    prev.setMonth(prev.getMonth() - i);

    result.push({
      month: prev.getMonth() + 1, // 1-based month
      year: prev.getFullYear(),
    });
  }

  return result;
}

function checkCompliances(units, complianceData) {

  const requiredCompliances = ['PF', 'ESI', 'WAGES'];
  const additionalCompliances = ['BONUS', 'LEAVE_SALARY', 'OTHERS'];

  const unitComplianceMap = units.reduce((acc, unit) => {
    acc[unit] = new Set(
      complianceData.filter(c => c.unit === unit).map(c => c.compliance.toUpperCase())
    );
    return acc;
  }, {});

  // Step 2: Check for missing required compliances
  const errors = [];

  units.forEach(unit => {
    const unitCompliances = unitComplianceMap[unit];
    const missing = requiredCompliances.filter(c => !unitCompliances.has(c));
    if (missing.length > 0) {
      errors.push(`${unit} unit, Missing compliance(s) : ${missing.join(", ")}`);
    }
  });

  // Step 3: Build final response
  if (errors.length > 0) {

    return { success: false, message: "Compliance not submitted (WDC completion/previous month).", data: errors };
  } else {
    const allCompliances = [...requiredCompliances, ...additionalCompliances];
    const response = {};

    allCompliances.forEach(comp => {
      const key = `${comp.toLowerCase()}_compliance`;
      const presentInAll = units.every(unit => unitComplianceMap[unit].has(comp));
      response[key] = presentInAll ? "Y" : null;
    });
    return { success: true, message: "Compliance checked:", data: response };
  }

}

async function allDetailsAboutHrCompliances(client, data) {

  const hrResult = await getHrComplianceDetails(client, data, data.invoice_date);
  const checkedCompliences = checkCompliances(data.units, hrResult);
  console.log("checkedCompliences", checkedCompliences);
  return checkedCompliences

}

function getMaxDate(lineItemArr) {
  let maxDate = 0;
  for (let item of lineItemArr) {
    maxDate = Math.max(maxDate, item.actual_completion)
  }
  return maxDate;
}

/**
 * UPDATE BTN IN BTN TABLE
 * @param {*} client 
 * @param {*} btn_num 
 * @param {*} btnPayload 
 */
async function updateServiceBtn(client, btn_num, btnPayload) {
  const { q, val } = generateQuery(UPDATE, BTN_SERVICE_HYBRID, btnPayload, { btn_num });
  await poolQuery({ client, query: q, values: val });
}

async function wdcAndBtnLinedSave(client, wdc_numbers, btn_num) {
  const linkedWdcAndBtn = wdc_numbers?.map((wdc) => ({ wdc_reference_no: wdc, btn_num }));

  const { q, val } = await generateQueryForMultipleData(linkedWdcAndBtn, BTN_SERVICE_LINKEDWDC, ["id"]);

  await poolQuery({ client, query: q, values: val });
  return linkedWdcAndBtn
}

module.exports = {
  payloadObj,
  checkHrCompliance,
  getContractutalSubminissionDate,
  getActualSubminissionDate,
  addToBTNListFn,
  getGrnIcgrnValue,
  getServiceEntryValue,
  btnCurrentDetailsCheck,
  forwordToFinacePaylaod,
  getServiceBTNDetails,
  btnAssignPayload,
  supportingDataForServiceBtn,
  updateServiceBtnListTable,
  serviceBtnMailSend,
  getWdcDetails,
  calculateGRNServiceEntryValue,
  checkIsRejectedTheBtnByWDCNo,
  allDetailsAboutHrCompliances,
  getMaxDate,
  btnDelegatePayload,
  btnRecomendPayload,
  getServiceBtn,
  updateServiceBtn,
  wdcAndBtnLinedSave,
  mergeWdcData,
  getBtnNumbersAssocateWithBtn,
  checkIsAllBtnRejectd
};
