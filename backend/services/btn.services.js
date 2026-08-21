// /* eslint-disable no-useless-catch */
const { poolQuery, poolClient } = require("../config/pgDbConfig");
const {
  MID_SDBG,
  MID_DRAWING,
  MID_QAP,
  BTN_ADVANCE_BILL,
  BTN_HYBRID_BILL_MATERIAL,
  BILL_INCORRECT_DEDUCTIONS,
  BTN_CLAIM_AGAINST_PBG,
  BTN_CLAIM_AGAINST_JCC,
  BTN_SERVICE_CONTRACT_BILL,
  UPDATE,
  MID_ILMS,
} = require("../lib/constant");

const { BTN_STATUS_PAYMENT_DONE_TEXT, SUBMITTED_BY_VENDOR } = require("../lib/status");
const { generateQuery } = require("../lib/utils");
// const { getContractutalSubminissionDate, getActualSubminissionDate, vendorDetails, getSDBGApprovedFiles, getPBGApprovedFiles } = require("./btnServiceHybrid.services");
// const Message = require("../utils/messages");
const { BTN_MATERIAL, BTN_ANY_OTHER_CLAIM, BTN_SERVICE_HYBRID, BTN_JCC } = require("../lib/tableName");
const {
  calculateTotals,
  calculateTotalGrnValue,
} = require("../utils/btnUtils");

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
    invoice_value: payload.invoice_value || "",
    invoice_date: payload.invoice_date || "",
    invoice_type: payload.invoice_type,
    // grn_nos: payload.grn_nos || "",
    // icgrn_nos: payload.icgrn_nos || "",
    // suppoting_invoice_filename: payload.suppoting_invoice_filename || "",
    invoice_supporting_filename: payload.invoice_supporting_filename || "",
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
    btn_type: BTN_ADVANCE_BILL,
    hsn_gstn_icgrn: true,
    // updated_by: payload.updated_by || "",
    created_at: payload.created_at || "",
    created_by_id: payload.created_by_id || "",
  };

  return pl;
};
// const advBillHybridbtnDOPayload = (payload) => {
//   if (!payload || !Object.keys(payload).length)
//     throw new Error("Invalid payload in advBillHybridbtnPayload");

//   const pl = {
//     btn_num: payload.btn_num,
//     drg_penalty: payload.drg_penalty || "",
//     net_payable_amount: payload.net_payable_amount,
//     penalty_rate: payload.penalty_rate,
//     penalty_ammount: payload.penalty_ammount,
//     recomend_payment: payload.recomend_payment,
//     // a_drawing_date: payload.a_drawing_date,
//     created_at: payload.created_at || getEpochTime(),
//     created_by: payload.created_by || "",
//   };

//   return pl;
// };

// const checkMissingActualSubmissionDate = async () => {
//   let a_sdbg_date_q = `SELECT actualSubmissionDate AS PLAN_DATE, milestoneText AS MTEXT FROM actualsubmissiondate WHERE purchasing_doc_no = ?`;
//   let a_dates = await getQuery({
//     query: a_sdbg_date_q,
//     values: [purchasing_doc_no],
//   });
//   const a_dates_arr = [A_SDBG_DATE, A_DRAWING_DATE, A_QAP_DATE, A_ILMS_DATE];
//   for (const item of a_dates_arr) {
//     const i = a_dates.findIndex((el) => el.MTEXT == item);
//     if (i < 0) {
//       // return resSend(res, false, 200, `${item} is missing!`, null, null);
//       return { success: false, message: item };
//     }
//   }

//   return { success: true, message: "ALL DATE PRESENT" };
// };

const filesData = (payloadFiles) => {
  // Handle uploaded files
  const fileObj = {};
  if (Object.keys(payloadFiles).length) {
    Object.keys(payloadFiles).forEach((el) => {
      const fileNameAfterRemove = el?.replace("_filename", "");
      fileObj[fileNameAfterRemove + "_filename"] =
        payloadFiles[el][0]["filename"];
      fileObj[fileNameAfterRemove + "_file_path"] = payloadFiles[el][0]["path"];
    });
  }
  return fileObj;
};

const getContractualSubmissionDate = async (purchasing_doc_no, client) => {
  let c_sdbg_date_q = `SELECT PLAN_DATE as "PLAN_DATE", MTEXT as "MTEXT", MID as "MID"  FROM zpo_milestone WHERE EBELN = $1`;
  const c_dates = await poolQuery({
    client,
    query: c_sdbg_date_q,
    values: [purchasing_doc_no],
  });
  const contractualDateObj = {};
  c_dates.forEach((item) => {
    if (item.PLAN_DATE && parseInt(item.MID) === parseInt(MID_SDBG)) {
      contractualDateObj.c_sdbg_date = new Date(item.PLAN_DATE).getTime();
    } else if (item.PLAN_DATE && parseInt(item.MID) === parseInt(MID_DRAWING)) {
      contractualDateObj.c_drawing_date = new Date(item.PLAN_DATE).getTime();
    } else if (item.PLAN_DATE && parseInt(item.MID) === parseInt(MID_QAP)) {
      contractualDateObj.c_qap_date = new Date(item.PLAN_DATE).getTime();
    } else if (item.PLAN_DATE && parseInt(item.MID) === parseInt(MID_ILMS)) {
      contractualDateObj.c_ilms_date = new Date(item.PLAN_DATE).getTime();
    }
  });

  return {
    success: true,
    data: contractualDateObj,
    msg: "success",
    result: c_dates,
  };
};
const getActualSubmissionDate = async (purchasing_doc_no, client) => {
  const actualSubmissionObj = {};
  let a_date_q = `SELECT actualSubmissionDate AS "PLAN_DATE", milestoneText AS "MTEXT", milestoneid as "MID" FROM actualsubmissiondate WHERE purchasing_doc_no = $1`;
  const a_dates = await poolQuery({
    client,
    query: a_date_q,
    values: [purchasing_doc_no],
  });

  a_dates.forEach((item) => {
    if (item.PLAN_DATE && parseInt(item.MID) === parseInt(MID_SDBG)) {
      actualSubmissionObj.a_sdbg_date = new Date(
        Number(item.PLAN_DATE),
      ).getTime();
    } else if (item.PLAN_DATE && parseInt(item.MID) === parseInt(MID_DRAWING)) {
      actualSubmissionObj.a_drawing_date = new Date(
        Number(item.PLAN_DATE),
      ).getTime();
    } else if (item.PLAN_DATE && parseInt(item.MID) === parseInt(MID_QAP)) {
      actualSubmissionObj.a_qap_date = new Date(
        Number(item.PLAN_DATE),
      ).getTime();
    } else if (item.PLAN_DATE && parseInt(item.MID) === parseInt(MID_ILMS)) {
      actualSubmissionObj.a_ilms_date = new Date(
        Number(item.PLAN_DATE),
      ).getTime();
    }
  });

  return {
    success: true,
    data: actualSubmissionObj,
    msg: "success",
    result: a_dates,
  };
};

const dateToEpochTime = (date) => {
  return date ? new Date(date).getTime() : null;
};

async function getGateEntryDetails(client, values) {
  let gate_entry_q = `SELECT 
      ZMM_GATE_ENTRY_D.ENTRY_NO AS GATE_ENTRY_NO,
    	ZMM_GATE_ENTRY_H.ENTRY_DATE AS GATE_ENTRY_DATE,
    	ZMBLNR AS GRN_NO,
    	EBELP AS PO_LINEITEM,
    	INV_DATE AS INVOICE_DATE
    FROM ZMM_GATE_ENTRY_D AS ZMM_GATE_ENTRY_D
      LEFT JOIN ZMM_GATE_ENTRY_H AS ZMM_GATE_ENTRY_H ON (ZMM_GATE_ENTRY_D.ENTRY_NO = ZMM_GATE_ENTRY_H.ENTRY_NO)
    WHERE 
      ( 1 = 1 AND ZMM_GATE_ENTRY_D.EBELN = $1
    	  AND ZMM_GATE_ENTRY_D.INVNO = $2)`;

  let gate_entry_v = await poolQuery({ client, query: gate_entry_q, values });
  return gate_entry_v;
}

/**
 * GRN DETAILS REMOVE CANCEL GRN
 * ACCEPT (UD/101) GRN DETAILS
 * @param {*} client
 * @param {*} values
 * @returns Object[]
 */
async function getGrnDetails(client, values) {
  if (!values.length) return [];
  const placeholder = values.map((_, index) => `$${index + 1}`).join(",");

  const grn_value_q = `
    SELECT 
        mseg.mblnr, 
        mseg.bwart, 
        mseg.lfbnr,
	      mseg.matnr as mat_no,
        mseg.mblnr as grn_no,
        mseg.lfbnr as ref_grn_no,
        mseg.menge as grn_quantity,
        mseg.erfmg as unit_quantity,
         --mseg.bpmng as return_quantity,
        mseg.lbkum as return_quantity,
        mseg.ebeln as purchasing_doc_no,
        mseg.ebelp as po_lineitem,
        mseg.insmk as grn_reqired,
        mseg.dmbtr as price,
        ekpo.txz01 as mat_desc,
        ekpo.meins as mat_unit,
        ekpo.netpr as unit_price
    FROM mseg AS mseg
      LEFT JOIN ekpo AS ekpo
        ON (ekpo.ebeln = mseg.ebeln AND ekpo.ebelp = mseg.ebelp)
    WHERE mseg.bwart IN ('101')
      AND NOT EXISTS (
        SELECT 1
        FROM mseg AS cancel_mseg
        WHERE cancel_mseg.bwart IN ('102')
          AND cancel_mseg.lfbnr = mseg.mblnr
    )
    AND mblnr IN (${placeholder})`;

  /**
   * REMOVE BECAUSE OF
   * ekpo.ebeln = mseg.ebeln AND ekpo.ebelp = mseg.ebelp NO NEED matnr
   */
  //  ON (ekpo.ebeln = mseg.ebeln AND ekpo.ebelp = mseg.ebelp AND ekpo.matnr = mseg.matnr)

  let grn_value = await poolQuery({ client, query: grn_value_q, values });

  if (grn_value.length) {
    grn_value = grn_value.map((el) => ({
      ...el,
      quantity: parseFloat(el.grn_quantity)
        ? el.grn_quantity
        : el.unit_quantity,
    }));
  }

  return grn_value;
}

/**
 * HANDLE RETURN GRN DETAILS (122 AND 123)
 * @param {DB client} client
 * @param {String[]} values
 * @returns
 */
async function getReturnedGrnDetails(client, values) {
  if (!values.length) return [];
  const placeholder = values.map((_, index) => `$${index + 1}`).join(",");

  const grn_value_q = `
    SELECT 
        mseg.mblnr, 
        mseg.bwart, 
        mseg.lfbnr,
	      mseg.matnr as mat_no,
        mseg.mblnr as grn_no,
        mseg.lfbnr as ref_grn_no,
        mseg.menge as grn_quantity,
        mseg.erfmg as unit_quantity,
        --mseg.bpmng as return_quantity,
        mseg.menge as return_quantity,
        mseg.ebeln as purchasing_doc_no,
        mseg.ebelp as po_lineitem,
        mseg.insmk as grn_reqired,
        mseg.dmbtr as price,
        ekpo.txz01 as mat_desc,
        ekpo.meins as mat_unit,
        ekpo.netpr as unit_price
    FROM mseg AS mseg
      LEFT JOIN ekpo AS ekpo
        ON (ekpo.ebeln = mseg.ebeln AND ekpo.ebelp = mseg.ebelp)
    WHERE mseg.bwart IN ('122')
      AND NOT EXISTS (
        SELECT 1
        FROM mseg AS cancel_return_mseg
        WHERE cancel_return_mseg.bwart IN ('123')
          AND cancel_return_mseg.lfbnr = mseg.mblnr
    )
    AND mseg.lfbnr IN (${placeholder})`;

  /**
   * REMOVE BECAUSE OF
   * ekpo.ebeln = mseg.ebeln AND ekpo.ebelp = mseg.ebelp NO NEED matnr
   */
  //  ON (ekpo.ebeln = mseg.ebeln AND ekpo.ebelp = mseg.ebelp AND ekpo.matnr = mseg.matnr)

  let returnGrnDetails = await poolQuery({
    client,
    query: grn_value_q,
    values,
  });

  if (returnGrnDetails.length) {
    returnGrnDetails = returnGrnDetails.map((el) => ({
      ...el,
      quantity: parseFloat(el.grn_quantity)
        ? el.grn_quantity
        : el.unit_quantity,
    }));
  }

  return returnGrnDetails;
}
/**
 * HANDLE RETURN GRN DETAILS (122 AND 123)
 * @param {DB client} client
 * @param {String[]} values
 * @returns
 */
async function getReturnedGrnDetailsByGrnNos(client, values) {
  if (!values.length) return [];
  const placeholder = values.map((_, index) => `$${index + 1}`).join(",");

  const grn_value_q = `
    SELECT 
        mseg.mblnr, 
        mseg.bwart, 
        mseg.lfbnr,
	      mseg.matnr as mat_no,
        mseg.mblnr as grn_no,
        mseg.lfbnr as ref_grn_no,
        mseg.menge as grn_quantity,
        mseg.erfmg as unit_quantity,
        --mseg.bpmng as return_quantity,
        mseg.menge as return_quantity,
        mseg.ebeln as purchasing_doc_no,
        mseg.ebelp as po_lineitem,
        mseg.insmk as grn_reqired,
        mseg.dmbtr as price,
        ekpo.txz01 as mat_desc,
        ekpo.meins as mat_unit,
        ekpo.netpr as unit_price
    FROM mseg AS mseg
      LEFT JOIN ekpo AS ekpo
        ON (ekpo.ebeln = mseg.ebeln AND ekpo.ebelp = mseg.ebelp)
    WHERE mseg.bwart IN ('122')
      AND NOT EXISTS (
        SELECT 1
        FROM mseg AS cancel_return_mseg
        WHERE cancel_return_mseg.bwart IN ('123')
          AND cancel_return_mseg.lfbnr = mseg.mblnr
    )
    AND mseg.lfbnr IN (${placeholder})`;

  /**
   * REMOVE BECAUSE OF
   * ekpo.ebeln = mseg.ebeln AND ekpo.ebelp = mseg.ebelp NO NEED matnr
   */
  //  ON (ekpo.ebeln = mseg.ebeln AND ekpo.ebelp = mseg.ebelp AND ekpo.matnr = mseg.matnr)

  let returnGrnDetails = await poolQuery({
    client,
    query: grn_value_q,
    values,
  });

  if (returnGrnDetails.length) {
    returnGrnDetails = returnGrnDetails.map((el) => ({
      ...el,
      quantity: parseFloat(el.grn_quantity)
        ? el.grn_quantity
        : el.unit_quantity,
    }));
  }

  return returnGrnDetails;
}

async function getAssociatePoList(client, values) {
  const getAssociatepoQuery = `SELECT DISTINCT ebeln AS PURCHASING_DOC_NO 
      FROM zmm_gate_entry_d AS ge_d 
        WHERE ge_d.EBELN != $1 AND ge_d.INVNO = $2 `;
  let associatePos = await poolQuery({
    client,
    query: getAssociatepoQuery,
    values,
  });
  return associatePos;
}

// eslint-disable-next-line no-unused-vars
async function getIcgrnDetails(client, grn_values, data = { EBELN: null }) {
  if (!grn_values.length) return [];

  const placeholder = grn_values.map((_, index) => `$${index + 1}`).join(",");
  const icgrn_q = `SELECT 
      qals.PRUEFLOS AS icgrn_nos, 
      qals.MATNR as mat_no,
      qals.MBLNR as grn_no,
      qals.ebeln as purchasing_doc_no,
      qals.ebelp as po_lineitem,
      ekpo.NETPR as price,
      qals.LMENGE01 as accepted_quantity,
      qals.LMENGE04 as blocked_quantity,
      qals.LMENGE07 as rejected_quantity,
      qals.LMENGEPR as insp_quantity
    FROM qals as qals
      left join ekpo as ekpo
        ON (ekpo.ebeln = qals.ebeln AND ekpo.ebelp = qals.ebelp AND ekpo.matnr = qals.matnr)
    WHERE BWART IN ('101') AND MBLNR IN (${placeholder})`; //   MBLNR (GRN No) PRUEFLOS (Lot Number)
  let icgrn_no = await poolQuery({
    client,
    query: icgrn_q,
    values: grn_values,
  });
  let blocked = [];
  icgrn_no = icgrn_no.map((item) => {
    const accepted = parseFloat(item?.accepted_quantity) || 0;
    const rejected = parseFloat(item?.rejected_quantity) || 0;
    const inspected = parseFloat(item?.insp_quantity) || 0;
    blocked.push(parseFloat(item?.blocked_quantity) || 0);

    // IF ITEM IS BLOCKED THEN NEED TO SHOW ERROR
    // if (blocked > 0) {
    //   return;
    // }

    let quantity = inspected; // default
    if (accepted > 0) quantity = accepted;
    else if (rejected > 0) quantity = accepted;

    return { ...item, quantity };
  });

  if (blocked.some((val) => val > 0)) {
    return [];
  }

  return icgrn_no;

  // icgrn_no = icgrn_no.map((icgrnItems) => {

  //   if (!isNaN(icgrnItems?.accepted_quantity) && parseFloat(icgrnItems?.accepted_quantity)) {
  //     return {
  //       ...icgrnItems,
  //       quantity: icgrnItems?.accepted_quantity
  //     }

  //   } else if (!isNaN(icgrnItems?.rejected_quantity) && parseFloat(icgrnItems?.rejected_quantity)) {
  //     return {
  //       ...icgrnItems,
  //       quantity: icgrnItems?.accepted_quantity
  //     }
  //   } else {
  //     return {
  //       ...icgrnItems,
  //       quantity: icgrnItems?.insp_quantity
  //     }
  //   }
  // });
  // return icgrn_no;
}

async function checkInoiceFiles(queryData = {}) {
  let client;
  try {
    client = await poolClient();
    const invoiceNo = decodeURIComponent(queryData?.invoice_no);

    const btnTableNames = ["btn", "btn_service_hybrid"];
    let result = [];

    for await (const element of btnTableNames) {
      let getInvoceFileQuery = `SELECT invoice_filename, invoice_file_path from ${element} where purchasing_doc_no = $1 AND invoice_no = $2`;
      getInvoceFileQuery = `SELECT btn.purchasing_doc_no, 
                                btn.btn_num, 
                                btn.invoice_filename, 
                                btn.invoice_file_path,
                                btn_list.status 
	                                FROM ${element} as btn
	                          LEFT JOIN btn_list AS btn_list 
                              ON(btn.btn_num = btn_list.btn_num AND btn_list.status =  $1)
	                            WHERE btn.purchasing_doc_no = $2 AND (btn.invoice_no = $3 OR btn.btn_num = $4)`;
      const btnResponse = await poolQuery({
        client,
        query: getInvoceFileQuery,
        values: [
          BTN_STATUS_PAYMENT_DONE_TEXT,
          queryData?.poNo,
          invoiceNo,
          invoiceNo,
        ],
      });
      result = [...result, ...btnResponse];
    }

    return result;
    // eslint-disable-next-line no-useless-catch
  } catch (error) {
    throw error;
  } finally {
    if (client) client?.release();
  }
}

async function getLatestBTN(client, data) {
  const getLatestDataQuery = `
        SELECT 
            btn_num, 
            purchasing_doc_no, 
            net_claim_amount, 
            net_payable_amount, 
            vendor_code, 
            status, 
            btn_type,
            assign_by,
            assign_to,
            created_at
        FROM btn_list where btn_num = $1 ORDER BY created_at DESC LIMIT 1`;
  const lasBtnDetails = await poolQuery({
    client,
    query: getLatestDataQuery,
    values: [data.btn_num],
  });

  return lasBtnDetails[0] || {};
}
/**
 * UPDATE BTN DETAILS IN SPECIFIC BTN TABLE
 * Example: for material btn, update material btn table
 * @param {Object} client - DB client/transaction object
 * @param {string|number} btn_num - BTN number
 * @param {Object} updateObject - Fields to update
 */
async function updateBtnByBtnNumber(client, latestBtnDetails, updateObject) {
  // try {
  // Get btn_type only for SUBMITTED_BY_VENDOR status
  // const getBtnTypeQuery = ` SELECT btn_type  FROM btn_list  WHERE btn_num = $1 AND status = $2  LIMIT 1`;

  // const [btnTypeResult] = await poolQuery({ client, query: getBtnTypeQuery, values: [btn_num, SUBMITTED_BY_VENDOR] });

  if (!latestBtnDetails || !Object.keys(latestBtnDetails).length) {
    throw new Error(
      `No BTN found with btn_num=${latestBtnDetails.btn_num} and status = ${SUBMITTED_BY_VENDOR}`,
    );
  }

  const btnType = latestBtnDetails.btn_type;

  // Mapping of BTN type → target table
  const btnTypeToTableMapping = {
    [BTN_HYBRID_BILL_MATERIAL]: BTN_MATERIAL,
    [BILL_INCORRECT_DEDUCTIONS]: BTN_ANY_OTHER_CLAIM,
    [BTN_CLAIM_AGAINST_PBG]: BTN_ANY_OTHER_CLAIM,
    [BTN_JCC]: BTN_ANY_OTHER_CLAIM,
    [BTN_CLAIM_AGAINST_JCC]: BTN_ANY_OTHER_CLAIM,
    [BTN_SERVICE_CONTRACT_BILL]: BTN_SERVICE_HYBRID,
  };

  const tableName = btnTypeToTableMapping[btnType];

  if (!tableName) {
    throw new Error(
      `Unsupported btn_type=${latestBtnDetails.btnType} for btn_num=${latestBtnDetails.btn_num}`,
    );
  }

  // Build update query
  const { q, val } = generateQuery(UPDATE, tableName, updateObject, {
    btn_num: latestBtnDetails?.btn_num,
  });

  await poolQuery({ client, query: q, values: val });

  return { success: true, table: tableName, updated: updateObject };
  // } catch (error) {
  //   console.error("updateBtnByBtnNumber error:", error.message);
  //   throw error;
  // }
}

const getGrnIcgrnByInvoiceService = async (
  client,
  purchasing_doc_no,
  invoice_no,
) => {
  try {
    let total_price = 0;
    let total_quantity = 0;
    let totalUnitPrice = 0;

    // -----------------------------------------
    // 1. Validate input
    // -----------------------------------------

    if (!purchasing_doc_no || !invoice_no) {
      return {
        success: false,
        status: 400,
        message: "Please send a valid payload!",
        data: null,
      };
    }

    // -----------------------------------------
    // 2. Get Gate Entry
    // -----------------------------------------

    let gate_entry_v = await getGateEntryDetails(client, [
      purchasing_doc_no,
      invoice_no,
    ]);

    if (!gate_entry_v.length) {
      return {
        success: false,
        status: 200,
        message: "No record found under the invoice number!",
        data: {
          purchasing_doc_no,
          invoice_no,
        },
      };
    }

    // -----------------------------------------
    // 3. Get GRN
    // -----------------------------------------

    const grn_values = gate_entry_v.map((el) => el.grn_no);
    const grn_value = (await getGrnDetails(client, grn_values)) || [];

    if (!grn_value.length) {
      return {
        success: false,
        status: 200,
        message: "Kindly complete the GRN for further processing of the BTN.",
        data: {
          grn_value,
          gate_entry_v,
        },
      };
    }

    // -----------------------------------------
    // 4. Find valid GE / FOR GET VALID GE IF SAME GE OF MULTIPLE INV NO
    // -----------------------------------------

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

    // -----------------------------------------
    // 5. Separate GRN / ICGRN
    // -----------------------------------------

    const onlyGrnItems = grn_value.filter(
      (el) => el.grn_reqired == null || el.grn_reqired == "",
    );

    const icgrnItems = grn_value.filter((el) => el.grn_reqired == "X");

    const icgrnNosArr = icgrnItems.map((el) => el.grn_no);

    const grnNosArr = grn_value.map((el) => el.grn_no);

    // -----------------------------------------
    // 6. Get ICGRN
    // -----------------------------------------

    const icgrn_no = await getIcgrnDetails(client, icgrnNosArr, {
      EBELN: purchasing_doc_no,
    });

    if (icgrnItems.length && !icgrn_no.length) {
      return {
        success: false,
        status: 200,
        message: "Kindly complete the ICGRN for further processing of the BTN.",
        data: {
          grn_value,
          icgrn_no,
        },
      };
    }

    if (icgrn_no.length !== icgrnItems.length) {
      return {
        success: false,
        status: 200,
        message: "Please check some item ICGRN pending!",
        data: {
          grn_value,
          icgrn_no,
        },
      };
    }

    // -----------------------------------------
    // 7. Get associated PO
    // -----------------------------------------

    const associatePoList = await getAssociatePoList(client, [
      purchasing_doc_no,
      invoice_no,
    ]);

    // -----------------------------------------
    // 8. Calculate ICGRN totals
    // -----------------------------------------

    if (icgrn_no.length) {
      const totals = calculateTotals(icgrn_no);

      total_price = totals.totalPrice || 0;

      total_quantity = totals.totalQuantity;
    }

    // -----------------------------------------
    // 9. Calculate normal GRN totals
    // -----------------------------------------

    let CAPEX_IND = false;

    if (onlyGrnItems.length) {
      const totals = calculateTotalGrnValue(onlyGrnItems);

      CAPEX_IND =
        totals.totalPrice.toFixed(2) !== totals.totalUnitPrice.toFixed(2);
      totalUnitPrice = totals.totalUnitPrice.toFixed(2);
      total_price += totals.totalPrice || 0;
      total_quantity += totals.totalQuantity;
    }

    // -----------------------------------------
    // 10. Returned GRN
    // -----------------------------------------

    const returnedGrns = await getReturnedGrnDetails(client, grnNosArr);

    if (returnedGrns.length) {
      const calcReturnGrnDetails = calculateTotalGrnValue(returnedGrns);
      total_price -= calcReturnGrnDetails.totalReturnPrice;
      total_quantity -= calcReturnGrnDetails.totalReturnQuantity;
    }

    // -----------------------------------------
    // 11. Prepare final result
    // -----------------------------------------

    gate_entry_v.total_price = parseFloat(total_price.toFixed(2));

    gate_entry_v.total_quantity = parseFloat(total_quantity.toFixed(2));

    gate_entry_v.icgrn_nos = icgrn_no;
    gate_entry_v.grn_nos = grn_value;
    gate_entry_v.returnedGrns = returnedGrns;
    gate_entry_v.associatePoList = associatePoList;
    gate_entry_v.CAPEX_IND = CAPEX_IND;
    gate_entry_v.totalUnitPrice = totalUnitPrice;

    // -----------------------------------------
    // 12. RETURN data to controller
    // -----------------------------------------

    return {
      success: true,
      status: 200,
      message: "Invoice details fetched.",
      data: gate_entry_v,
    };
  } catch (error) {
    console.error(
      "getGrnIcgrnByInvoiceService error:",
      error.message,
      error.stack,
    );

    return {
      success: false,
      status: 400,
      message: error.message,
      data: null,
    };
  }
};

module.exports = {
  advBillHybridbtnPayload,
  filesData,
  getContractualSubmissionDate,
  getActualSubmissionDate,
  dateToEpochTime,
  getGateEntryDetails,
  getGrnDetails,
  getIcgrnDetails,
  getAssociatePoList,
  checkInoiceFiles,
  getLatestBTN,
  getReturnedGrnDetails,
  updateBtnByBtnNumber,
  getReturnedGrnDetailsByGrnNos,
  getGrnIcgrnByInvoiceService,
};
