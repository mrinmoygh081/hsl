/* eslint-disable no-undef */
/* eslint-disable no-unsafe-finally */
const { getQuery, poolClient, poolQuery } = require("../config/pgDbConfig");
const { makeHttpRequest } = require("../config/sapServerConfig");
const { INSERT, UPDATE } = require("../lib/constant");
const { resSend } = require("../lib/resSend");
const { REJECTED, SUBMITTED_BY_DO, SUBMITTED_BY_VENDOR } = require("../lib/status");
const { BTN_PBG, BTN_LIST, BTN_ASSIGN, BTN_ANY_OTHER_CLAIM } = require("../lib/tableName");
const { getEpochTime, getYyyyMmDd, generateQuery, generateInsertUpdateQuery } = require("../lib/utils");
const { create_btn_no } = require("../services/po.services");
const { checkBTNRegistered, fetchBTNListByPOAndBTNNum, } = require("../utils/btnUtils");
const { convertToEpoch } = require("../utils/dateTime");
const { getUserDetailsQuery } = require("../utils/mailFunc");
const { checkTypeArr } = require("../utils/smallFun");
const Message = require("../utils/messages");
const { addToBTNList, btnCurrentDetailsCheck, timeInHHMMSS, updateBtnListTable } = require("./btnControllers");
const { filesData } = require("../services/btn.services");
const { btnPBGPayload, getPBGBTNDetails, initPBGData } = require("../services/btnPbg.services");
const { materialBtnAssignPayload } = require("../services/btnMaterial.services");

/**------------------------------------------------------------------------------------------ */

const submitPbgBTN = async (req, res) => {
  let client;
  try {
    /**
     * REQ PAYLOAD AND FILES
    */
    let payloadFiles = req.files;
    const tokenData = req.tokenData;
    // INITIAL PAYLOAD
    let pbgBtnPayload = btnPBGPayload(tokenData, req.body);

    // Check required fields
    if (!pbgBtnPayload?.net_claim_amount || !pbgBtnPayload?.net_claim_amount.trim() === "" || isNaN(pbgBtnPayload?.net_claim_amount)) {
      return resSend(res, false, 200, Message.MANDATORY_PARAMETR_MISSING, "Claim Value is mandatory.", null);
    }

    if (!pbgBtnPayload?.purchasing_doc_no || !pbgBtnPayload?.invoice_no || !pbgBtnPayload.original_invoice_no) {
      return resSend(res, false, 200, Message.MANDATORY_PARAMETR_MISSING, "Invoice Number is missing!", null);
    }

    // DB CLIENT
    client = await poolClient();
    await client.query("BEGIN");

    // check invoice number is already present in DB
    let check_invoice_q = `SELECT count(*) as count FROM ${BTN_PBG} WHERE invoice_no = $1 and vendor_code = $2`;
    let check_invoice = await poolQuery({
      client,
      query: check_invoice_q,
      values: [pbgBtnPayload?.invoice_no, tokenData.vendor_code],
    });

    if (checkTypeArr(check_invoice) && check_invoice[0].count > 0) {
      return resSend(res, false, 200, "BTN is already created under the invoice number.", null, null);
    }

    /**
     * HANDLE UPLOADED FILES
     * FILES -- balance_claime_invoice_filename
     */
    const files = filesData(payloadFiles);

    /**
     * FINAL PAYLOAD
    */
    pbgBtnPayload = {
      ...pbgBtnPayload,
      ...files,
    };

    // INSERT Data into btn table

    const doDetails = await poolQuery({
      client,
      query: getUserDetailsQuery("do", "$1"),
      values: [pbgBtnPayload.purchasing_doc_no]
    });

    // BTN NUM GENERATE
    const btn_num = await create_btn_no(client);
    let resBtnList = await addToBTNList({
      ...pbgBtnPayload,
      btn_num,
      net_payable_amount: pbgBtnPayload.net_claim_amount,
      assign_to: doDetails[0]?.u_id || null,
    },
      SUBMITTED_BY_VENDOR, client);
    if (!resBtnList?.status) {
      return resSend(res, false, 200, Message.SERVER_ERROR, null, null);
    }

    /**
     * SAVE TO BTN TABLE
    */

    let { q, val } = generateQuery(INSERT, BTN_PBG, { ...pbgBtnPayload, btn_num });
    await poolQuery({ client, query: q, values: val });
    await client.query("COMMIT");
    resSend(res, true, 200, `BTN number ${btn_num} is generated and saved succesfully!`, { btn_num }, null);

  } catch (error) {
    console.error("[ERROR] submitPbgBTN", error.message, error);
    if (client) await client.query("ROLLBACK");
    resSend(res, false, 500, Message.SERVER_ERROR, null, null);
  }
  finally {
    if (client) client.release();
  }

}

const btnPbgSubmitByDO = async (req, res) => {
  let client;
  try {
    client = await poolClient();
    await client.query("BEGIN");
    let {
      btn_num,
      purchasing_doc_no,
      net_payable_amount,
      assign_to,
      status,
    } = req.body;
    const tokenData = { ...req.tokenData };

    if (!btn_num) {
      return resSend(res, false, 200, "BTN number is missing!", "No BTN number", null);
    }

    // BTN VALIDATION

    const btnCurrnetStatus = await btnCurrentDetailsCheck(client, {
      btn_num,
    });
    if (btnCurrnetStatus.isInvalid) {
      return resSend(res, false, 200, `BTN ${btn_num} ${btnCurrnetStatus.message}`, btn_num, null);
    }

    if (status === REJECTED) {
      if (!req.body.remarks) {
        return resSend(res, false, 200, `please send remarks when ${REJECTED} !!`, null, null
        );
      }
      const response1 = await btnReject(req.body, tokenData, client);
      if (response1 == false) {
        // await client.query("COMMIT");
        await client.query("ROLLBACK");
        return resSend(res, false, 200, `SAP not connected2.`, null, null);
      } else if (response1 == true) {
        await client.query("COMMIT");
      }
      return resSend(res, true, 200, "Rejected successfully !!", null, null);
    }

    let payload = { ...req.body, created_by: tokenData?.vendor_code };

    // Check required fields
    if (!net_payable_amount) {
      return resSend(res, false, 200, "Net payable is missing!", null, null);
    }

    // Check BTN by BTN Number
    let checkBTNR = await checkBTNRegistered(btn_num, purchasing_doc_no);
    let isInserted = false;
    let whereCondition;
    if (checkBTNR) {
      //return resSend(res, false, 200, "BTN is already submitted!", null, null);
      isInserted = true;
    }

    // created at
    let created_at = getEpochTime(); //new Date().toLocaleDateString();
    payload = { ...payload, created_at };

    // INSERT data into BTN List Table
    let d = await fetchBTNListByPOAndBTNNum(btn_num, purchasing_doc_no);
    if (d?.status) {
      let btn_list_payload = d?.data;
      btn_list_payload.net_payable_amount = net_payable_amount;
      payload = {
        ...payload,
        net_claim_amount: btn_list_payload?.net_claim_amount,
        btn_type: btn_list_payload?.btn_type,
      };
    } else {
      return resSend(res, false, 200, d?.message, null, null);
    }

    // INSERT data into BTN ASSIGN Table
    let assign_payload = {
      btn_num,
      purchasing_doc_no,
      assign_by: payload.created_by,
      assign_to: payload.assigned_to,
      last_assign: true,
      assign_by_fi: "",
      assign_to_fi: "",
      last_assign_fi: false,
    };


     /** btn_assign table inserted */
    const btnAssignPayload = materialBtnAssignPayload(assign_payload);
    const assignQuery = await generateInsertUpdateQuery(btnAssignPayload, BTN_ASSIGN, ["btn_num", "purchasing_doc_no"]);
    await poolQuery({ client, query: assignQuery.q, values: assignQuery.val });

    // let assign_q;
    // if (isInserted == true) {
    //   // update
    //   whereCondition = {
    //     btn_num: assign_payload.btn_num,
    //     purchasing_doc_no: assign_payload.purchasing_doc_no,
    //   };
    //   assign_q = generateQuery(
    //     UPDATE,
    //     BTN_ASSIGN,
    //     assign_payload,
    //     whereCondition
    //   );
    // } else {
    //   //insert
    //   assign_q = generateQuery(INSERT, BTN_ASSIGN, assign_payload);
    // }

    // let assign_q = generateQuery(INSERT, BTN_ASSIGN, assign_payload);
    // await poolQuery({ client, query: assign_q.q, values: assign_q.val });

    payload.vendor_code = tokenData?.vendor_code;
    let resBtnList = await insertUpdateToBTNList(
      client,
      {
        ...payload,
        assign_by: payload.created_by,
        assign_to: payload.assigned_to,
      },
      SUBMITTED_BY_DO,
      isInserted
    );
    if (!resBtnList?.status) {
      return resSend(
        res,
        false,
        200,
        `Something went wrong in BTN List!`,
        null,
        null
      );
    }

    delete payload.assign_to;
    delete payload.p_sdbg_amount;
    delete payload.p_estimate_amount;
    delete payload.created_by;
    delete payload.net_claim_amount;
    //delete payload.btn_type;
    delete payload.vendor_code;
    payload.created_at = convertToEpoch(new Date());
    payload.ld_ge_date = convertToEpoch(new Date(payload.ld_ge_date));

    assign_to = assign_payload.assign_to;
    try {
      const sendSap = await btnSubmitByDo(
        { btn_num, btn_type: payload.btn_type, purchasing_doc_no, assign_to },
        tokenData
      );
      // const sendSap = true;

      if (sendSap == false) {
        // await client.query("COMMIT");
        await client.query("ROLLBACK");
        return resSend(res, false, 200, `SAP not connected.`, null, null);
      } else if (sendSap == true) {
        await client.query("COMMIT");
        // handelMail(tokenData, {
        //   ...payload,
        //   assign_to,
        //   status: SUBMIT_BY_DO,
        // });
      }
    } catch (error) {
      console.error("error sap data send error", error.message, error.stack);
    }

    // if (!result.error) {
    // } else {
    //   // return resSend(res, false, 200, JSON.stringify(result), null, null);
    // }
    return resSend(res, true, 200, "BTN has been updated!", null, null);
  } catch (error) {
    console.error("error", error.message, error.stack);
    await client.query("ROLLBACK");
    resSend(res, false, 500, Message.SERVER_ERROR, null, null);
  } finally {
    if (client) client.release();
  }
};

async function btnSubmitByDo(btnPayload, tokenData) {
  let status = false;
  try {
    let vendorQuery;

    if (btnPayload.btn_type === "claim-against-pbg") {
      vendorQuery = `WITH ranked_assignments AS (
            SELECT
                btn_assign.*,
                ROW_NUMBER() OVER (PARTITION BY btn_assign.btn_num ORDER BY btn_assign.ctid DESC) AS rn
            FROM
                btn_assign
        )
        SELECT 
          ${BTN_PBG}.*,
        	ged.invno, 
        	ged.inv_date as invoice_date,
        	vendor.stcd3,
        	users.pernr as finance_auth_id,
        	users.cname as finance_auth_name,
        	vendor.name1 as vendor_name,
        	assign_users.cname as assign_name,
        	ranked_assignments.assign_by as assign_id

        FROM 
            ${BTN_PBG}
        LEFT JOIN 
            ranked_assignments
            ON (${BTN_PBG}.btn_num = ranked_assignments.btn_num
            AND ranked_assignments.rn = 1)
        LEFT JOIN zmm_gate_entry_d as ged
        		ON( ${BTN_PBG}.purchasing_doc_no = ged.ebeln AND ${BTN_PBG}.invoice_no = ged.invno)
        LEFT JOIN lfa1 as vendor
        		ON(${BTN_PBG}.vendor_code = vendor.lifnr)
        LEFT JOIN pa0002 as users
        		ON(users.pernr::character varying = $1)
        LEFT JOIN pa0002 as assign_users
        		ON(assign_users.pernr::character varying = ranked_assignments.assign_by)
        WHERE 
            ${BTN_PBG}.btn_num = $2`;
    } else {
      vendorQuery = `WITH ranked_assignments AS (
            SELECT
                btn_assign.*,
                ROW_NUMBER() OVER (PARTITION BY btn_assign.btn_num ORDER BY btn_assign.ctid DESC) AS rn
            FROM
                btn_assign
        )
        SELECT 
          ${BTN_ANY_OTHER_CLAIM}.*,
        	vendor.stcd3,
        	users.pernr as finance_auth_id,
        	users.cname as finance_auth_name,
        	vendor.name1 as vendor_name,
        	assign_users.cname as assign_name,
        	ranked_assignments.assign_by as assign_id
        FROM 
            ${BTN_ANY_OTHER_CLAIM}
        LEFT JOIN 
            ranked_assignments
            ON (${BTN_ANY_OTHER_CLAIM}.btn_num = ranked_assignments.btn_num
            AND ranked_assignments.rn = 1)
        LEFT JOIN lfa1 as vendor
        		ON(${BTN_ANY_OTHER_CLAIM}.vendor_code = vendor.lifnr)
        LEFT JOIN pa0002 as users
        		ON(users.pernr::character varying = $1)
        LEFT JOIN pa0002 as assign_users
        		ON(assign_users.pernr::character varying = ranked_assignments.assign_by)
        WHERE 
            ${BTN_ANY_OTHER_CLAIM}.btn_num = $2`;
    }

    let btnDetails = await getQuery({
      query: vendorQuery,
      values: [btnPayload.assign_to, btnPayload.btn_num],
    });

    let btn_payload = {
      EBELN: btnPayload.purchasing_doc_no || btnDetails[0]?.purchasing_doc_no, // PO NUMBER
      LIFNR: btnDetails[0]?.vendor_code, // VENDOR CODE
      RERNAM: btnDetails[0]?.vendor_name, // REG CREATOR NAME --> VENDOR NUMBER
      STCD3: btnDetails[0]?.stcd3, // VENDOR GSTIN NUMBER
      ZVBNO:
        btnPayload.btn_type === "claim-against-pbg"
          ? btnDetails[0]?.invno
          : btnDetails[0]?.letter_reference_no, // GATE ENTRY INVOCE NUMBER
      VEN_BILL_DATE:
        btnPayload.btn_type === "claim-against-pbg"
          ? getYyyyMmDd(new Date(btnDetails[0]?.invoice_date).getTime())
          : getYyyyMmDd(btnDetails[0]?.letter_date), // GATE ENTRY INVOICE DATE
      PERNR: tokenData.vendor_code, // DO ID
      ZBTNO: btnPayload.btn_num, //  BTN NUMBER
      ERDAT: btnPayload.btn_num.substring(0, 8), // getYyyyMmDd(getEpochTime()), // VENDOR BILL SUBMIT DATE
      ERZET: timeInHHMMSS(), // VENDOR BILL SUBMIT TIME
      RERDAT: btnPayload.btn_num.substring(0, 8), //getYyyyMmDd(getEpochTime()), //REGISTRATION NUMBER --- VENDOR BILL SUBMIT DATE
      RERZET: timeInHHMMSS(), //REGISTRATION NUMBER --- VENDOR BILL SUBMIT TIME
      DPERNR1: tokenData.vendor_code, // DO NUMBER
      DRERDAT1: getYyyyMmDd(getEpochTime()), // DEPARTMETN RECECE DATE --> WHEN SUBMIT DO
      DRERZET1: timeInHHMMSS(), // DEPARTMETN RECECE TIME --> WHEN SUBMIT DO
      DRERNAM1: tokenData.name, // DEPARTMETN RECECE DO ID --> WHEN SUBMIT DO
      DAERDAT: getYyyyMmDd(getEpochTime()), // DEPARTMENT APPROVAL DATE --> DO SUBMISSION DATE
      DAERZET: timeInHHMMSS(), // DEPARTMENT APPROVAL DATE --> DO SUBMISSION TIME
      DAERNAM: tokenData.name, // DEPARTMENT APPROVAL NAME --> DO NAME

      // DEERDAT: "", // REJECTION DATE
      // DEERZET: timeInHHMMSS(), // REJECTION TIME
      // DEERNAM: "", // DO ( WHO REJECTED)
      // ZRMK2: "", // "REJECTION REASON REMARKS / DO SUBMIT REMARKS"

      DFERDAT: getYyyyMmDd(getEpochTime()), // DO SUBMIT DATE
      DEFRZET: timeInHHMMSS(), // DO SUBMIT TIEM
      DEFRNAM: tokenData.name || "", // DO SUBMIT NAME ( DO NAME)
      DSTATUS: "4", // "4"
      DPERNR: tokenData.vendor_code, //  (DO)

      FPRNR1: btnPayload.assign_to || "", // FINACE AUTHIRITY ID ( )
      FPRNAM1: btnDetails[0]?.assign_name || "", // FINANCE
      FSTATUS: "", // BLANK STATUS
    };

    /**
     * IF BTN REJECTED BY DO
     */
    if (btnPayload.status === REJECTED) {
      btn_payload = {
        ...btn_payload,
        DEERDAT: getYyyyMmDd(getEpochTime()), // REJECTION DATE
        DEERZET: timeInHHMMSS(), // REJECTION TIME
        DEERNAM: tokenData.name, // DO ( WHO REJECTED)
        ZRMK2: btnPayload.rejectedMessage || "Rejeced by DO", // "REJECTION REASON REMARKS / DO SUBMIT REMARKS"
        DSTATUS: "2", // rejected status
      };
    }

    const sapBaseUrl = process.env.SAP_HOST_URL || "http://10.181.1.31:8010";
    const postUrl = `${sapBaseUrl}/sap/bc/zobps_do_out`;
    const postResponse = await makeHttpRequest(postUrl, "POST", btn_payload);
    if (
      postResponse.statusCode &&
      postResponse.statusCode >= 200 &&
      postResponse.statusCode <= 226
    ) {
      status = true;
    }
    console.warn("POST Response from the server:", postResponse);
  } catch (error) {
    console.error("Error making the request:", error.message);
  } finally {
    return status;
  }
}

async function btnReject(data, tokenData, client) {
  const obj = {
    btn_num: data.btn_num,
    remarks: data.remarks,
  };

  await updateBtnListTable(client, obj);
  const status = await btnSubmitByDo({ ...data, assign_to: null }, tokenData);

  return status; //{ btn_num: data.btn_num };
}

// eslint-disable-next-line no-unused-vars
const insertUpdateToBTNList = async (client, data, status, isInserted) => {
  let payload = {
    btn_num: data?.btn_num,
    purchasing_doc_no: data?.purchasing_doc_no,
    net_claim_amount: data?.net_claim_amount,
    net_payable_amount: data?.net_payable_amount,
    vendor_code: data?.vendor_code,
    created_at: data?.created_at,
    btn_type: data?.btn_type,
    status: status,
    assign_by: data?.assign_by,
    assign_to: data?.assign_to,
  };

  let { q, val } = await generateQuery(INSERT, BTN_LIST, payload);
  const res = await poolQuery({ client, query: q, values: val });

  if (!res.error) {
    return { status: true, data: res };
  } else {
    return { status: false, data: null };
  }
};



const getPBGData = async (req, res) => {
  let client;
  try {
    client = await poolClient();
    const { type } = req.query;
    // if (!type) {
    //   return resSend(res, true, 200, Message.MANDATORY_INPUTS_REQUIRED, "Please send a valid type!", null)
    // }
    let data;
    let message;
    let success = false;
    let statusCode;
    switch (type) {
      case 'init': {
        const result = await initPBGData(client, req.query);
        ({ data, message, success, statusCode } = result);
      }
        break;
      default:
        {
          const result = await getPBGBTNDetails(client, req.query);
          ({ data, message, success, statusCode } = result);
        }
    }
    resSend(res, success, statusCode, message, data);

  } catch (error) {
    console.error("[error]", error);
    resSend(res, false, 500, Message.SERVER_ERROR, null, null);
  } finally {
    if (client) client.release();
  }

}

module.exports = { submitPbgBTN, btnPbgSubmitByDO, getPBGData };
