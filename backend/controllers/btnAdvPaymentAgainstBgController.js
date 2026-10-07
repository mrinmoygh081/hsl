const { poolQuery, poolClient } = require("../config/pgDbConfig");
const { resSend } = require("../lib/resSend");
const { INSERT, UPDATE } = require("../lib/constant");
const { SUBMITTED_BY_DO, SUBMITTED_BY_VENDOR, STATUS_RECEIVED, REJECTED } = require("../lib/status");
const { BTN_ADV_BILL_HYBRID, BTN_ADV_BILL_HYBRID_DO, BTN_ASSIGN } = require("../lib/tableName");
const { getEpochTime, generateQuery, generateInsertUpdateQuery } = require("../lib/utils");
const { filesData, getContractualSubmissionDate, getActualSubmissionDate, getLatestBTN } = require("../services/btn.services");
const { advBillHybridbtnPayload, advBillHybridbtnDOPayload, getBgApprovedFiles, getAdvBillHybridBTNDetails, getInitalData, btnAdvBillAgainstBgCurrentDetailsCheck, updateBtnAdvBillAgainstBg } = require("../services/btnAdvPaymentAgainstBg.services");
const { btnAssignPayload, addToBTNListFn } = require("../services/btnServiceHybrid.services");
const { create_btn_no } = require("../services/po.services");
const { abhBtnSubmitToSAPF01, abhBtnSubmitToSAPF02 } = require("../services/sap.btn.services");
const Message = require("../utils/messages");
const { checkTypeArr } = require("../utils/smallFun");
const { getDoDetailsByPO } = require("../utils/btnUtils");
const { getUserDetailsQuery } = require("../utils/mailFunc");

const submitAdvanceBillHybrid = async (req, res) => {
    let client;
    try {
        let payload = req.body;
        const tokenData = req.tokenData;

        let payloadFiles = req.files;
        const uploadedFiles = filesData(payloadFiles);

        if (!payload) {
            return resSend(res, false, 400, Message.INVALID_PAYLOAD, Message.MANDATORY_INPUTS_REQUIRED, null);
        }
        if (!payload.invoice_value && isNaN(payload.invoice_value) && !payload.net_claim_amount && isNaN(payload.net_claim_amount)) {
            return resSend(res, false, 200, Message.MANDATORY_INPUTS_REQUIRED, "Invoice Value is missing!", null);
        }
        if (!payload.purchasing_doc_no || typeof payload.purchasing_doc_no !== 'string' || !payload.invoice_no || typeof payload.purchasing_doc_no !== 'string') {
            return resSend(res, false, 200, Message.MANDATORY_INPUTS_REQUIRED, "Invoice Number is missing!", null);
        }

        if (!uploadedFiles.invoice_filename) {
            return resSend(res, false, 200, Message.MANDATORY_INPUTS_REQUIRED, "File is missing!", null);
        }
        client = await poolClient();

        // BTN NUMBER GENERATE
        await client.query("BEGIN");
        const btn_num = await create_btn_no(client);
        // UPLOAD FILES DATA HANDLES

        let net_claim_amount = parseFloat(payload.net_claim_amount).toFixed(3);

        // CONTRACTUAL SUBMISSION DATA
        const contDateSetup = await getContractualSubmissionDate(payload.purchasing_doc_no, client);

        // ACTUAL SUMBISSION DATA
        const actualDateSetup = await getActualSubmissionDate(payload.purchasing_doc_no, client);

        // BG File missing check
        const bgData = await getBgApprovedFiles(client, payload.purchasing_doc_no);

        if (!bgData.length) {
            return resSend(res, false, 200, "BG File missing", "Missing data", null);
        }

        // ADDING EXTRA DATA IN PAYLOAD

        const doManNo = await getDoDetailsByPO(client, payload.purchasing_doc_no)
        payload = {
            ...payload,
            ...uploadedFiles,
            btn_num,
            ...contDateSetup.data,
            ...actualDateSetup.data,
            vendor_code: tokenData.vendor_code,
            net_claim_amount,
            bg_details: JSON.stringify(bgData),
            net_with_gst: net_claim_amount, // this payload added becaus of all btn payload same
            created_at: getEpochTime(),
        };

        // PAYLOAD DATA
        const btnPayload = advBillHybridbtnPayload(payload);
        // GENERATE QUERY, DATA AND SAVE
        const btnQuery = generateQuery(INSERT, BTN_ADV_BILL_HYBRID, btnPayload);

        await poolQuery({ client, query: btnQuery.q, values: btnQuery.val });

        const btnListData = {
            ...btnPayload,
            assign_by: tokenData.vendor_code,
            assign_to: doManNo?.u_id,
            net_payable_amount: net_claim_amount
        }

        await addToBTNListFn(client, btnListData, SUBMITTED_BY_VENDOR);
        await client.query("COMMIT");
        resSend(res, true, 201, Message.BTN_CREATED, "BTN Created. No. " + btn_num, { btn_num });

    } catch (error) {
        console.error("submit abh ", error.message, error);
        if (client) await client.query("ROLLBACK");
        resSend(res, false, 400, Message.UNEXPECTED_ERROR, error.message, null);
    } finally {
        if (client) client.release();
    }

};

const getAdvBillAgainstBgData = async (req, res) => {
    let client;

    try {
        client = await poolClient();

        const { type } = req.query;
        if (!type) {
            return resSend(res, false, 400, Message.MANDATORY_INPUTS_REQUIRED, "Please send a valid type!", null);
        }

        let result;
        switch (type) {
            case "details":
                result = await getAdvBillHybridBTNDetails(client, req.query);
                break;

            case "init":
                result = await getInitalData(client, req.query);
                break;

            default:
                return resSend(res, false, 400, Message.MANDATORY_INPUTS_REQUIRED, "Please send a valid type!", null);
        }

        const { data, message, success, statusCode } = result;
        resSend(res, success, statusCode, message, data);

    } catch (error) {
        console.error("getAdvBillAgainstBgData error:", error);
        resSend(res, false, 500, Message.SOMTHING_WENT_WRONG, null, null);
    } finally {
        if (client) client.release();
    }
};

const sbhSubmitBTNByDO = async (req, res) => {

    let client;
    try {
        client = await poolClient();
        await client.query("BEGIN");
        let payload = req.body;
        const tokenData = req.tokenData;

        // BTN VALIDATION
        if (!payload.btn_num && typeof payload.btn_num !== "string") {
            return resSend(res, false, 200, Message.MANDATORY_PARAMETR_MISSING, "btn num  missing", null);
        }
        const btnCurrnetStatus = await btnAdvBillAgainstBgCurrentDetailsCheck(client, { btn_num: payload.btn_num });
        if (btnCurrnetStatus.isInvalid) {
            return resSend(res, false, 200, `BTN ${payload.btn_num} ${btnCurrnetStatus.message}`, payload.btn_num, null);
        }

        if (payload.status === REJECTED) {
            const getVendorQuery = getUserDetailsQuery("vendor_by_po", "$1");
            const vendorDetails = await poolQuery({
                client,
                query: getVendorQuery,
                values: [payload.purchasing_doc_no],
            });

            payload.assign_to = vendorDetails[0]?.u_id;
            payload.created_by = tokenData.vendor_code;

            await btnAdvPaymentAgainstBgReject(client, payload, tokenData);
            await client.query("COMMIT");
            return resSend(res, true, 200, "Rejected successfully !!", null, null);
        }

        if (!payload.net_payable_amount || !payload.assign_to || !payload.purchasing_doc_no) {
            return resSend(res, false, 200, Message.MANDATORY_PARAMETR_MISSING, "PO No OR net_payable_amount OR assign_to missing", null);
        }

        //  BTN FINANCE AUTHORITY DATA INSERT
        const financePaylad = advBillHybridbtnDOPayload(payload, tokenData);
        const { q, val } = await generateInsertUpdateQuery(financePaylad, BTN_ADV_BILL_HYBRID_DO, ["btn_num", "purchasing_doc_no"]);
        const response = await poolQuery({ client, query: q, values: val });

        // BTN ASSIGN BY FINANCE AUTHORITY  
        const btnAssignPaylaod = btnAssignPayload({ ...payload, assign_by: tokenData.vendor_code });
        const assingPayload = await generateInsertUpdateQuery(btnAssignPaylaod, BTN_ASSIGN, ['btn_num', 'purchasing_doc_no']);
        await poolQuery({ client, query: assingPayload.q, values: assingPayload.val });

        // ADDING TO BTN LIST WITH CURRENT STATUS
        const latesBtnData = await getLatestBTN(client, payload);

        await addToBTNListFn(client, { ...latesBtnData, ...payload, assign_by: tokenData.vendor_code }, SUBMITTED_BY_DO);
        const sendSap = await abhBtnSubmitToSAPF01(payload, tokenData);

        if (sendSap == false) {
            await client.query("ROLLBACK");
            return resSend(res, false, 200, `SAP not connected.`, null, null);
        } else if (sendSap == true) {
            await client.query("COMMIT");
            resSend(res, true, 200, Message.DATA_SEND_SUCCESSFULL, response, "")

            // TO DO 
            // EMAIL IMPMENENTAIOTN

        }

    } catch (error) {
        console.error("error", error.message, error);
        console.error("[error] sbhSubmitBTNByDO", error);
        await client.query("ROLLBACK");
        resSend(res, false, 500, Message.SOMTHING_WENT_WRONG, null, null);
    } finally {
        if (client) client.release();
    }

}

const getAdvBillHybridBTN = async (req, res) => {
    let client;
    try {
        client = await poolClient();
        const payload = req.body;

        if (!payload.btn_num) {
            return resSend(res, false, 400, Message.MANDATORY_PARAMETR, null, null);
        }

        let baseQuery = `SELECT * FROM btn_advance_bill_hybrid`;

        let conditionQuery = " WHERE 1 = 1 ";
        const valueArr = [];

        if (payload.btn_num) {
            conditionQuery += " AND btn_num  = ?";
            valueArr.push(payload.btn_num);
        }

        const advBillReqDataQuery = baseQuery + conditionQuery;
        let [results] = await client.query(advBillReqDataQuery, valueArr);
        resSend(res, true, 200, Message.DATA_FETCH_SUCCESSFULL, results, null);
    } catch (error) {
        console.error("getAdvBillHybridBTN error", error);
        resSend(res, false, 500, Message.SOMTHING_WENT_WRONG, null, null);
    } finally {
        if (client) client.release();
    }
};

async function btnAdvPaymentAgainstBgReject(client, data, tokenData) {

    const payload = {
        btn_num: data.btn_num,
        remarks: data.rejectedMessage,
        assign_by: data.created_by,
        assign_to: data.assign_to,
        status: REJECTED
    };

    const latesBtnData = await getLatestBTN(client, payload);

    await addToBTNListFn(client, { ...latesBtnData, ...payload, assign_by: tokenData.vendor_code }, REJECTED);
    await updateBtnAdvBillAgainstBg(client, data.btn_num, { status: REJECTED })
    const sendSap = await abhBtnSubmitToSAPF01({ ...payload, assign_to: null }, tokenData);

    if (!sendSap || sendSap == false) {
        console.log("sendSap", sendSap);
        throw new Error("Sap Not connented");
    }
    return { btn_num: data.btn_num };

}

const sbhAssignToFiStaff = async (req, res) => {
    try {
        const client = await poolClient();
        await client.query("BEGIN");
        try {
            const { btn_num, purchasing_doc_no, assign_to_fi, activity } = req.body;
            const tokenData = req.tokenData;

            if (!btn_num || !purchasing_doc_no || !assign_to_fi) {
                return resSend(res, false, 200, "Assign To is the mandatory!", Message.MANDATORY_PARAMETR_MISSING, null);
            }

            const btnCurrnetStatus = await btnAdvBillAgainstBgCurrentDetailsCheck(client, {
                btn_num,
                status: STATUS_RECEIVED,
            });
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
                activity
            };

            let { q, val } = generateQuery(UPDATE, BTN_ASSIGN, payload, whereCon);
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
                vendor_code: tokenData.vendor_code,
                created_at: getEpochTime(),
                btn_type: btn_list[0]?.btn_type,
            };

            await addToBTNListFn(client, data, STATUS_RECEIVED);

            const sendSap = await abhBtnSubmitToSAPF02({ ...req.body, ...payload }, tokenData);
            if (sendSap == false) {
                await client.query("ROLLBACK");
                return resSend(res, false, 200, `SAP not connected.`, { btn_num }, null);
            } else if (sendSap == true) {
                await client.query("COMMIT");
                resSend(res, true, 200, "Finance Staff has been assigned!", null, null);
            }

        } catch (error) {
            console.log("data not inserted", error.message);
            resSend(res, false, 500, Message.SOMTHING_WENT_WRONG, null, null);
        } finally {
            client.release();
        }
    } catch (error) {
        resSend(res, true, 500, Message.DB_CONN_ERROR, error.message, null);
    }
};

module.exports = {
    submitAdvanceBillHybrid,
    getAdvBillAgainstBgData,
    getAdvBillHybridBTN,
    sbhSubmitBTNByDO,
    sbhAssignToFiStaff
};
