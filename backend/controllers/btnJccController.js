const { poolClient, poolQuery } = require("../config/pgDbConfig");
const { INSERT } = require("../lib/constant");
const { BTN_REJECT } = require("../lib/event");
const { resSend } = require("../lib/resSend");
const { APPROVED, SUBMITTED_BY_VENDOR, SUBMITTED_BY_CAUTHORITY, REJECTED, SUBMITTED } = require("../lib/status");
const { BTN_JCC, BTN_ASSIGN, BTN_JCC_CERTIFY_AUTHORITY } = require("../lib/tableName");
const { generateQuery, generateInsertUpdateQuery } = require("../lib/utils");
const { filesData, getLatestBTN } = require("../services/btn.services");
const { jccPayloadObj, jccBtnforwordToFinacePaylaod, jccBtnbtnAssignPayload, getJccBTNDetails, checkHrCompliances } = require("../services/btnJcc.services");
const { addToBTNListFn, serviceBtnMailSend, updateServiceBtnListTable } = require("../services/btnServiceHybrid.services");
const { create_btn_no } = require("../services/po.services");
const { jccBtnSubmitToSAPF01 } = require("../services/sap.btn.services");
const { getVendorDetails } = require("../utils/btnUtils");
const Message = require("../utils/messages");
const { btnCurrentDetailsCheck } = require("./btnControllers");

// api start //
const initJccData = async (client, payload) => {

    try {
        const { poNo } = payload;
        if (!poNo) {
            return { success: false, statusCode: 200, message: "Please send PO No", data: null };

        }
        const data = [poNo];
        const result = await getVendorDetails(client, data);
        const complianceData = await checkHrCompliances(client, { poNo });

        const initialResponseData = {
            vendorDetails: result[0] || {},
            complianceData: complianceData
        }

        return { success: true, statusCode: 200, message: Message.DATA_FETCH_SUCCESSFULL, data: initialResponseData };

    } catch (error) {
        console.error("err", error);

        throw error;
    }
}

const submitJccBtn = async (req, res) => {
    let client;
    try {
        client = await poolClient();
        await client.query("BEGIN");
        const filesPaylaod = req.files;
        const tempPayload = req.body;
        const tokenData = req.tokenData;

        // Check required fields
        if (!tempPayload.net_claim_amount) {
            return resSend(res, false, 200, Message.MANDATORY_PARAMETR_MISSING, "Net Claim Amount Value is missing!", null);
        }
        if (!tempPayload.purchasing_doc_no || !tempPayload.jcc_ref_number) {
            return resSend(res, false, 200, Message.MANDATORY_PARAMETR_MISSING, "JCC No/PO No is missing!", null);
        }

        // check invoice number is already present in DB
        let check_invoice_q = `SELECT 
                                count(*) AS count 
                              FROM 
                                ${BTN_JCC} 
                              WHERE 
                                1 = 1 
                                AND vendor_code = $1 
                                AND jcc_ref_number = $2`;

        let check_invoice = await poolQuery({ client, query: check_invoice_q, values: [tokenData.vendor_code, tempPayload.jcc_number] });

        if (check_invoice && check_invoice[0].count > 0) {
            return resSend(res, false, 200, "BTN is already created under the invoice number/jcc.", null, null);
        }

        /**
         * FILE PAYLOADS AND FILE VALIDATION
         */
        const uploadedFiles = filesData(filesPaylaod);

        // FINAL PAYLOAD DATA
        let payload = jccPayloadObj(tempPayload);
        // BTN NUMBER GENERATE
        const btn_num = await create_btn_no(client);

        // MATH Calculation
        const net_claim_amount = parseFloat(payload.net_claim_amount);
        // FINAL PAYLOAD FOR SERVICE BTN //

        payload = {
            ...payload,
            ...uploadedFiles,
            btn_num,
            net_claim_amount,
            created_by_id: tokenData.vendor_code,
            vendor_code: tokenData.vendor_code,
        }

        const net_payable_amount = net_claim_amount;

        const { q, val } = generateQuery(INSERT, BTN_JCC, payload);

        await poolQuery({ client, query: q, values: val });
        let addToBtnListPayload = {
            ...payload,
            net_payable_amount,
            certifying_authority: payload.bill_certifing_authority,
            assign_by: tokenData.vendor_code,
            assign_to: payload.bill_certifing_authority,
        }

        await addToBTNListFn(client, addToBtnListPayload, SUBMITTED_BY_VENDOR);
        await client.query("COMMIT");
        resSend(res, true, 201, Message.BTN_CREATED, "BTN Created. No. " + btn_num, null);
        serviceBtnMailSend(tokenData, { ...payload, status: SUBMITTED });
    } catch (error) {
        console.error("[error]", error);
        if (client) await client.query("ROLLBACK");
        resSend(res, false, 500, Message.SOMTHING_WENT_WRONG, null, null);
    } finally {
        if (client) client.release();
    }
};

const getJccBtnData = async (req, res) => {
    let client;
    try {
        client = await poolClient();
        const { type } = req.query;
        if (!type) {
            return resSend(res, true, 200, Message.MANDATORY_INPUTS_REQUIRED, "Please send a valid type!", null)
        }
        let data;
        let message;
        let success = false;
        let statusCode;
        switch (type) {
            case 'details': {
                const result = await getJccBTNDetails(client, req.query);
                ({ data, message, success, statusCode } = result);
            }
                break;

            case 'jccinfo': {
                const result = await getJcc(client, req.query);
                ({ data, message, success, statusCode } = result);
            }
                break;
            case 'jcclist': {
                const result = await getJcc(client, req.query);
                ({ data, message, success, statusCode } = result);
            }
                break;
            case 'init': {
                const result = await initJccData(client, req.query);
                ({ data, message, success, statusCode } = result);
            }
                break;
            default:
                message = "Please send a valid type!"
                return resSend(res, success, 200, "Please send a valid type!", Message.MANDATORY_INPUTS_REQUIRED, null);
        }
        resSend(res, success, statusCode, message, data);

    } catch (error) {
        console.error("[error]", error);
        resSend(res, false, 500, Message.SOMTHING_WENT_WRONG, null, null);
    } finally {
        if (client) client.release();
    }

}

const getJcc = async (client, data) => {

    const { purchasing_doc_no, reference_no, type } = data;
    if (type === "jcclist") {
        let wdcListQuery = `SELECT DISTINCT(reference_no) AS jcc_ref_number, created_at as jcc_date FROM wdc`;
        let condQuery = ' WHERE 1 = 1';
        // TO GET ONLY WDC .. NO JCC OR THERS
        const val = ['JCC'];
        condQuery += " AND action_type = $1";
        if (purchasing_doc_no) {
            val.push(purchasing_doc_no);
            condQuery += " AND purchasing_doc_no = $2";
        }

        wdcListQuery += condQuery;

        const wdcList = await poolQuery({ client, query: wdcListQuery, values: val });
        return { success: true, statusCode: 200, message: Message.DATA_FETCH_SUCCESSFULL, data: wdcList };

    }

    if (!reference_no) {
        return { success: false, statusCode: 400, message: "Reference_no missing", data: [] };

    }

    const q = `
                SELECT jcc.*,
                    jcc.assigned_to AS certifying_by,
                    users.cname as certifying_by_name
                FROM
                    wdc AS jcc
                LEFT JOIN pa0002 AS users
                    ON(users.pernr :: character varying = jcc.assigned_to)
                WHERE (reference_no = $1 AND status = $2 AND action_type = $3) LIMIT 1`;

    let result = await poolQuery({ client, query: q, values: [reference_no, APPROVED, 'JCC'] });

    if (!result.length) {
        return { success: false, statusCode: 200, message: "JCC not approved yet.", data: [] };

    }

    return { success: true, statusCode: 200, message: Message.DATA_FETCH_SUCCESSFULL, data: result[0] };

};

const jccBtnforwordToFinace = async (req, res) => {

    let client;
    try {
        client = await poolClient();
        await client.query("BEGIN");
        let payload = req.body;
        const tokenData = req.tokenData;

        // BTN VALIDATION
        if (!payload.btn_num) {
            return resSend(res, false, 400, Message.MANDATORY_PARAMETR_MISSING, "btn num  missing", null);
        }
        const btnCurrnetStatus = await btnCurrentDetailsCheck(client, { btn_num: payload.btn_num });

        if (btnCurrnetStatus.isInvalid) {
            return resSend(res, false, 200, `BTN ${payload.btn_num} ${btnCurrnetStatus.message}`, payload.btn_num, null);
        }

        if (payload.status === REJECTED) {
            const response1 = await btnReject(payload, tokenData, client);
            await client.query("COMMIT");
            return resSend(res, true, 200, "Rejected successfully !!", response1, null);
        }

        if (!payload.recomend_payment || !payload.assign_to || !payload.purchasing_doc_no) {
            return resSend(res, false, 400, Message.MANDATORY_PARAMETR_MISSING, "Entry_no or net_payable_amount assign_to missing", null);
        }

        //  BTN FINANCE AUTHORITY DATA INSERT
        payload.created_by_id = tokenData.vendor_code;
        const financePaylad = jccBtnforwordToFinacePaylaod(payload);
        const { q, val } = generateQuery(INSERT, BTN_JCC_CERTIFY_AUTHORITY, financePaylad);
        const response = await poolQuery({ client, query: q, values: val });

        // BTN ASSIGN BY FINANCE AUTHORITY  
        const btnAssignPaylaod = jccBtnbtnAssignPayload({ ...payload, assign_by: tokenData.vendor_code });
        const assingPayload = await generateInsertUpdateQuery(btnAssignPaylaod, BTN_ASSIGN, ['btn_num', 'purchasing_doc_no']);
        await poolQuery({ client, query: assingPayload.q, values: assingPayload.val });

        // ADDING TO BTN LIST WITH CURRENT STATUS
        const latesBtnData = await getLatestBTN(client, payload);
        await addToBTNListFn(client, { ...latesBtnData, ...payload, assign_by: tokenData.vendor_code }, SUBMITTED_BY_CAUTHORITY);
        const sendSap = await jccBtnSubmitToSAPF01(payload, tokenData);

        if (sendSap == false) {
            await client.query("ROLLBACK");
            return resSend(res, false, 200, `SAP not connected.`, null, null);
        } else if (sendSap == true) {
            await client.query("COMMIT");
            resSend(res, true, 200, Message.DATA_SEND_SUCCESSFULL, response, "")
            serviceBtnMailSend(tokenData, { ...payload, status: SUBMITTED_BY_CAUTHORITY });

        }

    } catch (error) {
        console.error("error", error.message, error.stack);
        await client.query("ROLLBACK");
        resSend(res, false, 500, Message.SOMTHING_WENT_WRONG, null, null);
    } finally {
        if (client) client.release();
    }

}

async function btnReject(data, tokenData, client) {

    await updateServiceBtnListTable(client, data, tokenData);

    const sendSap = await jccBtnSubmitToSAPF01({ ...data, assign_to: null }, tokenData);

    if (sendSap == false) {
        throw new Error("SAP not connected.");
    } else if (sendSap == true) {
        serviceBtnMailSend(tokenData, data, BTN_REJECT);
    }
    return { btn_num: data.btn_num };
}

module.exports = {
    submitJccBtn,
    initJccData,
    getJccBtnData,
    getJcc,
    jccBtnforwordToFinace
}
