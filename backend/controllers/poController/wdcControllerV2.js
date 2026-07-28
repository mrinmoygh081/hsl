/* eslint-disable no-unsafe-finally */
/* eslint-disable no-undef */
const { resSend, successAndErrorObjectBulider } = require("../../lib/resSend");
const { getQuery, poolClient, poolQuery } = require("../../config/pgDbConfig");
const { generateQuery, getEpochTime, generateQueryForMultipleData } = require("../../lib/utils");

const { INSERT, TYPE_JCC, TYPE_WDC, PO_LINE_ITEM_DELETE_FLAG } = require("../../lib/constant");
const { EKPO, WDC, VENDOR_MASTER_LFA1, EMPLAYEE_MASTER_PA0002, WDC_LINE, BTN_SERVICE_LINKEDWDC, BTN_SERVICE_HYBRID } = require("../../lib/tableName");
const { SUBMITTED, APPROVED, REJECTED, ACCEPTED, STATUS_RECOMMEND, NOT_RECOMMEND, STATUS_DELEGATED, STATUS_CANCELED, STATUS_CANCEL_REQUESTED } = require("../../lib/status");
const { create_reference_no, get_latest_activity } = require("../../services/po.services");

const { makeHttpRequest } = require("../../config/sapServerConfig");
const { checkIsApprovedRejected } = require("../../services/lastassignee.servces");
const Message = require("../../utils/messages");
const Wdc = require("../../models/wdc.model");
const { wdcVendorPayload, comparePreviousDataAndSetNewData, handeWdclMail, wdcTableCopyData, wdcLineTableCopyData } = require("../../services/wdc.servces");
const { WDC_UPLOADING, WDC_APPROVAL_REJECT } = require("../../lib/event");
const QueryBuilder = require("../../utils/QueryBuilder");

const toMilliseconds = (dateString) => new Date(dateString).getTime();

exports.submitByVendor = async (req, res) => {
  let client;
  try {
    client = await poolClient();
    await client.query("BEGIN");
    const uniqueTimeStamp = getEpochTime();
    const tokenData = { ...req.tokenData };
    const { ...obj } = req.body;

    // Files payload
    let payloadFiles = req.files;

    // MANDATORY VALIDATION
    if (!obj.purchasing_doc_no || typeof obj.purchasing_doc_no !== "string" || !obj.status || typeof obj.status !== "string") {
      return resSend(res, false, 200, Message.PLEASE_SEND_VALID_PAYLOAD, null, null);
    }

    /**
     * ONLY VENDOR CAN SUBMIT VALIDATION
     * START
     *  */
    if (!obj.status || obj.status !== SUBMITTED) {
      return resSend(res, false, 200, "Vendor only can submit", null, null);
    }

    if (!obj.action_type || typeof obj.action_type !== "string") {
      return resSend(res, false, 200, "Action required!", Message.MANDATORY_INPUTS_REQUIRED, null);
    }

    // END
    let fileData = {};
    if (req.file) {
      fileData = {
        fileName: req.file.filename,
        filePath: req.file.path,
      };
    }

    let payload = { created_by_id: tokenData.vendor_code };

    let reference_no = create_reference_no(obj.action_type, tokenData.vendor_code);

    // Handle uploaded files

    if (payloadFiles["file_inspection_note_ref_no"]) {
      obj.file_inspection_note_ref_no = payloadFiles["file_inspection_note_ref_no"][0]?.filename || null;

      obj.file_inspection_note_ref_no_file_path = payloadFiles["file_inspection_note_ref_no"][0]?.path || null;
    }

    if (payloadFiles["file_hinderence_report_cerified_by_berth"]) {
      obj.file_hinderence_report_cerified_by_berth = payloadFiles["file_hinderence_report_cerified_by_berth"][0]?.filename || null;
      obj.file_hinderence_report_cerified_by_berth_file_path = payloadFiles["file_hinderence_report_cerified_by_berth"][0]?.path || null;
    }

    if (payloadFiles["file_attendance_report"]) {
      obj.file_attendance_report = payloadFiles["file_attendance_report"][0]?.filename || null;
      obj.file_attendance_report_file_path = payloadFiles["file_attendance_report"][0]?.path || null;
    }

    payload = {
      ...fileData,
      ...obj,
      reference_no: reference_no,
      vendor_code: tokenData.vendor_code,
      updated_by: "VENDOR",
      created_by_id: tokenData.vendor_code,
      created_by_name: tokenData.name,
      created_at: uniqueTimeStamp,
      action_by: tokenData.vendor_code,
      action_on: obj.assigned_to,
    };
    if (obj.action_type === TYPE_WDC) {
      payload = await processInput(client, payload);
    }

    const wdc_payload = { ...payload };
    delete wdc_payload.item;

    const { q, val } = generateQuery(INSERT, WDC, wdc_payload);
    const wdcInsert = await poolQuery({ client, query: q, values: val });

    /**
     * JCC SAVE TO DB [START]
     */
    if (wdc_payload.action_type === TYPE_JCC && wdcInsert) {
      await client.query("COMMIT");
      return resSend(res, true, 200, "The JCC is submited!", { reference_no }, null);
    }
    // JCC SAVED AND SEND RESPONSE [END JCC CODE]

    /**
     * HANDLING SUBLINE ITEMS [START]
     */
    const itemData = payload.item;
    const subLineItemPayloadArr = [];

    for (const item of itemData) {
      if (parseFloat(item.claim_qty) <= 0) {
        return resSend(res, false, 200, "Claim quantity should be greter than 0", [], null);
      }

      if (parseFloat(item.claim_qty) > parseFloat(item.open_qty)) {
        return resSend(res, false, 200, "Claim quantity not greter than open quantity", [], null);
      }

      item.wdc_id = uniqueTimeStamp;
      delete item.id;
      delete item.subData;

      item.contractual_start = toMilliseconds(item.contractual_start); // 1234567891234;
      item.contractual_completion = toMilliseconds(item.contractual_completion); //1234567891234; //

      item.actual_start = toMilliseconds(item.actual_start); // 1234567891234;
      item.actual_completion = toMilliseconds(item.actual_completion); //1234567891234; //

      const subLineItemPayload = {
        reference_no: payload.reference_no,
        purchasing_doc_no: payload.purchasing_doc_no,
        sublineitem: item.sublineitem ? item.sublineitem : null,
        ...item,
      };
      subLineItemPayloadArr.push(subLineItemPayload);

      // const { q, val } = generateQuery(INSERT, "wdc_line", subLineItemPayload);
      // await poolQuery({ client, query: q, values: val });
    }
    // WDC LINE ITEM TABLE SAVE
    const wdcLineTableQuery = await generateQueryForMultipleData(subLineItemPayloadArr, "wdc_line", ["id"]);
    await poolQuery({ client, query: wdcLineTableQuery["q"], values: wdcLineTableQuery["val"] });
    /**
     * SUBLINE ITEMS SAVED [END]
     */

    // AFTER SAVE ALL DATA..  DB COMMIT
    await client.query("COMMIT");

    handeWdclMail(tokenData, payload, WDC_UPLOADING);

    resSend(res, true, 200, `The WDC is submited!`, [], null);
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("error vendor submit api -->", error.message, error);
    resSend(res, false, 500, Message.SERVER_ERROR, null, null);
  } finally {
    if (client) client.release();
  }
};

exports.submitCancelRequest = async (req, res) => {
  let client;
  try {
    const { reference_no, purchasing_doc_no } = req.body;
    const tokenData = req.tokenData;
    client = await poolClient();
    await client.query("BEGIN");

    const usedCheck = await checkTheWdcIsUsed(client, { reference_no, purchasing_doc_no });

    if (usedCheck.success) {
      return resSend(res, false, 200, usedCheck.message, usedCheck);
    }
    const latestWdcData = await getWdcData(client, reference_no, purchasing_doc_no);
    const { item, ...wdcDetailsData } = latestWdcData;

    const created_at = getEpochTime();
    const filteredWdcTablePayload = wdcTableCopyData({
      ...wdcDetailsData,
      created_at,
      updated_by: "VENDOR",
      status: STATUS_CANCEL_REQUESTED,
      created_by_id: tokenData.vendor_code,
      action_by: tokenData.vendor_code,
      action_on: wdcDetailsData.status == SUBMITTED ? wdcDetailsData.action_on : wdcDetailsData.action_by,
    });
    const filteredWdcLineTablePayload = wdcLineTableCopyData(item).map((el) => ({ ...el, reference_no, purchasing_doc_no, wdc_id: created_at }));
    const wdcSaveQuery = generateQuery(INSERT, WDC, filteredWdcTablePayload);
    const wdcLineSaveQuery = await generateQueryForMultipleData(filteredWdcLineTablePayload, WDC_LINE, ["id"]);
    await Promise.all([poolQuery({ client, query: wdcSaveQuery.q, values: wdcSaveQuery.val }), poolQuery({ client, query: wdcLineSaveQuery.q, values: wdcLineSaveQuery.val })]);

    await client.query("COMMIT");
    resSend(res, true, 200, Message.DATA_SEND_SUCCESSFULL, { reference_no });
  } catch (error) {
    console.error("submitCancelRequest error", error);
    if (client) await client.query("ROLLBACK");
    resSend(res, false, 200, error.message, error);
  } finally {
    if (client) client.release();
  }
};
exports.cancelledByGrse = async (req, res) => {
  let client;
  try {
    const { reference_no, purchasing_doc_no } = req.body;
    const tokenData = req.tokenData;
    client = await poolClient();
    await client.query("BEGIN");

    // const usedCheck = await checkTheWdcIsUsed(client, { reference_no, poNo });
    // if (!usedCheck.success) {
    //   return successAndErrorObjectBulider(false, 200, "WDC IS IN USE", usedCheck, usedCheck);
    // }
    const latestWdcData = await getWdcData(client, reference_no, purchasing_doc_no);
    const { item, ...wdcDetailsData } = latestWdcData;

    if (!wdcDetailsData.status || wdcDetailsData.status !== STATUS_CANCEL_REQUESTED) {
      return resSend(res, false, 200, "WDC cancelled / no cancelled req submited by vendor");
    }
    if (!wdcDetailsData.action_on || wdcDetailsData.action_on !== tokenData.vendor_code) {
      return resSend(res, false, 200, Message.YOU_ARE_UN_AUTHORIZED);
    }
    const created_at = getEpochTime();
    const filteredWdcTablePayload = wdcTableCopyData({
      ...wdcDetailsData,
      created_at,
      updated_by: "HSL",
      status: STATUS_CANCELED,
      created_by_id: tokenData.vendor_code,
      action_by: tokenData.vendor_code,
      // action_on: wdcDetailsData.action_on
    });
    const filteredWdcLineTablePayload = wdcLineTableCopyData(item).map((el) => ({ ...el, reference_no, purchasing_doc_no, wdc_id: created_at }));
    const wdcSaveQuery = generateQuery(INSERT, WDC, filteredWdcTablePayload);
    const wdcLineSaveQuery = await generateQueryForMultipleData(filteredWdcLineTablePayload, WDC_LINE, ["id"]);
    await Promise.all([poolQuery({ client, query: wdcSaveQuery.q, values: wdcSaveQuery.val }), poolQuery({ client, query: wdcLineSaveQuery.q, values: wdcLineSaveQuery.val })]);

    await client.query("COMMIT");
    resSend(res, true, 200, Message.DATA_SEND_SUCCESSFULL, { reference_no, purchasing_doc_no });
  } catch (error) {
    console.error("submitCancelRequest error", error);
    if (client) await client.query("ROLLBACK");
    resSend(res, false, 200, error.message, error);
  } finally {
    if (client) client.release();
  }
};

exports.submitByGrse = async (req, res) => {
  let client;
  const uniqueTimeStamp = getEpochTime();
  try {
    const tokenData = { ...req.tokenData };
    const { purchasing_doc_no, reference_no, status, delegate_to, remarks, remarks2, remarks3, penalty_details, item } = req.body;

    // MANDATORY VALIDATION
    if (!reference_no || typeof reference_no !== "string" || !status || typeof status !== "string" || !purchasing_doc_no || typeof purchasing_doc_no !== "string") {
      return resSend(res, false, 200, Message.PLEASE_SEND_VALID_PAYLOAD, {}, null);
    }

    // VALIDATE STATUS
    const validStatus = [ACCEPTED, APPROVED, REJECTED, STATUS_DELEGATED, STATUS_RECOMMEND, NOT_RECOMMEND, STATUS_CANCELED];
    if (!validStatus.includes(status)) {
      return resSend(res, false, 200, Message.PLEASE_SEND_VALID_PAYLOAD, "Invalid status", null);
    }

    client = await poolClient();
    await client.query("BEGIN");

    // GET LATEST DATA DATA OF WDC
    const last_data = await get_latest_activity(client, WDC, purchasing_doc_no, reference_no);
    if (!last_data) {
      return resSend(res, false, 200, `No record found with this reference_no!`, last_data, null);
    }

    if (status == STATUS_DELEGATED && (!delegate_to || typeof delegate_to !== "string")) {
      return resSend(res, false, 200, Message.PLEASE_SEND_VALID_PAYLOAD, "Delegated to user missing", null);
    }
    // STAUS VALIDATION

    if (last_data.status === status) {
      return resSend(res, false, 200, `The WDC/JCC is already  ${last_data.status}`, null);
    }
    if (last_data !== APPROVED && status == STATUS_CANCELED) {
      return resSend(res, false, 200, `The WDC/JCC is cancel not possable, Please Reject it`, null);
    }

    // APPROVED REJECT VALIDATION CHECK
    // const check = await checkIsApprovedRejected(WDC, purchasing_doc_no, reference_no, APPROVED, REJECTED);
    const check = await checkIsApprovedRejectedCancelled(WDC, purchasing_doc_no, reference_no, APPROVED, REJECTED, STATUS_CANCELED);

    if (parseInt(check)) {
      return resSend(res, false, 200, `The WDC/JCC is already  ${APPROVED} / ${REJECTED} / ${STATUS_CANCELED}`, null, null);
    }

    const { assigned_to, action_on } = last_data;

    //  if (last_data.delegate_to !== tokenData.vendor_code && last_data.assigned_to !== tokenData.vendor_code) {

    // }

    if (assigned_to !== tokenData.vendor_code && action_on !== tokenData.vendor_code) {
      return resSend(res, false, 200, Message.YOU_ARE_UN_AUTHORIZED, null, null);
    }

    const wdc = { ...last_data };

    delete last_data.id;
    delete wdc.wdc_id;
    delete last_data.sync_id;
    delete last_data.sync;
    delete last_data.sync_updated_at;

    let payload = {
      ...last_data,
      status,
      item,
      created_by_id: tokenData.vendor_code,
      created_at: uniqueTimeStamp,
      updated_by: "HSL",
      action_by: tokenData.vendor_code,
      action_on: delegate_to,
    };
    if (status === STATUS_DELEGATED) {
      payload.delegate_to = delegate_to;
    }
    if (status === STATUS_RECOMMEND) {
      payload.action_on = last_data.assigned_to;
    }
    if (status === REJECTED && status === STATUS_CANCELED) {
      payload.action_on = "--";
    }
    if (remarks2) {
      payload.remarks2 = remarks2;
    }
    if (remarks3) {
      payload.remarks3 = remarks3;
    }
    if (remarks) {
      payload.remarks = remarks;
    }
    if (penalty_details) {
      payload.penalty_details = JSON.stringify(penalty_details);
    }

    const wdc_payload = { ...payload };

    delete wdc_payload.item;

    const { q, val } = generateQuery(INSERT, WDC, wdc_payload);
    const wdcInsert = await poolQuery({ client, query: q, values: val });

    /**
     * JCC SAVE TO DB [START]
     */
    if (wdc_payload.action_type === TYPE_JCC && wdcInsert) {
      await client.query("COMMIT");
      return resSend(res, true, 200, "The JCC is submited!", { reference_no }, null);
    }
    // JCC SAVED AND SEND RESPONSE [END JCC CODE]

    const query = `SELECT * FROM wdc_line WHERE reference_no = $1 AND purchasing_doc_no = $2 AND wdc_id = $3`;
    const getLastLineData = await poolQuery({ client, query, values: [reference_no, purchasing_doc_no, last_data.created_at] });
    const merge = await mergeArrayObjects(getLastLineData, payload.item);
    const itemData = merge;

    const wdcId = wdcInsert[0].id;
    let wdcPayloadSap = [];
    let subLineItemPayloadArr = [];
    for (const item of itemData) {
      if (payload.status === APPROVED) {
        wdcPayloadSap.push({ slno: wdcId, ebeln: payload.purchasing_doc_no, ebelp: item.lineitem, wdc: payload.reference_no });
      }
      item.wdc_id = uniqueTimeStamp;
      delete item.id;
      delete item.subData;

      item.contractual_start = BigInt(item.contractual_start);
      item.contractual_completion = BigInt(item.contractual_completion);

      // item.actual_start = BigInt(item.actual_start);
      // item.actual_completion = BigInt(item.actual_completion);

      const subLineItemPayload = {
        reference_no: payload.reference_no,
        purchasing_doc_no: payload.purchasing_doc_no,
        sublineitem: item.sublineitem ? item.sublineitem : null,
        ...item,
      };

      delete subLineItemPayload?.sync;
      delete subLineItemPayload?.sync_id;
      delete subLineItemPayload?.sync_updated_at;

      subLineItemPayloadArr.push(subLineItemPayload);
    }
    // Remove duplicates using a Set and JSON stringification
    const uniqueData = Array.from(new Set(wdcPayloadSap.map(JSON.stringify))).map(JSON.parse);
    const insetSublineItemQueryValue = await generateQueryForMultipleData(subLineItemPayloadArr, WDC_LINE, ["id"]);
    await poolQuery({ client, query: insetSublineItemQueryValue["q"], values: insetSublineItemQueryValue["val"] });

    // send to sap
    if (uniqueData.length) {
      const submit = await submitToSapServer(uniqueData);
      if (submit === false) {
        await client.query("ROLLBACK");
        return resSend(res, false, 200, "WDC/JCC save in sap faild, please refer to wdcContorllerV2 submitToSapServer fn", [], null);
      }
    }

    await client.query("COMMIT");

    handeWdclMail(tokenData, payload, WDC_APPROVAL_REJECT);

    resSend(res, true, 200, `The WDC is submited!`, [], null);
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("error", error.message);
    resSend(res, false, 500, Message.SERVER_ERROR, null, null);
  } finally {
    if (client) client.release();
  }
};

const checkTheWdcIsUsed = async (client, wdcDetails) => {
  const qb = new QueryBuilder("wdc as wdc");
  qb.select(["wdc.reference_no", "service_btn.status as btn_current_status", "service_btn.btn_num"]);
  qb.joinTable("", `${BTN_SERVICE_LINKEDWDC} as wdc_btn_linked_table`, "wdc.reference_no = wdc_btn_linked_table.wdc_reference_no");
  qb.joinTable("", `${BTN_SERVICE_HYBRID} as service_btn`, "wdc_btn_linked_table.btn_num = service_btn.btn_num");
  qb.where("wdc.reference_no", "=", wdcDetails.reference_no);
  qb.where("wdc.purchasing_doc_no", "=", wdcDetails.purchasing_doc_no);
  qb.paginate(1, 1);
  const buildQuery = qb.toJSON();

  const result = await poolQuery({ client, query: buildQuery.sql, values: buildQuery.params });
  if (!result.length) {
    return successAndErrorObjectBulider(false, 200, "WDC is not use", result, result);
  } else if (result.length && result[0]?.btn_current_status === REJECTED) {
    return successAndErrorObjectBulider(false, 200, "WDC is not use", result, result);
  }
  const msg = `WDC is alreay in use (${result[0]?.btn_num} | ${result[0]?.btn_current_status})`;
  return successAndErrorObjectBulider(true, 200, msg, result, result);
};

const checkIsApprovedRejectedCancelled = async (tableName, poNo, reference_no, status1, status2, status3) => {
  const check = `SELECT COUNT(status) AS count_val FROM ${tableName} WHERE purchasing_doc_no = $1 AND reference_no = $2 AND (status = $3 OR status = $4 OR status = $5)`;
  const resAssigneQry = await getQuery({
    query: check,
    values: [poNo, reference_no, status1, status2, status3],
  });

  return resAssigneQry[0].count_val;
};

const processInput = async (client, payload) => {
  try {
    // Parse the stringified item field
    const items = JSON.parse(payload.item);

    let totalClaimAmount = 0;

    const updatedItems = await Promise.all(
      items.map(async (item) => {
        let poRate;

        if (item.sublineitem) {
          // Get poRate from ESLL for sublineitem
          const packData = await getPoRateFromEkpo(client, payload.purchasing_doc_no, item.lineitem);
          const esllData = await getPoRateFromEsll(client, packData.packno, item.sublineitem);
          poRate = esllData.po_rate;
        } else {
          // Get poRate from EKPO for lineitem
          const ekpoData = await getPoRateFromEkpo(client, payload.purchasing_doc_no, item.lineitem);
          poRate = ekpoData.po_rate;
        }
        // Calculate claim_amount
        const claimAmount = poRate * parseFloat(item.claim_qty || 0);

        totalClaimAmount += claimAmount;

        return {
          ...item,
          claim_amount: claimAmount.toFixed(3),
        };
      }),
    );

    // Add total_claim_amount to payload
    return {
      ...payload,
      item: updatedItems,
      total_amount: totalClaimAmount.toFixed(3),
    };
  } catch (error) {
    console.error("Error processing input:", error);
    throw error;
  }
};

const getPoRateFromEkpo = async (client, purchasingDocNo, lineItem) => {
  const query = `SELECT PACKNO, NETPR AS po_rate FROM ekpo WHERE EBELN = $1 AND EBELP = $2`;
  const result = await poolQuery({
    client,
    query,
    values: [purchasingDocNo, lineItem],
  });
  return result[0];
};
const getPoRateFromEsll = async (client, packNo, sublineitem) => {
  const subPackNoQuery = `SELECT SUB_PACKNO FROM esll WHERE PACKNO = $1`;
  const subPackNoResult = await poolQuery({
    client,
    query: subPackNoQuery,
    values: [packNo],
  });
  const subPackNo = subPackNoResult[0]?.sub_packno;

  if (!subPackNo) throw new Error(`No SUB_PACKNO found for PACKNO: ${packNo}`);

  // const poRateQuery = `SELECT EXTROW AS sublineitem, NETWR AS po_rate FROM esll WHERE PACKNO = $1 AND EXTROW = $2 ORDER BY INTROW`;
  const poRateQuery = `SELECT EXTROW AS sublineitem, TBTWR AS po_rate FROM esll WHERE PACKNO = $1 AND EXTROW = $2 ORDER BY INTROW`;
  const poRateResult = await poolQuery({
    client,
    query: poRateQuery,
    values: [subPackNo, sublineitem],
  });
  return poRateResult[0];
};

async function submitToSapServer(data) {
  let status = false;
  try {
    const sapBaseUrl = process.env.SAP_HOST_URL || "http://10.181.1.31:8010";
    const postUrl = `${sapBaseUrl}/sap/bc/zoBPS_WDC`;

    const postResponse = await makeHttpRequest(postUrl, "POST", data);
    if (postResponse.statusCode && postResponse.statusCode >= 200 && postResponse.statusCode <= 226) {
      status = true;
    }
    console.log("POST Response from the server:", postResponse);
  } catch (error) {
    console.error("Error making the request:", error.message);
  } finally {
    return status;
  }
}

exports.getOpenQty = async (req, res) => {
  let client;
  try {
    client = await poolClient();

    if (!req.query.po_no) {
      return resSend(res, false, 200, "PO No. required", null, "");
    }

    const poNo = req.query.po_no;

    const lineItems = await fetchLineItems(client, poNo);
    const getWdcRejIds = await getDistinctReferenceIds(client, poNo);

    if (!lineItems.length) {
      return resSend(res, false, 200, "No line item found for this PO.", null, "");
    }

    const result = await processLineItems(client, poNo, lineItems, getWdcRejIds);

    resSend(res, true, 200, "WDC data fetched!", result, null);
  } catch (error) {
    console.error("error", error, error.message);
    resSend(res, false, 500, Message.SOMTHING_WENT_WRONG, null);
  } finally {
    if (client) client.release();
  }
};

const processLineItems = async (client, poNo, lineItems, getWdcRejIds) => {
  return Promise.all(
    lineItems.map(async (item) => {
      if (item.sub_packno) {
        const targetQtyArray = await getTargetQtyArray(client, item.sub_packno, item.lineitem);

        const consumeQtyPackNoArray = await getConsumeQtyPackNoArray(client, poNo, item.lineitem);

        const consumeQtyArray = await getConsumeQtyArray(client, consumeQtyPackNoArray, poNo, getWdcRejIds);

        item.lineitem = item.lineitem.toString();

        item.subData = calculateOpenQty(targetQtyArray, consumeQtyArray);
        delete item.description;
        delete item.unit;
      } else {
        const consumedQty = await getlineOpenQty(client, poNo, item.lineitem, getWdcRejIds);
        item.lineitem = item.lineitem.toString();
        item.open_qty = (parseFloat(item.targetqty) - parseFloat(consumedQty)).toFixed(3);
        delete item.subData; // Ensure no subData field for items without subData
      }
      delete item.targetqty;
      delete item.sub_packno; // Remove sub_packno as it's no longer needed

      return item;
    }),
  );
};

const fetchLineItems = async (client, poNo) => {
  const query = `
    SELECT t1.ebeln as purchasing_doc_no, t1.ebelp AS lineitem, t1.txz01 AS description, t1.MENGE AS targetQty,
           t1.meins AS unit, t2.sub_packno
    FROM ${EKPO} AS t1
    LEFT JOIN esll AS t2 ON t1.packno = t2.packno
    WHERE t1.ebeln = $1 AND (t1.loekz != $2 OR t1.loekz IS NULL); 
  `;
  return poolQuery({ client, query, values: [poNo, PO_LINE_ITEM_DELETE_FLAG] });
};

// eslint-disable-next-line no-unused-vars
const getConsumeQtyArray = async (client, consumeQtyPackNoArray, purchasingDocNo, getWdcRejIds) => {
  // const getConsumeQtyQuery = `
  // SELECT
  // 	ESSR.lblni AS service_entry_no,
  // 	ESSR.packno AS related_packno,
  //   ESSR.ebelp AS lineitem,
  // 	essl_sub_packno.packno,
  //   essl_sub_packno.extrow AS sublineitem,
  //   essl_sub_packno.menge
  // FROM ESSR AS ESSR
  // 	LEFT JOIN esll AS essl_packno ON (essr.packno = essl_packno.packno)
  // 	LEFT JOIN esll AS essl_sub_packno ON (essl_sub_packno.packno = essl_packno.sub_packno)
  // WHERE ESSR.ebeln = $1 AND ESSR.KZABN = 'X'`;
  const getConsumeQtyQuery = `
      SELECT
        	ESSR.lblni AS service_entry_no,
        	ESSR.packno AS essr_packno,
          ESSR.ebelp AS lineitem,
        	esll_subpack.packno, 
          esll_po_sub_li.extrow AS sublineitem, 
          esll_subpack.menge,
          esll_po_sub_li.ktext1
      FROM essr AS essr
        	JOIN esll AS esll_pack ON (esll_pack.packno = essr.packno)
		      JOIN esll AS esll_subpack ON (esll_subpack.packno = esll_pack.sub_packno)
        	JOIN esll AS esll_po_sub_li ON (esll_po_sub_li.introw = esll_subpack.pln_introw and esll_po_sub_li.packno = esll_subpack.pln_packno)
      WHERE essr.ebeln = $1 AND essr.KZABN = 'X' `;

  const consumeQtyArr = await poolQuery({ client, query: getConsumeQtyQuery, values: [purchasingDocNo] });
  const calcconsumeQtyArr = calculateConsumeQty(consumeQtyArr);
  return calcconsumeQtyArr;
};

/**
 * CALCULATE THE SUM OF MENGE BASED ON
 * PO-LINE-ITEM + PO-SUB-LINE-ITEM
 * @param {*} consumeQtyArray
 * @returns consumeQtyArray
 */

function calculateConsumeQty(consumeQtyArray) {
  if (!consumeQtyArray.length) return;
  const merged = [];
  const map = new Map();

  for (const item of consumeQtyArray) {
    const key = `${item.lineitem}-${item.sublineitem}`;

    if (map.has(key)) {
      const existing = map.get(key);
      existing.menge = (parseFloat(existing.menge) + parseFloat(item.menge)).toFixed(3);
    } else {
      const clone = { ...item };
      map.set(key, clone);
      merged.push(clone);
    }
  }

  return merged;
}

const getDistinctReferenceIds = async (client, purchasingDocNo) => {
  const query = `
    SELECT 
      MIN(id) AS id
    FROM wdc
    WHERE purchasing_doc_no = $1
      AND status = 'SUBMITTED'
      AND reference_no NOT IN (
        SELECT reference_no
        FROM wdc
        WHERE purchasing_doc_no = $1
          AND status = 'REJECTED'
      )
    GROUP BY reference_no
    ORDER BY reference_no;
  `;

  try {
    const result = await poolQuery({
      client,
      query,
      values: [purchasingDocNo],
    });

    const ids = result.map((row) => row.id);

    return ids;
  } catch (error) {
    console.error("Error fetching data:", error);
    throw error;
  }
};

const getConsumeQtyPackNoArray = async (client, poNo, lineitem) => {
  // SELECT packno
  // FROM essr
  // WHERE ebeln = $1 AND ebelp = $2
  const query = `SELECT DISTINCT(t2.sub_packno) AS packno
    FROM essr AS t1
	LEFT JOIN esll AS t2 ON t1.packno = t2.packno
    WHERE t1.ebeln = $1 AND ebelp = $2
  `;

  return poolQuery({ client, query, values: [poNo, lineitem] });
};

// eslint-disable-next-line no-unused-vars
const getlineOpenQty = async (client, poNo, lineitem, getWdcRejIds) => {
  // const msegquery = `
  //   SELECT SUM(MENGE) AS total_qty
  //   FROM mseg
  //   WHERE EBELN = $1 AND EBELP = $2
  // `;
  const msegquery = `
        SELECT 
            SUM(mseg.menge) AS open_qty
        FROM mseg AS mseg
        LEFT JOIN ekpo AS ekpo
            ON (ekpo.ebeln = mseg.ebeln AND ekpo.ebelp = mseg.ebelp)
        WHERE mseg.bwart IN ('101')
          AND NOT EXISTS (
                SELECT 1
                FROM mseg AS cancel_return_mseg
                WHERE cancel_return_mseg.bwart IN ('102', '122')
                  AND cancel_return_mseg.lfbnr = mseg.mblnr
          )
          AND mseg.ebeln = $1
          AND mseg.ebelp = $2`;

  let mseg_total_qty = await poolQuery({
    client,
    query: msegquery,
    values: [poNo, lineitem],
  });

  const mseg_qty = mseg_total_qty[0]?.open_qty || 0;

  return mseg_qty;
};

const getTargetQtyArray = async (client, packNo, lineitem) => {
  const query = `
    SELECT extrow AS sublineitem, menge, ktext1 AS description, meins AS unit
    FROM esll
    WHERE packno = $1
  `;
  const result = await poolQuery({ client, query, values: [packNo] });

  return result.reduce((acc, item) => {
    const existing = acc.find((group) => group.sublineitem === item.sublineitem);

    if (existing) {
      existing.target_qty = (parseFloat(existing.target_qty) + parseFloat(item.menge)).toFixed(3);
    } else {
      acc.push({
        lineitem,
        sublineitem: item.sublineitem,
        description: item.description,
        target_qty: parseFloat(item.menge).toFixed(3),
        unit: item.unit,
      });
    }
    return acc;
  }, []);
};
const calculateOpenQty = (targetQtyArray, consumeQtyArray) => {
  return targetQtyArray.map((targetItem) => {
    const consumeItem = consumeQtyArray?.find((consume) => consume.sublineitem === targetItem.sublineitem && consume.lineitem === targetItem.lineitem);
    let target_qty = isNaN(targetItem.target_qty) ? "0" : targetItem.target_qty;
    let open_qty = target_qty;
    let menge_qty = "0";
    if (consumeItem) {
      menge_qty = consumeItem.menge;
      open_qty = (parseFloat(target_qty) - parseFloat(menge_qty)).toFixed(3);
    }

    const obj = {
      sublineitem: targetItem.sublineitem.toString(),
      description: targetItem.description,
      target_qty,
      consume_qty: menge_qty,
      open_qty,
      unit: targetItem.unit,
    };

    return obj;
  });
};

exports.getWdc = async (req, res) => {
  let client;
  try {
    if (!req.query.ref) {
      return resSend(res, false, 200, "please send Reference no.", null, "");
    }
    if (!req.query.po) {
      return resSend(res, false, 200, "please send po no.", null, "");
    }
    const refNo = req.query.ref;
    const poNo = req.query.po;
    client = await poolClient();
    const data = await getWdcData(client, refNo, poNo);
    resSend(res, true, 200, Message.DATA_FETCH_SUCCESSFULL, data, null);
  } catch (error) {
    console.error("wdc error.message", error.message);
    resSend(res, false, 500, Message.SERVER_ERROR, null, null);
  } finally {
    if (client) {
      client.release();
    }
  }
};

const getWdcData = async (client, refNo, poNo) => {
  try {
    const query = `
    SELECT 
      wdc.id as wdc_id,
      wdc.reference_no,
      wdc.purchasing_doc_no,
      wdc.action_type,
      wdc.work_done_by,
      wdc.work_title,
      wdc.vendor_code,
      wdc.inspection_note_ref_no,
      wdc.file_inspection_note_ref_no,
      wdc.hinderence_report_cerified_by_berth,
      wdc.file_hinderence_report_cerified_by_berth,
      wdc.attendance_report,
      wdc.file_attendance_report,
      wdc.yard_no,
      wdc.stage_details,
      wdc.job_location,
      wdc.unit,
      wdc.total_amount,
      wdc.remarks,
      wdc.status,
      wdc.updated_by,
      wdc.created_at,
      wdc.created_by_name,
      wdc.created_by_id,
      wdc.assigned_to,
      wdc.file_attendance_report_file_path,
      wdc.file_hinderence_report_cerified_by_berth_file_path,
      wdc.file_inspection_note_ref_no_file_path,
      wdc.guarantee_defect_liability_start,
      wdc.guarantee_defect_liability_end,
      wdc.jcc_job_start,
      wdc.jcc_job_end,
      wdc.action_by,
      wdc.action_on,
      wdc.delegate_to,
      wdc.penalty_details,
      wdc.remarks2,
      wdc.remarks3,
      a_user.cname as assigned_to_name,
      delegate_to_user.cname as delegate_to_name,
      vendor_details.name1 as vendor_name,
      
      json_agg(json_build_object(
        'lineitem', wdc_line.lineitem,
        'sublineitem', wdc_line.sublineitem,
        'claim_qty', wdc_line.claim_qty,
        'contractual_start', wdc_line.contractual_start,
        'contractual_completion', wdc_line.contractual_completion,
        'actual_start', wdc_line.actual_start,
        'actual_completion', wdc_line.actual_completion,
        'hinderance', wdc_line.hinderance,
        'claim_amount', wdc_line.claim_amount,
        'description', wdc_line.description,
        'open_qty', wdc_line.open_qty,
        'unit', wdc_line.unit,
        'delay', wdc_line.delay
      )) AS item

FROM wdc
LEFT JOIN wdc_line ON wdc.created_at = wdc_line.wdc_id
LEFT JOIN pa0002 as a_user ON wdc.assigned_to = a_user.pernr::varchar
LEFT JOIN pa0002 as delegate_to_user ON wdc.delegate_to = delegate_to_user.pernr::varchar
LEFT JOIN lfa1 as vendor_details ON vendor_details.lifnr = wdc.vendor_code

WHERE wdc.purchasing_doc_no = $1 
  AND wdc.reference_no = $2
  AND wdc.created_at = (
      SELECT MAX(created_at) 
      FROM wdc 
      WHERE purchasing_doc_no = $1
      AND reference_no = $2
  )

GROUP BY 
      wdc.id,
      wdc.reference_no,
      wdc.purchasing_doc_no,
      wdc.action_type,
      wdc.work_done_by,
      wdc.work_title,
      wdc.vendor_code,
      wdc.inspection_note_ref_no,
      wdc.file_inspection_note_ref_no,
      wdc.hinderence_report_cerified_by_berth,
      wdc.file_hinderence_report_cerified_by_berth,
      wdc.attendance_report,
      wdc.file_attendance_report,
      wdc.yard_no,
      wdc.stage_details,
      wdc.job_location,
      wdc.unit,
      wdc.total_amount,
      wdc.remarks,
      wdc.status,
      wdc.updated_by,
      wdc.created_at,
      wdc.created_by_name,
      wdc.created_by_id,
      wdc.assigned_to,
      wdc.file_attendance_report_file_path,
      wdc.file_hinderence_report_cerified_by_berth_file_path,
      wdc.file_inspection_note_ref_no_file_path,
      wdc.action_by,
      wdc.action_on,
      wdc.guarantee_defect_liability_start,
      wdc.guarantee_defect_liability_end,
      wdc.jcc_job_start,
      wdc.jcc_job_end,
      a_user.cname,
      vendor_details.name1,
      delegate_to_user.cname
      `;

    // Execute the query to get the wdc data and related wdc_line data
    const result = await poolQuery({ client, query, values: [poNo, refNo] });

    return result[0] || {}; // Return the structured data
  } catch (error) {
    console.error("Error fetching data:", error.message);
    throw error; // Propagate error to be handled by calling function
  }
};

const mergeArrayObjects = async (arrayObject1, arrayObject2) => {
  try {
    arrayObject2 = JSON.parse(arrayObject2);
    const mergedArray = arrayObject1.map((item1) => {
      // Find matching item from arrayObject2 based on lineitem and sublineitem
      const matchingItem = arrayObject2.find((item2) => item2.lineitem === item1.lineitem && item2.sublineitem === item1.sublineitem);
      delete item1.wdc_id;
      // Merge the objects
      return {
        ...item1,
        contractual_start: matchingItem?.contractual_start || item1.contractual_start,
        contractual_completion: matchingItem?.contractual_completion || item1.contractual_completion,
        delay: matchingItem?.delay || null, // Add delay from arrayObject2 if it exists
      };
    });

    return mergedArray; // Return the merged result
  } catch (error) {
    console.error("Error merging arrays:", error);
    throw error; // Rethrow the error for further handling if necessary
  }
};

exports.list = async (req, res) => {
  // return resSend(res, true, 200, "file wupleeoaded!", req.body, null);
  let client;
  try {
    client = await poolClient();
    await client.query("BEGIN");
    if (!req.query.poNo) {
      return resSend(res, false, 200, "poNo is requred.", [], null);
    }
    const purchasingDocNo = req.query.poNo;
    const query = `
            SELECT w.*, 
                   json_agg(
                       json_build_object(
                           'lineitem', wl.lineitem, 
                           'sublineitem', wl.sublineitem, 
                           'claim_qty', wl.claim_qty, 
                           'contractual_start', wl.contractual_start, 
                           'contractual_completion', wl.contractual_completion, 
                           'actual_start', wl.actual_start, 
                           'actual_completion', wl.actual_completion, 
                           'hinderance', wl.hinderance, 
                           'claim_amount', wl.claim_amount,
                           'description', wl.description,
                           'open_qty', wl.open_qty, 
                           'unit', wl.unit

                       )
                   ) AS item
            FROM public.wdc w
            LEFT JOIN public.wdc_line wl ON w.id = wl.wdc_id
            WHERE w.purchasing_doc_no = $1
            GROUP BY w.id, w.reference_no ORDER BY w.created_at DESC
        `;
    const data = await poolQuery({
      client,
      query,
      values: [purchasingDocNo],
    });

    const result = await Promise.all(
      data.map(async (item) => {
        return {
          ...item,
          action_by_name: await getUserName(client, item.action_by || 0, item.updated_by === "VENDOR" ? "VENDOR" : "HSL"),
          action_on_name: await getUserName(client, item.action_on || 0, item.updated_by === "VENDOR" ? "HSL" : "VENDOR"),
        };
      }),
    );
    resSend(res, true, 200, "data fetched.", result, null);
  } catch (error) {
    if (client) await client.query("ROLLBACK");
    console.error("[error]", error);
    resSend(res, false, 500, Message.SERVER_ERROR, null, null);
  } finally {
    if (client) client.release();
  }
};

const getUserName = async (client, userCode, userType) => {
  let tableName;
  let whereFieldName;
  let name;
  if (userType === "VENDOR") {
    tableName = VENDOR_MASTER_LFA1;
    whereFieldName = "lifnr";
    name = "name1";
  } else {
    tableName = EMPLAYEE_MASTER_PA0002;
    whereFieldName = "pernr";
    name = "cname";
  }
  const getUserQry = await poolQuery({
    client,
    query: `SELECT ${name} AS name FROM ${tableName} where ${whereFieldName} = $1`,
    values: [userCode],
  });

  return getUserQry.length == 0 ? "" : getUserQry[0].name;
};

exports.wdcUpdate = async (req, res) => {
  let client;
  try {
    // REQ PARAMS AND BODY DATA CAPTURE
    // const { reference_no } = req.params;
    const { status, reference_no, purchasing_doc_no, remarks2, delegate_to, ...otherUpdates } = req.body;
    const tokenData = req.tokenData;
    const { penalty_details, item } = otherUpdates;

    const check = await checkIsApprovedRejected(WDC, purchasing_doc_no, reference_no, APPROVED, REJECTED);

    if (parseInt(check)) {
      return resSend(res, false, 200, `The WDC/JCC is already  ${APPROVED} / ${REJECTED}`, null, null);
    }

    if (status == STATUS_DELEGATED && (!delegate_to || typeof delegate_to !== "string")) {
      return resSend(res, false, 200, Message.PLEASE_SEND_VALID_PAYLOAD, "Delegated to user missing", null);
    }

    // DB CLIENT INITATED
    client = await poolClient();
    await client.query("BEGIN");
    // LATEST WDC TABLE DATA
    let lastestWdc = await Wdc.getRecentWdcBySearchValue(client, { reference_no });
    // INSERT WDC DATA IN TABEL WITH NEW STATUS AND MORE DATA...

    if (!lastestWdc.length) {
      return resSend(res, false, 200, Message.INVOICE_NO_NOT_VALID, { reference_no });
    }

    lastestWdc = { ...lastestWdc[0] };

    // UPDATED FIELDS

    if (status === STATUS_DELEGATED) {
      lastestWdc.delegate_to = delegate_to;
    }
    if (status === STATUS_RECOMMEND) {
      lastestWdc.action_on = lastestWdc.assigned_to;
    }
    if (status === REJECTED) {
      lastestWdc.action_on = "--";
    }
    if (remarks2) {
      lastestWdc.remarks2 = remarks2;
    }

    const wdcPayload = wdcVendorPayload(tokenData, { ...lastestWdc, status, penalty_details });

    await Wdc.createWdc(client, wdcPayload);

    // HANDLE WDC LINE ITEMS DATA
    const previousWdcData = await Wdc.getSavedWdcLineItems(client, { reference_no, wdc_id: lastestWdc.created_at }, "*");
    let itemData = JSON.parse(item);
    comparePreviousDataAndSetNewData(previousWdcData, itemData);

    const removeExtraDataAndAddWdcId = itemData.map((el) => ({ ...el, wdc_id: wdcPayload.created_at }));

    const insertWdcLineData = await generateQueryForMultipleData(removeExtraDataAndAddWdcId, WDC_LINE, ["id"]);
    await poolQuery({ client, query: insertWdcLineData["q"], values: insertWdcLineData["val"] });

    await client.query("COMMIT");
    resSend(res, true, 200, `Document ${reference_no} status changed to ${status}.`);
  } catch (error) {
    console.error("error", error, error.message);
    if (client) await client.query("ROLLBACK");
    resSend(res, false, 500, Message.SOMTHING_WENT_WRONG, null, null);
  } finally {
    if (client) client.release();
  }
};
