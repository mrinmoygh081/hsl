const { poolClient, poolQuery, getQuery } = require("../config/pgDbConfig");
const { INSERT } = require("../lib/constant");
const { resSend } = require("../lib/resSend");
const { SUBMITTED_BY_VENDOR, REJECTED } = require("../lib/status");
const { BTN_ANY_OTHER_CLAIM, BTN_LIST, BTN_PBG, BTN_MATERIAL, BTN_SERVICE_HYBRID } = require("../lib/tableName");
const { getEpochTime, generateQuery } = require("../lib/utils");
const { create_btn_no } = require("../services/po.services");;
const Message = require("../utils/messages");
const { addToBTNList } = require("./btnControllers");
const { btnIncorrectDuctionPayload } = require("../services/btnIncorrectDuct.services");
const { deleteFileByPath } = require("../lib/deleteFile");
const { getUserDetailsQuery } = require("../utils/mailFunc");
const QueryBuilder = require("../utils/QueryBuilder");

/**  --------------------------------------------------------------------------------------- */

const btnInvoiceCheck = async (client, letter_reference_no, purchasing_doc_no) => {
  let check_invoice_q =
    `SELECT 
        t1.*
        FROM btn_list AS t1
        WHERE t1.created_at = (
              SELECT 
                  MAX(t1_inner.created_at)
              FROM btn_list AS t1_inner
                LEFT JOIN btn_any_other_claim AS t2 
                  ON t1_inner.btn_num = t2.btn_num
              WHERE 
                t2.letter_reference_no = $1 AND t1_inner.purchasing_doc_no = $2 )`;

  const check_invoice = await poolQuery({
    client,
    query: check_invoice_q,
    values: [letter_reference_no, purchasing_doc_no],
  });

  return check_invoice;
}

const submitIncorrectDuct = async (req, res) => {
  let client;
  try {
    client = await poolClient();
    await client.query("BEGIN");
    let { total_claim_amount, letter_reference_no, purchasing_doc_no } = req.body;

    const tokenData = req.tokenData;
    let payload = btnIncorrectDuctionPayload(req.body);

    // Handle uploaded files
    if (req.files.invoice_file && req.files.invoice_file[0].filename) {
      payload.invoice_filename = req.files.invoice_file[0].filename;
      payload.invoice_file_path = req.files.invoice_file[0].path;
    }

    // Check required fields
    if (!total_claim_amount || !total_claim_amount.trim() === "" || isNaN(total_claim_amount)) {
      deleteFileByPath(payload.invoice_file_path)
      return resSend(res, false, 200, "Claim Value is mandatory.", null, null);
    }

    payload = {
      ...payload,
      vendor_code: tokenData?.vendor_code,
      created_by_id: tokenData?.vendor_code,
      created_at: getEpochTime(),
      updated_by: "VENDOR"
    };

    const check_invoice = await btnInvoiceCheck(client, letter_reference_no, purchasing_doc_no);
    if (check_invoice.length == 0 || (check_invoice.length > 0 && check_invoice[0].status == REJECTED)) {
      // generate btn num
      const btn_num = await create_btn_no(client);
      payload = { ...payload, btn_num };

      payload.net_claim_amount = total_claim_amount;

      const doDetails = await poolQuery({
        client,
        query: getUserDetailsQuery("do", "$1"),
        values: [payload.purchasing_doc_no]
      });

      // INSERT Data into btn table
      const btnAddToListPayload = {
        ...payload,
        net_payable_amount: total_claim_amount,
        assign_to: doDetails[0]?.u_id || null
      }
      let resBtnList = await addToBTNList(btnAddToListPayload, SUBMITTED_BY_VENDOR, client);
      if (!resBtnList?.status) {
        await client.query("ROLLBACK");
        return resSend(res, false, 200, Message.DATA_NOT_INSERTED, null, null);
      }

      let { q, val } = generateQuery(INSERT, BTN_ANY_OTHER_CLAIM, payload);
      await poolQuery({ client, query: q, values: val });
      await client.query("COMMIT");
      resSend(res, true, 200, "BTN number is generated and saved succesfully!", { btn_num }, null);
    } else {
      return resSend(res, false, 200, "BTN is already created under the invoice number.", null, null);
    }
  } catch (error) {
    console.error("[ERROR] btn Incorrect Duction", error.message, error);
    await client.query("ROLLBACK");
    resSend(res, false, 500, Message.SOMTHING_WENT_WRONG, null, null);
  } finally {
    if (client) client.release();
  }
};

const getBtnFile = async (req, res) => {
  let client;
  try {
    client = await poolClient();
    const btn_num = req.query.btn_num;

    if (!btn_num) {
      return resSend(res, false, 200, "BTN number is missing!", "No BTN number", null);
    }

    const check_btn_q = `SELECT btn_type FROM ${BTN_LIST} WHERE btn_num = $1`;
    const check_btn_in_list_table = await poolQuery({
      client,
      query: check_btn_q,
      values: [btn_num],
    });
    if (!check_btn_in_list_table.length) {
      return resSend(res, false, 200, Message.NO_DATA_FOUND, "No record found by this BTN number.", null);
    }
    const table_type = check_btn_in_list_table[0].btn_type;
    let table;
    switch (table_type) {
      case "claim-against-pbg":
        {
          table = BTN_PBG;
        }
        break;
      case "hybrid-bill-material":
        {
          table = BTN_MATERIAL;
        }
        break;
      case "service-contract-bills":
        {
          table = BTN_SERVICE_HYBRID;
        }
        break;
      default:
        return resSend(res, false, 200, "Invalid BTN type!", null, null);
    }

    const get_btn_file_q = `SELECT invoice_filename FROM ${table} WHERE btn_num = $1 AND btn_type = $2`;
    const get_btn_file = await poolQuery({
      client,
      query: get_btn_file_q,
      values: [btn_num, check_btn_in_list_table[0].btn_type],
    });
    resSend(res, true, 200, Message.DATA_FETCH_SUCCESSFULL, get_btn_file, null);
  } catch (error) {
    console.error("[error] forgotPasswordOtp", error);
    resSend(res, false, 500, Message.SOMTHING_WENT_WRONG, null, null);
  } finally {
    if (client) client.release();
  }
};

const getGstnByPo = async (req, res) => {
  try {

    const poNo = req.query.poNo;

    if (!poNo) {
      return resSend(res, false, 200, "poNo number is missing!", "No poNo", null);
    }

    const qry = `SELECT t2.lifnr,t2.name1,t2.stcd3 FROM ekko as t1
                        LEFT JOIN lfa1  as t2 ON t1.lifnr = t2.lifnr
                    WHERE t1.ebeln = $1`;

    const get_gstn = await getQuery({ query: qry, values: [poNo] });
    resSend(res, true, 200, Message.DATA_FETCH_SUCCESSFULL, get_gstn, null);
  } catch (error) {
    console.error("[error] getgstbypono", error);
    resSend(res, false, 500, Message.SOMTHING_WENT_WRONG, null, null);
  }
}

const getIncorrectDeductionData = async (req, res) => {

  try {

    const btn_num = req.query;
    const qb = new QueryBuilder(BTN_ANY_OTHER_CLAIM);
    qb.select("*")
      .where("btn_num", "=", btn_num)
      .paginate(1, 1);

    const incorrDectBtnDetails = qb.toJSON();

    const result = await getQuery({ query: incorrDectBtnDetails.sql, values: incorrDectBtnDetails.params });

    resSend(res, true, 200, Message.DATA_FETCH_SUCCESSFULL, result, null);
  } catch (error) {
    console.error("btn Incorrect Duction api error", error.message, error.stack);
    resSend(res, false, 500, Message.SOMTHING_WENT_WRONG, null, null);
  }
}

module.exports = { submitIncorrectDuct, getBtnFile, getGstnByPo, getIncorrectDeductionData };