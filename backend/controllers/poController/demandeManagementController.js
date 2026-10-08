const { resSend } = require("../../lib/resSend");
const { query, getQuery, poolClient, poolQuery } = require("../../config/pgDbConfig");
const { generateQuery, getEpochTime } = require("../../lib/utils");
const { INSERT } = require("../../lib/constant");
const { DEMAND_MANAGEMENT, EKPO, EKKO, WDC } = require("../../lib/tableName");
const { APPROVED, SUBMITTED, STATUS_RECEIVED } = require("../../lib/status");
const { create_reference_no, get_latest_activity } = require("../../services/po.services");
const { DEMAND_UPLOAD_BY_BEARTH } = require("../../lib/event");
const { sendMail } = require("../../services/mail.services");
const { getUserDetailsQuery } = require("../../utils/mailFunc");
const Message = require("../../utils/messages");

const insert = async (req, res) => {

  try {
    const tokenData = { ...req.tokenData };
    const obj = { ...req.body };

    if (!obj.purchasing_doc_no || !obj.status) {
      return resSend(res, false, 200, "Please send valid payload", null, null);
    }

    if (tokenData.user_type == 1) {
      return resSend(res, false, 200, "Please login as HSL users!", null, null);
    }

    const checkDo = await checkIsDealingOfficer(obj.purchasing_doc_no, tokenData.vendor_code);
    if (checkDo == 1) {
      return resSend(res, false, 200, "Do can not raise demand!", null, null);
    }

    if (obj.status != SUBMITTED && obj.status != STATUS_RECEIVED) {
      return resSend(res, false, 200, "Please send a valid action type!", null, null);
    }

    let payload;

    if (obj.status == SUBMITTED) {
      if (!obj.action_type || obj.action_type == "") {
        return resSend(res, false, 200, "please send a valid action_type!", null, null);
      }
      let reference_no = create_reference_no("DM", tokenData.vendor_code);

      payload = {
        ...obj,
        reference_no: reference_no,
        demand: JSON.stringify(obj.demand),
        created_at: getEpochTime(),
        created_by_id: tokenData.vendor_code,
        remarks: obj.remarks,
      };
    } else if (obj.status == STATUS_RECEIVED) {
      if (!obj.reference_no || obj.reference_no == "") {
        return resSend(res, false, 200, "please send reference_no!", null, null);
      }

      let last_data = await get_latest_activity(null, DEMAND_MANAGEMENT, obj.purchasing_doc_no, obj.reference_no);
      if (last_data) {
        delete last_data.id;
        last_data.demand = JSON.stringify(obj.demand);
        payload = {
          ...last_data,
          status: obj.status,
          remarks: obj.remarks,
          created_at: getEpochTime(),
          created_by_id: tokenData.vendor_code,
        };
      } else {
        return resSend(res, false, 200, `No record found with this reference_no!`, null, null);
      }
    }

    let { q, val } = generateQuery(INSERT, DEMAND_MANAGEMENT, payload);
    const response = await query({ query: q, values: val });
    if (response) {
      if (obj.status == SUBMITTED) {
        handleEmail(payload);
      }

      return resSend(res, true, 200, `DEMAND MANAGEMENT ${obj.status} successfully !`, response, null);
    } else {
      return resSend(res, false, 400, "something went wrong!", response, null);
    }

  } catch (error) {
    console.error(error.message);

    resSend(res, false, 500, Message.SOMTHING_WENT_WRONG, null);
  }
};

const checkIsDealingOfficer = async (purchasing_doc_no, vendor_code) => {
  const getQuery = `SELECT COUNT(EBELN) AS man_no FROM ${EKKO} WHERE EBELN = $1 AND ERNAM = $2`;
  const result = await query({
    query: getQuery,
    values: [purchasing_doc_no, vendor_code],
  });
  return result.rows[0].man_no;
};

const list = async (req, res) => {
  try {
    if (!req.query.poNo) {
      return resSend(res, false, 400, "Please send poNo", null, "");
    }

    const demande_query = `SELECT * FROM demande_management WHERE purchasing_doc_no = $1`;
    const result = await query({
      query: demande_query,
      values: [req.query.poNo],
    });

    if (result.rows) {
      return resSend(res, true, 200, "Demande Management Data fetched succesfully!", result.rows, null);
    } else {
      return resSend(res, false, 200, "Data not fetched!", null, null);
    }
  } catch (error) {
    console.error("[error]", error);
    resSend(res, false, 500, Message.SOMTHING_WENT_WRONG, null, "");
  }
};

const getRestAmount = async (req, res) => {
  try {
    const client = await poolClient();
    try {
      if (!req.query.po_no) {
        return resSend(res, false, 200, "PO No. required", [], "");
      }

      const lineItem = parseInt(req.query.line_item_no);
      if (isNaN(lineItem) || lineItem <= 0) {
        return resSend(res, false, 200, "Line item no. required", [], "");
      }

      const get_data_query = `SELECT TXZ01 AS description, MATNR AS matarial_code, MEINS AS unit, MENGE AS target_amount, NETPR AS po_rate from ${EKPO} WHERE EBELN = $1 AND EBELP = $2`;
      let get_data_result = await poolQuery({
        client,
        query: get_data_query,
        values: [req.query.po_no, lineItem],
      });

      const total_amount_query = `SELECT SUM(MENGE) AS total_amount from mseg WHERE EBELN = $1 AND EBELP = $2`;
      let total_amount_result = await poolQuery({
        client,
        query: total_amount_query,
        values: [req.query.po_no, lineItem],
      });
      total_amount_result = total_amount_result[0].total_amount == null ? 0 : total_amount_result[0].total_amount;

      let target_amount_result = get_data_result[0].target_amount ? get_data_result[0].target_amount : 0;

      target_amount_result = parseFloat(target_amount_result).toFixed(3);
      total_amount_result = parseFloat(total_amount_result).toFixed(3);

      let rest_amount = target_amount_result - total_amount_result;
      rest_amount = rest_amount.toFixed(3);

      const resData = get_data_result[0];
      resData.rest_amount = rest_amount;

      let rest_amount_wdc = parseFloat(0).toFixed(3);

      const wdc_claim_amount_query = `SELECT line_item_array from ${WDC} WHERE purchasing_doc_no = $1 AND action_type = $2 AND status = $3`;
      let wdc_claim_amount_result = await poolQuery({
        client,
        query: wdc_claim_amount_query,
        values: [req.query.po_no, "WDC", APPROVED],
      });

      if (wdc_claim_amount_result.length && wdc_claim_amount_result.length === 0) {
        rest_amount_wdc = target_amount_result;
      } else {
        let strArr = [];
        wdc_claim_amount_result.map((item) => {
          let datas = JSON.parse(item.line_item_array);

          if (datas && Array.isArray(datas) && datas.length) {
            const find_line_item_no = datas.find(({ line_item_no }) => line_item_no == lineItem);
            if (find_line_item_no) {
              strArr.push(find_line_item_no.claim_qty);
            }
          }
        });

        let sum = strArr.reduce((accumulator, currentValue) => accumulator + parseFloat(currentValue), 0);

        rest_amount_wdc = target_amount_result - sum;
      }
      if (rest_amount_wdc < 0) {
        rest_amount_wdc = 0;
      }
      resData.rest_amount_wdc = parseFloat(rest_amount_wdc).toFixed(3);

      resSend(res, true, 200, "Rest Amount fetched succesfully!", resData, null);
    } catch (err) {
      console.error(err.message);
      resSend(res, false, 500, Message.SOMTHING_WENT_WRONG, null, "");
    } finally {
      client.release();
    }
  } catch (error) {
    console.error(error.message);
  }
};

async function handleEmail(data) {
  // Maill trigger to VENDOR.

  try {
    const vendorDetalisQ = getUserDetailsQuery("vendor_by_po", "$1");
    const vendorDetails = await getQuery({
      query: vendorDetalisQ,
      values: [data.purchasing_doc_no],
    });
    const dataObj = { ...data, vendor_name: vendorDetails[0]?.u_name };
    await sendMail(DEMAND_UPLOAD_BY_BEARTH, dataObj, { users: vendorDetails }, DEMAND_UPLOAD_BY_BEARTH);
  } catch (error) {
    console.log("handleEmail", error.toString(), error.stack);
  }
}

module.exports = { insert, list, getRestAmount };
