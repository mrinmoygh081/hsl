const { poolQuery } = require("../config/pgDbConfig");
const { BTN_HYBRID_BILL_MATERIAL, C_SDBG_DATE, C_DRAWING_DATE, C_QAP_DATE, C_ILMS_DATE, A_SDBG_DATE, A_QAP_DATE, A_ILMS_DATE, MID_SDBG, MID_DRAWING, MID_QAP, MID_ILMS, UPDATE } = require("../lib/constant");
const { successAndErrorObjectBulider } = require("../lib/resSend");
const { SUBMITTED_BY_VENDOR } = require("../lib/status");
const { BTN_SERVICE_HYBRID } = require("../lib/tableName");
const { generateQuery } = require("../lib/utils");
const { validatePayload } = require("../utils/validationCheck");

const checkInvoice = async (client, invoice_no, purchasing_doc_no) => {

    const check_invoice_q = `SELECT 
                  t1.*
                FROM 
                  btn_list AS t1
                WHERE 
                  t1.created_at = (
                      SELECT 
                          MAX(t1_inner.created_at)
                      FROM 
                          btn_list AS t1_inner
                      LEFT JOIN 
                          btn AS t2 
                      ON 
                          t1_inner.btn_num = t2.btn_num
                      WHERE 
                          t2.invoice_no = $1 AND t1_inner.purchasing_doc_no = $2
  )`;
    let result = await poolQuery({
        client,
        query: check_invoice_q,
        values: [invoice_no, purchasing_doc_no],
    });

    return result;

}

const materialBtnInitialPayload = (payload, tokenData) => {

    const rules = {
        stage: { required: false, type: "number", min: 1 },
        yard: { required: false, type: "number", min: 1 },
        purchasing_doc_no: { required: true, type: "string" },
        status: { required: true, type: "string" },
        invoice_no: { required: true, type: "string" },
        invoice_type: { required: true, type: "string" },
        invoice_value: { required: true, type: "string" },
        invoice_date: { required: true, type: "date" },
        debit_note: { required: false, type: "string" },
        credit_note: { required: false, type: "string" },
        hsn_gstn_icgrn: { required: true, type: "boolean" },
        cgst: { required: true, type: "number", min: 0, max: 30 },
        sgst: { required: true, type: "number", min: 0, max: 30 },
        igst: { required: true, type: "number", min: 0, max: 30 },
        invoice_filename: { required: true, type: "string" },
        invoice_file_path: { required: true, type: "string" },
        invoice_file_id: { required: true, type: "string" },

        invoice_supporting_doc_filename: { required: false, type: "string" },
        invoice_supporting_doc_file_path: { required: false, type: "string" },
        invoice_supporting_doc_file_id: { required: false, type: "string" },

        debit_credit_filename: { required: false, type: "string" },
        debit_credit_file_path: { required: false, type: "string" },
        debit_credit_file_id: { required: false, type: "string" },

        demand_raise_filename: { required: false, type: "string" },
        demand_raise_file_path: { required: false, type: "string" },
        demand_raise_file_id: { required: false, type: "string" },
    };

    // Step 1: Validate
    const validation = validatePayload(payload, rules);

    if (!validation.isValid) {
        return successAndErrorObjectBulider(false, 200, validation.message, {}, validation.errors);
    }

    const NEW_PAYLOAD = {
        stage: payload.stage,
        yard: payload.yard,
        purchasing_doc_no: payload.purchasing_doc_no,
        vendor_code: tokenData.vendor_code,

        invoice_no: payload.invoice_no,
        invoice_type: payload.invoice_type,
        invoice_value: payload.invoice_value,
        invoice_date: payload.invoice_date,

        debit_note: payload.debit_note,
        credit_note: payload.credit_note,
        hsn_gstn_icgrn: payload.hsn_gstn_icgrn,

        cgst: payload.cgst,
        sgst: payload.sgst,
        igst: payload.igst,

        invoice_filename: payload.invoice_filename,
        invoice_file_path: payload.invoice_file_path,
        invoice_file_id: payload.invoice_file_id,

        invoice_supporting_doc_filename: payload.invoice_supporting_doc_filename,
        invoice_supporting_doc_file_path: payload.invoice_supporting_doc_file_path,
        invoice_supporting_doc_file_id: payload.invoice_supporting_doc_file_id,

        debit_credit_filename: payload.debit_credit_filename,
        debit_credit_file_path: payload.debit_credit_file_path,
        debit_credit_file_id: payload.debit_credit_file_id,

        demand_raise_filename: payload.demand_raise_filename,
        demand_raise_file_path: payload.demand_raise_file_path,
        demand_raise_file_id: payload.demand_raise_file_id,
    };

    return successAndErrorObjectBulider(true, 200, validation.message, NEW_PAYLOAD, validation);
}

const materialBtnFinalPayload = (payload, tokenData) => {
    const pl = {
        btn_num: payload.btn_num,
        purchasing_doc_no: payload.purchasing_doc_no,
        stage: payload.stage,
        yard: payload.yard,
        invoice_no: payload.invoice_no,
        invoice_date: payload.invoice_date,
        invoice_type: payload.invoice_type,
        invoice_value: payload.invoice_value,
        net_claim_amount: payload.net_claim_amount,
        net_with_gst: payload.net_with_gst,
        cgst: payload.cgst,
        igst: payload.igst,
        sgst: payload.sgst,
        debit_note: payload.debit_note,
        credit_note: payload.credit_note,
        hsn_gstn_icgrn: payload.hsn_gstn_icgrn,

        vendor_code: payload.vendor_code,
        created_by_id: tokenData.vendor_code,
        created_at: payload.created_at,

        btn_type: BTN_HYBRID_BILL_MATERIAL,
        updated_by: "VENDOR",
        status: SUBMITTED_BY_VENDOR,
        pbg_filename: payload.pbg_filename,

        c_sdbg_date: payload.c_sdbg_date,
        c_sdbg_filename: payload.c_sdbg_filename,
        a_sdbg_date: payload.a_sdbg_date,
        c_drawing_date: payload.c_drawing_date,
        a_drawing_date: payload.a_drawing_date,
        c_qap_date: payload.c_qap_date,
        a_qap_date: payload.a_qap_date,
        c_ilms_date: payload.c_ilms_date,
        a_ilms_date: payload.a_ilms_date,

        gate_entry_no: payload.gate_entry_no,
        gate_entry_date: payload.gate_entry_date,

        invoice_filename: payload.invoice_filename,
        invoice_file_path: payload.invoice_file_path,

        suppoting_invoice_filename: payload.invoice_supporting_doc_filename,
        suppoting_invoice_file_path: payload.invoice_supporting_doc_file_path,

        debit_credit_filename: payload.debit_credit_filename,
        debit_credit_file_path: payload.debit_credit_file_path,

        demand_raise_filename: payload.demand_raise_filename,
        demand_raise_file_path: payload.demand_raise_file_path,

        icgrn_total: payload.icgrn_total,
        grn_nos: payload.grn_nos,
        icgrn_nos: payload.icgrn_nos,
        associated_po: payload.associated_po,
        declaration1: payload.declaration1,
        declaration2: payload.declaration2
    };

    return pl;
};

/**
 * FORWORD TO FINANCE PAYLOAD
 * @param {Object} payload
 * @returns  Object
 */
const materialBtnForwordToFinacePayload = (payload) => {
    return {
        btn_num: payload.btn_num,
        contractual_ld: payload.contractual_ld,
        ld_amount: payload.ld_amount,
        drg_penalty: payload.drg_penalty,
        qap_penalty: payload.qap_penalty,
        ilms_penalty: payload.ilms_penalty,
        other_deduction: payload.other_deduction,
        total_deduction: payload.total_deduction,
        net_payable_amount: payload.net_payable_amount,

        purchasing_doc_no: payload.purchasing_doc_no,
        ld_ge_date: payload.ld_ge_date,

        max_ld: payload.max_ld,
        max_penalty: payload.max_penalty,
        o_ret_per: payload.o_ret_per,

        any_other_deduction_amount: payload.any_other_deduction_amount || "0",
        any_other_deduction_rate: payload.any_other_deduction_rate || "0",
        any_other_deduction_remarks: payload.any_other_deduction_remarks || "",
        any_other_deduction_filename: payload.any_other_deduction_filename,
        any_other_deduction_file_path: payload.any_other_deduction_file_path,

        any_other_retension_amount: payload.any_other_retension_amount || "0",
        any_other_retension_rate: payload.any_other_retension_rate || "0",
        any_other_retension_remarks: payload.any_other_retension_remarks || "",
        any_other_retension_filename: payload.any_other_retension_filename,
        any_other_retension_file_path: payload.any_other_deduction_file_path,

        remarks: payload.remarks,
        created_at: payload.created_at,
        created_by: payload.created_by
    };
};

/**
 * BTN Assign payload
 * @param {Object} payload
 * @returns Object
 */
const materialBtnAssignPayload = (payload) => {
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

const getContractualDates = async (client, purchasing_doc_no) => {

    let c_sdbg_date_q = `SELECT PLAN_DATE as "PLAN_DATE", MTEXT as "MTEXT", MID AS "MID" FROM zpo_milestone WHERE EBELN = $1`;
    let c_dates = await poolQuery({
        client,
        query: c_sdbg_date_q,
        values: [purchasing_doc_no],
    });

    return c_dates;
}

const setContractualDateIntoPayload = (c_dates) => {

    let cDatePayload = {};
    c_dates.forEach((item) => {
        if (item.PLAN_DATE && item.MTEXT === C_SDBG_DATE) {
            cDatePayload = {
                ...cDatePayload,
                c_sdbg_date: new Date(item.PLAN_DATE).getTime(),
            };
        } else if (item.PLAN_DATE && item.MTEXT === C_DRAWING_DATE) {
            cDatePayload = {
                ...cDatePayload,
                c_drawing_date: new Date(item.PLAN_DATE).getTime(),
            };
        } else if (item.PLAN_DATE && item.MTEXT === C_QAP_DATE) {
            cDatePayload = {
                ...cDatePayload,
                c_qap_date: new Date(item.PLAN_DATE).getTime(),
            };
        } else if (item.PLAN_DATE && item.MTEXT === C_ILMS_DATE) {
            cDatePayload = {
                ...cDatePayload,
                c_ilms_date: new Date(item.PLAN_DATE).getTime(),
            };
        }
    });

    return cDatePayload;
}
const getAactualDates = async (client, purchasing_doc_no) => {

    let a_sdbg_date_q = `SELECT actualSubmissionDate AS "PLAN_DATE", milestoneText AS "MTEXT", milestoneid AS "MID" FROM actualsubmissiondate WHERE purchasing_doc_no = $1`;
    let a_dates = await poolQuery({
        client,
        query: a_sdbg_date_q,
        values: [purchasing_doc_no],
    });

    return a_dates;
}

const setAactualDateIntoPayload = (a_dates) => {

    let aDatePayload = {};
    a_dates.forEach((item) => {
        if (Number(item.MID) === Number(MID_SDBG)) {
            if (!item.PLAN_DATE) {
                return successAndErrorObjectBulider(false, 200, `${A_SDBG_DATE} is missing!`,)
            }
            aDatePayload = { ...aDatePayload, a_sdbg_date: item.PLAN_DATE };
        } else if (Number(item.MID) === Number(MID_DRAWING)) {
            if (!item.PLAN_DATE) {
                return successAndErrorObjectBulider(false, 200, `${A_SDBG_DATE} is missing!`,)
            }
            aDatePayload = { ...aDatePayload, a_drawing_date: item.PLAN_DATE };
        } else if (Number(item.MID) === Number(MID_QAP)) {
            if (!item.PLAN_DATE) {
                return successAndErrorObjectBulider(false, 200, `${A_QAP_DATE} is missing!`,)
            }
            aDatePayload = { ...aDatePayload, a_qap_date: item.PLAN_DATE };
        } else if (Number(item.MID) === Number(MID_ILMS)) {
            if (!item.PLAN_DATE) {
                return successAndErrorObjectBulider(false, 200, `${A_ILMS_DATE} is missing!`,)
            }
            aDatePayload = { ...aDatePayload, a_ilms_date: item.PLAN_DATE };
        }
    });

    return aDatePayload;
}

async function updateMaterialBtn(client, btn_num, btnPayload) {
    const { q, val } = generateQuery(UPDATE, BTN_SERVICE_HYBRID, btnPayload, { btn_num });
    await poolQuery({ client, query: q, values: val });
}

module.exports = {
    checkInvoice,
    materialBtnInitialPayload,
    materialBtnFinalPayload,
    getContractualDates,
    setContractualDateIntoPayload,
    getAactualDates,
    setAactualDateIntoPayload,
    materialBtnAssignPayload,
    materialBtnForwordToFinacePayload,
    updateMaterialBtn
}