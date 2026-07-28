const { getEpochTime, generateQuery, generateInsertUpdateQuery, getDateTime } = require("../lib/utils");
const { BTN_SERVICE_HYBRID, BTN_SERVICE_CERTIFY_AUTHORITY, BTN_ASSIGN, WDC } = require("../lib/tableName");
const { resSend } = require("../lib/resSend");
const { SUBMITTED_BY_VENDOR, SUBMITTED_BY_CAUTHORITY, STATUS_RECEIVED, REJECTED, SUBMITTED, STATUS_DELEGATED, STATUS_RECOMMEND, NOT_RECOMMEND } = require("../lib/status");
const { create_btn_no } = require("../services/po.services");
const { poolClient, poolQuery, withTransaction } = require("../config/pgDbConfig");
const Message = require("../utils/messages");
const {
  payloadObj,
  addToBTNListFn,
  getGrnIcgrnValue,
  getServiceEntryValue,
  forwordToFinacePaylaod,
  getServiceBTNDetails,
  btnAssignPayload,
  supportingDataForServiceBtn,
  updateServiceBtnListTable,
  btnCurrentDetailsCheck,
  serviceBtnMailSend,
  getWdcDetails,
  calculateGRNServiceEntryValue,
  allDetailsAboutHrCompliances,
  getMaxDate,
  btnDelegatePayload,
  btnRecomendPayload,
  getServiceBtn,
  updateServiceBtn,
  wdcAndBtnLinedSave,
  mergeWdcData,
  getBtnNumbersAssocateWithBtn,
  checkIsAllBtnRejectd,
} = require("../services/btnServiceHybrid.services");
const { INSERT, UPDATE } = require("../lib/constant");
const { checkTypeArr } = require("../utils/smallFun");
const { btnSubmitToSAPF01, btnSubmitToSAPF02 } = require("../services/sap.btn.services");
const { BTN_REJECT } = require("../lib/event");
// const { deleteFileByPath } = require("../lib/deleteFile");
const { filesData, getLatestBTN } = require("../services/btn.services");
// const { getUserDetailsQuery } = require("../utils/mailFunc");
const QueryBuilder = require("../utils/QueryBuilder");

const getWdcInfoServiceHybrid = async (req, res) => {
  try {
    await withTransaction(async (client) => {
      let { purchasing_doc_no, reference_no, type } = req.query;
      if (type === "list") {
        const wdcList = await checkAndGetWdc(client, { purchasing_doc_no });
        return resSend(res, true, 200, Message.DATA_FETCH_SUCCESSFULL, wdcList, null);
      }

      if (type === "list" && !reference_no) {
        return resSend(res, false, 400, Message.MANDATORY_PARAMETR_MISSING, "Reference_no missing", null);
      }

      let { wdc_number_no, outside, units } = req.body;

      if (!wdc_number_no || !Array.isArray(wdc_number_no) || !wdc_number_no.length) {
        return resSend(res, false, 200, "No Wdc", [], null);
      }
      let result = await getWdcDetails(client, { wdc_number_no });

      if (!result.length) {
        return resSend(res, false, 200, "The WDC is not approved yet.", [], null);
      }

      purchasing_doc_no = result[0]?.purchasing_doc_no;
      reference_no = result[0]?.reference_no;

      // SEPERATE WDC AND LINE ITEMS
      const wdcDetails = mergeWdcData(result);
      let responseData = {
        ...wdcDetails,
      };
      const line_item_array = wdcDetails?.line_item_array || [];

      // OUTSIDE HSL PO . . .
      if (outside) {
        responseData = {
          ...responseData,
          pf_compliance: "NA",
          esi_compliance: "NA",
          wages_compliance: "NA",
          leave_salary_compliance: "NA",
          bonus_compliance: "NA",
          others_compliance: "NA",
          last_complient_date: "NA",
        };
      } else {
        /** COMPLIANCE NEED POs */
        /// GET LATEST DATE OF WDCs ---
        const maxLatestDate = getMaxDate(line_item_array);
        const filterUnits = units ? units.map((unit) => unit.value) : [];

        if (!maxLatestDate || !purchasing_doc_no || !reference_no || !filterUnits.length) {
          return resSend(
            res,
            false,
            200,
            "MaxLatestDatePO/WDC ref number/Unit fetch error.",
            {
              maxLatestDate,
              purchasing_doc_no,
              reference_no,
              filterUnits,
            },
            null,
          );
        }

        // FILTER UNITS AND CHK COMPLINCE

        const complianceDetails = await allDetailsAboutHrCompliances(client, { purchasing_doc_no, reference_no, units: filterUnits, invoice_date: new Date(maxLatestDate) });

        if (!complianceDetails.success) {
          let msg = `${complianceDetails.message}: ${complianceDetails.data}`;
          return resSend(res, false, 200, msg, complianceDetails.data, null);
        }

        responseData = {
          ...responseData,
          ...complianceDetails.data,
          maxLatestDate,
          wdc_number_no,
        };
      }
      resSend(res, true, 200, Message.DATA_FETCH_SUCCESSFULL, responseData, null);
    });
  } catch (error) {
    console.error("[ERROR] getWdcInfoServiceHybrid", error);
    resSend(res, false, 500, Message.DATA_FETCH_ERROR, null, null);
  }
};

const checkAndGetWdc = async (client, filteredData) => {
  const qb = new QueryBuilder(WDC)
    .select("DISTINCT(reference_no)")
    .where("action_type", "=", "WDC")
    .where("purchasing_doc_no", "=", filteredData.purchasing_doc_no)
    .groupBy("wdc.reference_no")
    .havingGroup((h) => {
      h.having("COUNT(*) FILTER (WHERE status = 'APPROVED')", ">", 0).having("COUNT(*) FILTER (WHERE status IN ('CANCELLED_REQ', 'CANCELLED'))", "=", 0);
    });

  const buildQuery = qb.toJSON();

  const wdcList = await poolQuery({ client, query: buildQuery.sql, values: buildQuery.params });
  return wdcList;
};

const submitBtnServiceHybrid = async (req, res) => {
  let client;
  try {
    client = await poolClient();
    await client.query("BEGIN");
    const filesPaylaod = req.files;
    const tempPayload = req.body;
    const tokenData = req.tokenData;
    // let net_payable_amount = tempPayload.net_payable_amount || "0";

    // Check required fields
    // if (!JSON.parse(tempPayload.hsn_gstn_icgrn)) {
    //   return resSend(res, false, 200, "Please check HSN code, GSTIN, Tax rate is as per PO!", null, null);
    // }

    const { wdc_number } = tempPayload;

    const convertedWdcNumbers = convertWdcNoArrAndStr(wdc_number);

    const wdc_numbers = convertedWdcNumbers?.wdcArr || [];

    // Check required fields
    if (!tempPayload.invoice_value) {
      return resSend(res, false, 200, Message.MANDATORY_PARAMETR_MISSING, "Invoice Value is missing!", null);
    }

    if (!wdc_numbers || !Array.isArray(wdc_numbers) || !wdc_numbers?.length) {
      return resSend(res, false, 200, Message.MANDATORY_PARAMETR_MISSING, "WDC No is missing!", null);
    }
    if (!tempPayload.purchasing_doc_no || !tempPayload.invoice_no || !tempPayload.outside) {
      return resSend(res, false, 200, Message.MANDATORY_PARAMETR_MISSING, "WDC No/PO No/Invoice/outside is missing!", null);
    }

    // check invoice number is already present in DB

    const btnNums = await getBtnNumbersAssocateWithBtn(client, { wdc_numbers });
    // const checkRejectedCount = await checkIsRejectedTheBtnByWDCNo(client, btnNums);

    if (btnNums && btnNums.length && !checkIsAllBtnRejectd(btnNums)) {
      return resSend(res, false, 200, "BTN is already created under the WDC.", null, null);
    }
    // if (!tempPayload.c_sdbg_filename || !tempPayload.a_sdbg_date || !tempPayload.c_sdbg_date) {
    //   return resSend(res, false, 200, Message.MANDATORY_PARAMETR_MISSING, "Send SDBG details", null);
    // }

    /**
     * FILE PAYLOADS AND FILE VALIDATION
     */
    const uploadedFiles = filesData(filesPaylaod);

    // checking no submitted hr compliance by vendor
    // const checkMissingComplience = await checkHrCompliance(client, {
    //   invoice_date: tempPayload.invoice_date,
    //   purchasing_doc_no: tempPayload.purchasing_doc_no,
    // });

    // if (!checkMissingComplience.success) {
    //   return resSend(res, false, 200, checkMissingComplience.msg, "Missing data, Need to be upload by HR", null);
    // }

    // SET BTN PAYLOAD
    let payload = payloadObj(tempPayload);

    // BTN NUMBER GENERATE
    const btn_num = await create_btn_no(client);

    // MATH Calculation
    const net_claim_amount = parseFloat(payload.invoice_value) + parseFloat(payload.debit_note) - parseFloat(payload.credit_note);

    let totalGST = parseFloat(payload.cgst) + parseFloat(payload.sgst) + parseFloat(payload.igst);
    let net_with_gst = net_claim_amount;
    if (totalGST > 0) {
      net_with_gst = net_claim_amount * (1 + totalGST / 100);
      net_with_gst = parseFloat(net_with_gst.toFixed(2));
    }

    // FINAL PAYLOAD FOR SERVICE BTN //

    payload = {
      ...payload,
      wdc_number: convertedWdcNumbers.wdcStr,
      btn_num,
      ...uploadedFiles,
      net_claim_amount,
      net_with_gst,
      created_by_id: tokenData.vendor_code,
      vendor_code: tokenData.vendor_code,
    };

    // SERVICE BTN SAVE
    const { q, val } = generateQuery(INSERT, BTN_SERVICE_HYBRID, payload);
    await poolQuery({ client, query: q, values: val });

    // SERVICE BTN WDC LINKED SAVE
    await wdcAndBtnLinedSave(client, wdc_numbers, btn_num);

    // SAVE DATA TO BTN LIST
    await addToBTNListFn(
      client,
      {
        ...payload,
        net_payable_amount: payload.net_claim_amount,
        certifying_authority: payload.bill_certifing_authority,
        assign_to: payload.bill_certifing_authority,
        assign_by: tokenData.vendor_code,
      },
      SUBMITTED_BY_VENDOR,
    );
    await client.query("COMMIT");
    serviceBtnMailSend(tokenData, { ...payload, status: SUBMITTED });
    resSend(res, true, 201, Message.BTN_CREATED, "BTN Created. No. " + btn_num, null);
  } catch (error) {
    console.error("submitBtnServiceHybrid error", error.message, error);
    await client.query("ROLLBACK");
    resSend(res, false, 500, Message.SERVER_ERROR, null, null);
  } finally {
    if (client) client.release();
  }
};

function convertWdcNoArrAndStr(str) {
  try {
    // Parse the string safely into an array
    const arr = JSON.parse(str.replace(/'/g, '"'));
    if (Array.isArray(arr)) {
      return { wdcStr: arr.join(","), wdcArr: arr };
    }
    return { wdcStr: "", wdcArr: [] };
  } catch (e) {
    console.error("Invalid wdc ref no input format:", e);
    throw e;
  }
}

/**
 * BTN CREATE INITIAL DATA SEND
 * @param {Object} req
 * @param {Object} res
 */
const initServiceHybrid = async (req, res) => {
  let client;
  try {
    client = await poolClient();
    const { poNo } = req.query;
    const result = await supportingDataForServiceBtn(client, poNo);
    resSend(res, true, 200, Message.DATA_FETCH_SUCCESSFULL, result, "");
  } catch (error) {
    console.error("[error]", error);
    resSend(res, false, 500, Message.DATA_FETCH_ERROR, null, null);
  } finally {
    if (client) client.release();
  }
};

const getBtnData = async (req, res) => {
  let client;
  try {
    client = await poolClient();
    const { type } = req.query;
    if (!type) {
      return resSend(res, true, 200, Message.MANDATORY_INPUTS_REQUIRED, "Please send a valid type!", null);
    }
    let data;
    let message;
    let success = false;
    let statusCode;
    switch (type) {
      case "icgrn":
        {
          const result = await getGrnIcgrnValue(client, req.query);
          ({ data, message, success, statusCode } = result);
        }
        break;
      case "service-entry":
        {
          const result = await getServiceEntryValue(client, req.query);
          ({ data, message, success, statusCode } = result);
        }
        break;
      case "sbtn-details":
        {
          const result = await getServiceBTNDetails(client, req.query);
          ({ data, message, success, statusCode } = result);
        }
        break;
      case "grn-and-service-entry":
        {
          const result = await calculateGRNServiceEntryValue(client, req.query);
          ({ data, message, success, statusCode } = result);
        }
        break;

      default:
        message = "Please send a valid type!";
        return resSend(res, success, 200, "Please send a valid type!", Message.MANDATORY_INPUTS_REQUIRED, null);
    }
    resSend(res, success, statusCode, message, data);
  } catch (error) {
    console.error("[error]", error);
    resSend(res, false, 500, Message.SERVER_ERROR, null, null);
  } finally {
    if (client) client.release();
  }
};

const actionByCertifyAuthority = async (req, res) => {
  let client;
  try {
    let payload = req.body;
    const tokenData = req.tokenData;

    // BTN BASIC VALIDATION
    if (!payload.btn_num || !payload.purchasing_doc_no) {
      return resSend(res, false, 200, Message.MANDATORY_PARAMETR_MISSING, "BTN num, PO  missing", null);
    }

    // DB CONNECTIONS AND START TRANSITION
    client = await poolClient();
    await client.query("BEGIN");

    /*-----------------------------------------------------------------------------------------
      BTN DETAILS , BTN CURRENT STATUS, ASSIGN_BY, ASSIGN_TO DETAILS
    -----------------------------------------------------------------------------------------*/
    const btnDetails = await getServiceBtn(client, "*", { btn_num: payload.btn_num });
    const latesBtnData = await getLatestBTN(client, payload);

    if (!btnDetails || !latesBtnData) {
      return resSend(res, false, 200, "Vendor not submit yet!", Message.NO_RECORD_FOUND, null);
    }

    /*-----------------------------------------------------------------------------------------
    VALID ACTION TAKEN AUTHORITY CHECK
    -----------------------------------------------------------------------------------------*/
    const hasAccessCheck = await validAccessCheck(client, tokenData, payload, btnDetails, latesBtnData);

    if (!hasAccessCheck.success) {
      return resSend(res, false, 200, hasAccessCheck.message, Message.YOU_ARE_UN_AUTHORIZED, null);
    }

    /*-----------------------------------------------------------------------------------------
    VALID STATUS CHECK TO TAKE ACTION
    -----------------------------------------------------------------------------------------*/
    const btnCurrentStatusAndDetails = await btnCurrentDetailsCheck(client, payload, latesBtnData);
    if (btnCurrentStatusAndDetails.isInvalid) {
      return resSend(res, false, 200, `BTN ${payload.btn_num} ${btnCurrentStatusAndDetails.message}`, payload.btn_num, null);
    }

    // HANDLE REJECT BTN
    if (payload.status === REJECTED) {
      // REJECTED BTN ASSIGN TO VENDOR
      payload.assign_to = btnDetails.vendor_code;
      const response1 = await btnReject(payload, tokenData, client);
      await client.query("COMMIT");
      return resSend(res, true, 200, "Rejected successfully !!", response1, null);
    }

    // BTN DELEGATE, RECOMEND, NON RECOMEND
    if (payload.status === STATUS_DELEGATED || payload.status === NOT_RECOMMEND || payload.status === STATUS_RECOMMEND) {
      const response2 = await btnDelegatedAndRecomend(client, btnDetails, payload, tokenData);
      await client.query("COMMIT");
      return resSend(res, true, 200, payload.status + " successfully !!", response2, null);
    }

    /*
     * |-|-----------------------SECTION FOR APPROVE APPROVE------------------------------------------------|-|
     */
    // FORWORD TO FINACE VALIDATION
    if (!payload.net_payable_amount || !payload.assign_to) {
      return resSend(res, false, 400, Message.MANDATORY_PARAMETR_MISSING, "Entry_no or net_payable_amount, assign_to missing", null);
    }

    //  BTN FINANCE AUTHORITY DATA INSERT
    payload.created_by_id = tokenData.vendor_code;
    const financePaylad = forwordToFinacePaylaod(payload);
    const { q, val } = generateQuery(INSERT, BTN_SERVICE_CERTIFY_AUTHORITY, financePaylad);
    const response = await poolQuery({ client, query: q, values: val });

    // BTN ASSIGN BY FINANCE AUTHORITY
    const btnAssignPaylaod = btnAssignPayload({ ...payload, assign_by: tokenData.vendor_code });
    const assingPayload = await generateInsertUpdateQuery(btnAssignPaylaod, BTN_ASSIGN, ["btn_num", "purchasing_doc_no"]);
    await poolQuery({ client, query: assingPayload.q, values: assingPayload.val });

    // UPDATE SERVICE BTN TABLE
    await updateServiceBtn(client, payload.btn_num, { status: SUBMITTED_BY_CAUTHORITY, ca_remarks: payload.remarks });

    // ADDING TO BTN LIST WITH CURRENT STATUS
    // const latesBtnData = await getLatestBTN(client, payload);
    await addToBTNListFn(client, { ...latesBtnData, ...payload, assign_to: payload.assign_to, assign_by: tokenData.vendor_code }, SUBMITTED_BY_CAUTHORITY);

    /** SEND BTN DATA TO SAP SYSTEM
     * IF SAP SEND DATA ANY ISSUE THE WHOLE DATA WILL ROLLBACK
     */
    // const sendSap = true;
    const sendSap = await btnSubmitToSAPF01(payload, tokenData);
    if (sendSap == false) {
      await client.query("ROLLBACK");
      return resSend(res, false, 200, Message.SAP_NOT_CONNECTED, null, null);
    } else if (sendSap == true) {
      await client.query("COMMIT");
      resSend(res, true, 200, Message.DATA_SEND_SUCCESSFULL, response, "");
      serviceBtnMailSend(tokenData, { ...payload, status: SUBMITTED_BY_CAUTHORITY });
    }
  } catch (error) {
    console.error("error forwordToFinace", error, error.message);
    if (client) await client.query("ROLLBACK");
    resSend(res, false, 500, Message.UNEXPECTED_ERROR, null, null);
  } finally {
    if (client) client.release();
  }
};

async function validAccessCheck(client, tokenData, currentPayload, btnDetails, latesBtnDetails) {
  let accessDetails = { success: false, message: Message.YOU_ARE_UN_AUTHORIZED };

  if (latesBtnDetails.status == STATUS_DELEGATED && (tokenData.vendor_code == latesBtnDetails.assign_to || tokenData.vendor_code == latesBtnDetails.assign_by)) {
    accessDetails = { success: true, message: Message.AUTHORIZED_TO_TAKE_ACTION };
  }

  // FOR CERTIFY AUTHORITY
  if (tokenData.vendor_code == btnDetails.certifying_authority && (tokenData.vendor_code == latesBtnDetails.assign_to || tokenData.vendor_code == btnDetails.delegate_to)) {
    accessDetails = { success: true, message: Message.AUTHORIZED_TO_TAKE_ACTION };
  }
  // FOR DELEGATE TO USER
  if (tokenData.vendor_code == btnDetails.delegate_to && tokenData.vendor_code == latesBtnDetails.assign_to) {
    accessDetails = { success: true, message: Message.AUTHORIZED_TO_TAKE_ACTION };
  }
  // FOR DO ACCESS
  if (tokenData.vendor_code == latesBtnDetails.assign_to) {
    accessDetails = { success: true, message: Message.AUTHORIZED_TO_TAKE_ACTION };
  }

  return accessDetails;
}

// async function validAccessCheck(client, tokenData, currentPayload, btnDetails) {
//   const isCertifyAuthority = btnDetails.bill_certifing_authority == tokenData.vendor_code;
//   const isDelegatedToAuthority = btnDetails.delegate_to == tokenData.vendor_code;
//   const poDetails = await getPoDetails(client, { ebeln: currentPayload.purchasing_doc_no }, "ebeln as purchasing_doc_no, ernam as po_creator, lifnr as vendor_code") == tokenData.vendor_code
//   const isDoAuthority = poDetails?.po_creator === tokenData.vendor_code;

//   //D-RETURN STATUS, HANDLE Has D-RETURN-STATUS
//   const btnIsDreturnQuery = `SELECT COUNT(*) from btn_list WHERE btn_num = $1 AND status = $2`;
//   const btnIsDreturnCheck = await poolQuery({ client, query: btnIsDreturnQuery, values: [currentPayload.btn_num, BTN_STATUS_DRETURN] });
//   const hasDReturnStatus = parseInt(btnIsDreturnCheck[0]?.count) ? true : false;

//   /**
//    * VALIDA AUTHORITY CHECK
//    * IF DO && D-RETURN THEN PROCEED TO DO
//    * IF AUTHORITY && NOT DE-RETURN THEN PROCEED TO CER OTH
//    * ELSE NOT AUTHORIZE
//    */

//   // BOTH DO AND AUTHORIZE CONDITTION CHECK

//   // const doAndCerifyAuthortySame = parseInt(isDoCheck[0]?.count) && parseInt(isCertifyAuthority[0]?.count);

//   //NITHER DO / SERTIFY AUTHORTY
//   const eitherDoOrCerifyAuthorty = isDoAuthority || isCertifyAuthority;

//   //NITHER DO / SERTIFY AUTHORTY
//   const eitherDoOrCerifyAuthortyOrDelegatedToUser = isDoAuthority || isCertifyAuthority || isDelegatedToAuthority;
//   // certifyAuthorty
//   const onlyCertyfy = isCertifyAuthority && !isDoAuthority;
//   // only do
//   const onlyDo = isDoAuthority && !isCertifyAuthority;

//   switch (currentPayload.status) {
//     case STATUS_DELEGATED: {
//       if (onlyCertyfy || (hasDReturnStatus && eitherDoOrCerifyAuthorty))
//         return { success: true, message: "You are authorised CA OR DO-CA" }
//     }
//       break;
//     case STATUS_RECOMMEND: {
//       if (isDelegatedToAuthority)
//         return { success: true, message: "You are authorised DToCA" }
//     }
//       break;
//     case NOT_RECOMMEND: {
//       if (isDelegatedToAuthority)
//         return { success: true, message: "You are authorised DToCA" }
//     }
//       break;
//     case APPROVED: {
//       if (onlyCertyfy || (hasDReturnStatus && onlyDo) || isDelegatedToAuthority)
//         return { success: true, message: "You are authorised CA OR D-RETUN-DO OF DToCA" }
//     }
//     case REJECTED: {
//       if (onlyCertyfy || (hasDReturnStatus && onlyDo) || isDelegatedToAuthority)
//         return { success: true, message: "You are not authorised! CA" }
//     }

//     default:
//       return { success: false, message: "You are not authorised" }
//   }

//   return { success: false, message: "You are not authorised" }

//   // if (!eitherDoOrCerifyAuthorty) {

//   //   return { success: false, message: "You are not authorised! BOTH" }

//   //   // return resSend(res, false, 200, "You are not authorised! BOTH", Message.YOU_ARE_UN_AUTHORIZED, null);
//   // }
//   // if (onlyDo && !hasDReturnStatus) {
//   //   return { success: false, message: "You are not authorised! DO" }
//   //   // return resSend(res, false, 200, "You are not authorised! DO", Message.YOU_ARE_UN_AUTHORIZED, null);
//   // }
//   // if (onlyCertyfy && hasDReturnStatus) {
//   //   return { success: false, message: "You are not authorised! CA" }
//   //   // return resSend(res, false, 200, "You are not authorised! CA", Message.YOU_ARE_UN_AUTHORIZED, null);
//   // }

//   // return { success: false, message: "You are not authorised" }

// }

/**
 * BTN DATA SEND TO SAP SERVER WHEN BTN SUBMIT BY FINNANCE STAFF
 * @param {Object} btnPayload
 * @param {Object} tokenData
 */

const serviceBtnAssignToFiStaff = async (req, res) => {
  let client;
  try {
    client = await poolClient();
    await client.query("BEGIN");
    const { btn_num, purchasing_doc_no, assign_to_fi } = req.body;
    const tokenData = { ...req.tokenData };

    if (!btn_num || !purchasing_doc_no || !assign_to_fi) {
      return resSend(res, false, 200, "Assign To is the mandatory!", Message.MANDATORY_PARAMETR_MISSING, null);
    }

    /*-----------------------------------------------------------------------------------------
        BTN DETAILS , BTN CURRENT STATUS, ASSIGN_BY, ASSIGN_TO DETAILS
      -----------------------------------------------------------------------------------------*/

    const latesBtnData = await getLatestBTN(client, { btn_num });

    const btnCurrnetStatus = await btnCurrentDetailsCheck(client, { btn_num, status: STATUS_RECEIVED }, latesBtnData);
    if (btnCurrnetStatus.isInvalid) {
      return resSend(res, false, 200, `BTN ${btn_num} ${btnCurrnetStatus.message}`, btn_num, null);
    }

    const assign_q = `SELECT * FROM ${BTN_ASSIGN} WHERE btn_num = $1 and last_assign = $2`;
    let assign_fi_staff_v = await poolQuery({ client, query: assign_q, values: [btn_num, true] });
    if (!checkTypeArr(assign_fi_staff_v)) {
      return resSend(res, false, 200, "You're not authorized to perform the action!", null, null);
    }

    const whereCon = { btn_num: btn_num };
    const payload = {
      assign_by_fi: tokenData?.vendor_code,
      assign_to_fi: assign_to_fi,
      last_assign_fi: true,
    };

    const { q, val } = generateQuery(UPDATE, BTN_ASSIGN, payload, whereCon);
    await poolQuery({ client, query: q, values: val });

    let btn_list_q = ` SELECT * FROM btn_list WHERE btn_num = $1 
	                      AND purchasing_doc_no = $2
	                      AND status = $3
                        ORDER BY created_at DESC`;
    let btn_list = await poolQuery({ client, query: btn_list_q, values: [btn_num, purchasing_doc_no, SUBMITTED_BY_VENDOR] });

    if (!btn_list.length) {
      return resSend(res, false, 200, "Vendor have to submit BTN first.", btn_list, null);
    }

    let data = {
      btn_num,
      purchasing_doc_no,
      net_claim_amount: btn_list[0]?.net_claim_amount,
      net_payable_amount: btn_list[0]?.net_payable_amount,
      vendor_code: btn_list[0]?.vendor_code,
      created_at: getEpochTime(),
      btn_type: btn_list[0]?.btn_type,
    };

    await updateServiceBtn(client, btn_num, { status: STATUS_RECEIVED });
    await addToBTNListFn(client, { ...data, assign_to: assign_to_fi, assign_by: tokenData.vendor_code }, STATUS_RECEIVED);

    // const sendSap = true; //btnSaveToSap({ ...req.body, ...payload }, tokenData);
    const sendSap = await btnSubmitToSAPF02({ ...req.body, ...payload }, tokenData);
    if (sendSap == false) {
      await client.query("ROLLBACK");
      return resSend(res, false, 200, `SAP not connected.`, null, null);
    } else if (sendSap == true) {
      await client.query("COMMIT");
      // TO DO EMAIL
      serviceBtnMailSend(tokenData, { ...req.body, ...payload, status: STATUS_RECEIVED });
      resSend(res, true, 200, "Finance Staff has been assigned!", null, null);
    }
  } catch (error) {
    console.error("serviceBtnAssignToFiStaff error", error);
    resSend(res, false, 500, Message.SERVER_ERROR, null, null);
  } finally {
    if (client) client.release();
  }
};

async function btnReject(data, tokenData, client) {
  await updateServiceBtn(client, data.btn_num, { status: REJECTED, ca_remarks: data.rejectedMessage });
  // await updateServiceBtn(client, payload.btn_num, { status: SUBMITTED_BY_CAUTHORITY, fwd_remarks: payload.remarks });

  await updateServiceBtnListTable(client, { ...data, remarks: data.rejectedMessage }, tokenData);

  // const sendSap = true; // await btnSubmitToSAPF01({ ...data, assign_to: null }, tokenData);
  const sendSap = await btnSubmitToSAPF01({ ...data, assign_to: null }, tokenData);

  if (sendSap == false) {
    throw new Error("SAP not connected.");
  } else if (sendSap == true) {
    serviceBtnMailSend(tokenData, data, BTN_REJECT);
    // resSend(res, true, 200, "Finance Staff has been assigned!", null, null);
  }
  return { btn_num: data.btn_num };
}

async function btnDelegatedAndRecomend(client, existingData, currentPayload, tokenData) {
  const { btn_num, purchasing_doc_no, status, delegate_to, remarks } = currentPayload;

  if (!status || !remarks || !btn_num || !purchasing_doc_no) {
    return { message: Message.MANDATORY_PARAMETR_MISSING, success: false };
  }
  let newDelegateRemarks = "";
  let newRecomendRemarks = "";
  let btnDelegateRecomndPayload = {};
  let assign_to = "NO_ASSIGN"; // for btn list table, next assign to
  const dtTmDetails = getDateTime();
  if (status == STATUS_DELEGATED) {
    assign_to = delegate_to;
    newDelegateRemarks += ` | [${tokenData.vendor_code}] ${dtTmDetails.dateTime}  : ${remarks} | `;

    if (existingData.remarks1 && typeof remarks === "string") {
      newDelegateRemarks += existingData.remarks1;
    }
    btnDelegateRecomndPayload = btnDelegatePayload({
      ...currentPayload,
      remarks: newDelegateRemarks,
      delegate_by: tokenData.vendor_code,
    });
  }
  if (status == NOT_RECOMMEND) {
    newRecomendRemarks += `[${tokenData.vendor_code}] ${dtTmDetails.dateTime}  : ${remarks}`;

    if (existingData.remarks2 && typeof remarks === "string") {
      newRecomendRemarks += existingData.remarks2;
    }
    assign_to = existingData.bill_certifing_authority;
    btnDelegateRecomndPayload = btnRecomendPayload({
      ...currentPayload,
      current_ca: assign_to,
      remarks: newRecomendRemarks,
      delegate_action_by: tokenData.vendor_code,
    });
  }
  if (status == STATUS_RECOMMEND) {
    newRecomendRemarks += `[${tokenData.vendor_code}] ${dtTmDetails.dateTime} : ${remarks}`;
    if (existingData.remarks2 && typeof remarks === "string") {
      newRecomendRemarks += existingData.remarks2;
    }
    assign_to = existingData.bill_certifing_authority;
    btnDelegateRecomndPayload = btnRecomendPayload({
      ...currentPayload,
      current_ca: assign_to,
      remarks: newRecomendRemarks,
      delegate_action_by: tokenData.vendor_code,
    });
  }

  const { q, val } = generateQuery(UPDATE, BTN_SERVICE_HYBRID, btnDelegateRecomndPayload, { btn_num });

  await poolQuery({ client, query: q, values: val });

  // ADDING TO BTN LIST WITH CURRENT STATUS
  const latesBtnData = await getLatestBTN(client, { btn_num });
  await addToBTNListFn(client, { ...latesBtnData, remarks, assign_to, assign_by: tokenData.vendor_code }, status);
  return { btn_num };
}

module.exports = {
  submitBtnServiceHybrid,
  getWdcInfoServiceHybrid,
  initServiceHybrid,
  getBtnData,
  actionByCertifyAuthority,
  serviceBtnAssignToFiStaff,
};
