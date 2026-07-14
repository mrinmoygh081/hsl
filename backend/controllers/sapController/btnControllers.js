const { poolQuery, poolClient, getQuery, withTransaction, } = require("../../config/pgDbConfig");
const { INSERT, BTN_STATUS_HOLD_CODE, BTN_STATUS_PROCESS_ID, BTN_SERVICE_CONTRACT_BILL, YES_SORT_FORM, BTN_HYBRID_BILL_MATERIAL, } = require("../../lib/constant");
const { BTN_RETURN_DO } = require("../../lib/event");
const { responseSend } = require("../../lib/resSend");
const {
  BTN_STATUS_HOLD_TEXT,
  BTN_STATUS_UNHOLD_TEXT,
  BTN_STATUS_PAYMENT,
  BTN_STATUS_PAYMENT_DONE_TEXT,
  BTN_STATUS_PROCESS,
  STATUS_RECEIVED,
  BTN_STATUS_DRETURN,
} = require("../../lib/status");
const { BTN_LIST } = require("../../lib/tableName");
const {
  generateInsertUpdateQuery,
  generateQueryForMultipleData,
  generateQuery,
  getEpochTime,
} = require("../../lib/utils");
const { sendMail } = require("../../services/mail.services");
const {
  zbtsLineItemsPayload,
  zbtsHeaderPayload,
  zbtsHeaderPayloadUpdate,
} = require("../../services/sap.payment.services");
const { isPresentInObps } = require("../../services/sap.services");
const { getUserDetailsQuery } = require("../../utils/mailFunc");
const Message = require("../../utils/messages");
const localData = require("../../utils/localData.json");
const { updateBtnByBtnNumber } = require("../../services/btn.services");
const FI_PAYMENT_HEAD = localData.FI_PAYMENT_HEAD;

const zbts_st = async (req, res) => {
  try {
    await withTransaction(async (client) => {
      if (
        !req.body ||
        typeof req.body != "object" ||
        !Object.keys(req.body)?.length
      ) {
        return responseSend(res, "F", 400, Message.INVALID_PAYLOAD, null, null);
      }

      const payload = req.body;
      if (!payload) {
        return responseSend(res, "F", 400, "Invalid payload.", null, null);
      }

      /**
       * IF THE BTN IS NOT PART OF OBPS
       * NOT INSERT IN OBPS DB
       * IGNORE THIS BTN WHICH IS SEND FROM SAP
       */
      // const q = `SELECT count(*) as btn_count from btn_list where btn_num = $1`;
      // const btn_num = payload.zbtno || payload.ZBTNO;
      // const btnCount = await poolQuery({ client, query: q, values: [btn_num] });

      // CHECKING THE PO/DATA IS NOT PART OF OBPS PROJECT
      const btn_num = payload.zbtno || payload.ZBTNO;
      const isPresent = await isPresentInObps(
        client,
        `btn_num = '${btn_num}'`,
        BTN_LIST
      ).count();
      if (!isPresent) {
        return responseSend(res, "S", 200, Message.NON_OBPS_DATA, `THE BTN NO: ${btn_num} NOT IN OBPS SERVER`, null);
      }
      // END //

      const { ZBTSM, zbtsm, ...obj } = payload;
      let payloadObj = {};

      try {
        payloadObj = await zbtsHeaderPayload(obj);
        const btnPaymentHeaderQuery = await generateInsertUpdateQuery(
          payloadObj,
          "zbts_st",
          ["zbtno"]
        );
        await poolQuery({
          client,
          query: btnPaymentHeaderQuery.q,
          values: btnPaymentHeaderQuery.val,
        });
      } catch (error) {
        console.error("Data insert failed, zbts_st api", error.message);
        return responseSend(res, "F", 400, Message.DATA_INSERT_FAILED, error.message, null)
      }
      const zbtsmPayload = ZBTSM || zbtsm;

      if (zbtsmPayload) {
        // response2 = await query({ query: btnPaymentLineItemQuery, values: [] });

        // SAP BTN TABLE UPDATE
        try {
          const lineItemPayloadObj = await zbtsLineItemsPayload(zbtsmPayload, obj);
          const btnPaymentLineItemQuery = await generateQueryForMultipleData(lineItemPayloadObj, "zbtsm_st", ["zbtno", "srno"]);
          await poolQuery({ client, query: btnPaymentLineItemQuery.q, values: btnPaymentLineItemQuery.val });

        } catch (error) {
          console.error("Data insert failed, zbts_st api");
          return responseSend(res, "F", 400, Message.DATA_INSERT_FAILED, error.toString(), null);
        }
      }

      // UPDATE BTN LIST TABLE WHERE ANY ACTION TAKEN FROM SAP
      await updateBtnListTable(client, payloadObj);

      responseSend(res, "S", 200, "Data inserted successfully", {}, null);
    })
  } catch (error) {
    console.error("[ERROR] zbts_st", error);
    responseSend(res, "F", 502, Message.SERVER_ERROR, error.toString(), null);
  }
};

const updateBtnListTable = async (client, data) => {
  const statusObj = {
    1: "RECEIVED",
    2: "REJECTED",
    3: "APPROVE",
    4: "BANK",
    5: "D-RETURN",
  };
  let btnListTablePaylod = { btn_num: data.zbtno || data.ZREGNUM };
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
  const latestBtnDetails = await poolQuery({
    client,
    query: getLatestDataQuery,
    values: [btnListTablePaylod.btn_num],
  });

  if (latestBtnDetails.length) {
    btnListTablePaylod = {
      ...latestBtnDetails[0],
      ...btnListTablePaylod,
      created_at: getEpochTime(),
    };

    /**
     * status save in obps server
     * if status  BTN_STATUS_HOLD_CODE then obps list show BTN_STATUS_HOLD_TEXT
     * if un hold this, then status show default fstatus
     */
    let currentStatus = statusObj[data.fstatus] || "";
    if (data.hold && data.hold === BTN_STATUS_HOLD_CODE) {
      currentStatus = BTN_STATUS_HOLD_TEXT;
      btnListTablePaylod.vendor_code = data?.fpernr || "";
      btnListTablePaylod.assign_by = Number(data?.fpernr1) || data?.fpernr1; // selected finance aut
      btnListTablePaylod.assign_to = Number(data?.fpernr1) || data?.fpernr1; // selected finance aut
      btnListTablePaylod.remarks = data?.zrmk3;
      // btnListTablePaylod.assign_by = data?.ZMODIFIEDBY || data?.ZCREATEDBY;
      // btnListTablePaylod.assign_to = data?.ZMODIFIEDBY || data?.ZCREATEDBY;
    }
    if (btnListTablePaylod.status === BTN_STATUS_HOLD_TEXT && !data.hold) {
      currentStatus = BTN_STATUS_UNHOLD_TEXT;
      // btnListTablePaylod.assign_by = null;
      // btnListTablePaylod.assign_to = FI_PAYMENT_HEAD || "";
      btnListTablePaylod.assign_by = Number(data?.fpernr1) || data?.fpernr1; // selected finance aut
      btnListTablePaylod.assign_to = Number(data?.fpernr1) || data?.fpernr1; // selected finance aut
      btnListTablePaylod.remarks = data?.zrmk3;
      // btnListTablePaylod.assign_by = data?.ZMODIFIEDBY || data?.ZCREATEDBY;
      // btnListTablePaylod.assign_to = data?.ZMODIFIEDBY || data?.ZCREATEDBY;
    }

    // BANK TO PAYMENT
    if (data.bstatus && data.bstatus === BTN_STATUS_PAYMENT) {
      currentStatus = BTN_STATUS_PAYMENT_DONE_TEXT;
      btnListTablePaylod.vendor_code = Number(data?.fpernr2) || "";
      btnListTablePaylod.assign_by = FI_PAYMENT_HEAD || "";
      btnListTablePaylod.assign_to = "--";
    }

    // for PROCESS
    if (parseInt(data.CODE) === parseInt(BTN_STATUS_PROCESS_ID)) {
      currentStatus = BTN_STATUS_PROCESS;
      btnListTablePaylod.assign_by = data?.ZMODIFIEDBY || data?.ZCREATEDBY;
      btnListTablePaylod.assign_to = data?.ZMODIFIEDBY || data?.ZCREATEDBY;
    }

    // for D-RETURN
    if (data.fstatus === "5") {
      const getDoQuery = getUserDetailsQuery("do_by_btn", "$1");
      const doDetails = await getQuery({
        query: getDoQuery,
        values: [btnListTablePaylod.btn_num],
      });
      btnListTablePaylod.assign_by = Number(data?.fpernr1) || data?.fpernr1; // data?.frernam
      btnListTablePaylod.assign_to = doDetails[0]?.do_id; // DO //data?.rernam
      btnListTablePaylod.remarks = data?.zrmk3;
    }

    // BANK
    if (data.fstatus === "4") {
      btnListTablePaylod.assign_by = Number(data?.faernam) || data?.faernam; // data?.frernam
      btnListTablePaylod.assign_to = FI_PAYMENT_HEAD; // BANK
    }

    // for REJECT
    if (data.fstatus === "2") {
      const getVQuery = getUserDetailsQuery("vendor_by_btn", "$1");
      const vDetails = await getQuery({
        query: getVQuery,
        values: [btnListTablePaylod.btn_num],
      });
      btnListTablePaylod.assign_by = Number(data?.frernam) || data?.frernam; // data?.frernam
      btnListTablePaylod.assign_to = vDetails[0]?.do_id; // DO
      btnListTablePaylod.remarks = data?.zrmk3;
    }

    btnListTablePaylod.status = currentStatus;
    btnListTablePaylod.created_at = getEpochTime();

    // blank status po list data insert return
    if (!btnListTablePaylod?.status) return;

    // RECEIVED FORM GRSE(SAP)
    if (btnListTablePaylod?.status == STATUS_RECEIVED) {
      currentStatus = STATUS_RECEIVED;
      btnListTablePaylod.assign_by = Number(data?.fpernr1) || data?.fpernr1; // selected finance aut
      btnListTablePaylod.assign_to = Number(data?.fpernr1) || data?.fpernr1 // selected finance aut
      btnListTablePaylod.remarks = data?.zrmk3;
    };

    if (!btnListTablePaylod?.status == STATUS_RECEIVED && (!btnListTablePaylod.assign_by && !btnListTablePaylod.assign_to)) return;


    if (btnListTablePaylod.btn_type == BTN_SERVICE_CONTRACT_BILL) {
      const sBtnUpdatePayload = { status: currentStatus };
      if (currentStatus === BTN_STATUS_DRETURN) {
        sBtnUpdatePayload.current_ca = Number(btnListTablePaylod.assign_to) || btnListTablePaylod.assign_to;
        sBtnUpdatePayload.is_dreturn = YES_SORT_FORM;
      }
      await updateBtnByBtnNumber(client, btnListTablePaylod, sBtnUpdatePayload);
    }
    if (btnListTablePaylod.btn_type == BTN_HYBRID_BILL_MATERIAL) {
      const mBtnUpdatePayload = { status: currentStatus };
      // if (currentStatus === BTN_STATUS_DRETURN) {
      //   sBtnUpdatePayload.current_ca = btnListTablePaylod.assign_to;
      //   sBtnUpdatePayload.is_dreturn = YES_SORT_FORM;
      // }
      await updateBtnByBtnNumber(client, btnListTablePaylod, mBtnUpdatePayload);
    }


    const { q, val } = generateQuery(INSERT, "btn_list", btnListTablePaylod);
    await poolQuery({ client, query: q, values: val });
    if (data.fstatus == "5" || data.fstatus == 5) {
      await handelMail(btnListTablePaylod, client);
    }
  } else {
    // console.log("NO BTN FOUND IN LIST TO BE UPDATED btn controller");
  }

};

async function handelMail(payload, client) {
  try {
    let emailUserDetailsQuery;
    let emailUserDetails;
    let dataObj = payload;

    emailUserDetailsQuery = getUserDetailsQuery("vendor_and_do", "$1");
    emailUserDetails = await poolQuery({
      client,
      query: emailUserDetailsQuery,
      values: [payload.purchasing_doc_no],
    });
    dataObj = { ...dataObj, vendor_name: emailUserDetails[0]?.u_name };
    await sendMail(
      BTN_RETURN_DO,
      dataObj,
      { users: emailUserDetails },
      BTN_RETURN_DO
    );
  } catch (error) {
    console.error("handelMail btn ctrl sap", error.toString(), error.stack);
  }
}

const zbts_bstatus_update = async (req, res) => {
  try {
    const client = await poolClient();
    // let transactionSuccessful = false;

    try {
      if (
        !req.body ||
        typeof req.body != "object" ||
        !Object.keys(req.body)?.length
      ) {
        return responseSend(res, "F", 400, Message.INVALID_PAYLOAD, null, null);
      }

      const payload = req.body;
      if (!payload) {
        return responseSend(res, "F", 400, Message.INVALID_PAYLOAD, null, null);
      }

      /**
       * IF THE BTN IS NOT PART OF OBPS
       * NOT INSERT IN OBPS DB
       * IGNORE THIS BTN WHICH IS SEND FROM SAP
       */
      // const q = `SELECT count(*) as btn_count from btn_list where btn_num = $1`;
      // const btn_num = payload.zbtno || payload.ZBTNO;
      // const btnCount = await poolQuery({ client, query: q, values: [btn_num] });

      // CHECKING THE PO/DATA IS NOT PART OF OBPS PROJECT
      const btn_num = payload.zbtno || payload.ZBTNO;
      const isPresent = await isPresentInObps(
        client,
        `btn_num = '${btn_num}'`,
        BTN_LIST
      ).count();
      if (!isPresent) {
        return responseSend(res, "S", 200, Message.NON_OBPS_DATA, `THE BTN NO: ${btn_num} NOT IN OBPS SERVER`, null);
      }
      // END //
      let payloadObj = {};

      payloadObj = await zbtsHeaderPayloadUpdate(payload);
      const btnPaymentHeaderQuery = await generateInsertUpdateQuery(
        payloadObj,
        "zbts_st",
        ["zbtno"]
      );
      await poolQuery({
        client,
        query: btnPaymentHeaderQuery.q,
        values: btnPaymentHeaderQuery.val,
      });

      // UPDATE BTN LIST TABLE WHERE ANY ACTION TAKEN FROM SAP
      await updateBtnListTable(client, payloadObj);

      responseSend(res, "S", 200, "Data inserted successfully", {}, null);
    } catch (error) {
      responseSend(res, "F", 502, Message.SERVER_ERROR, error.toString(), null);
    } finally {
      client.release();
    }
  } catch (error) {
    responseSend(res, "F", 500, Message.DB_CONN_ERROR, error.message, null);
  }
};

module.exports = { zbts_st, zbts_bstatus_update, updateBtnListTable };
