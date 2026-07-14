
const { poolQuery } = require("../config/pgDbConfig");
const { INSERT, UPDATE } = require("../lib/constant");
const { successAndErrorObjectBulider } = require("../lib/resSend");
const { SDBG_PAYMENT_ADVICE, SDBG_EXTENSION } = require("../lib/tableName");
const { generateQuery, getEpochTime } = require("../lib/utils");
const Message = require("../utils/messages");
const QueryBuilder = require("../utils/QueryBuilder");
const { validatePayload } = require("../utils/validationCheck");

// eslint-disable-next-line no-unused-vars
async function getBgExtensionList(client, params, tokenData,) {

    const pageNo = 1;
    const pageSize = 100;
    let qb = new QueryBuilder(SDBG_PAYMENT_ADVICE);
    qb.select(["*"]);

    if (params.validity_start_date && params.validity_end_date) {
        qb.whereBetween("validity_date", params.validity_start_date, params.validity_end_date);
    }

    if (params.validity_start_date && !params.validity_end_date) {
        qb.whereGreaterOrEqual("validity_date", params.validity_start_date);
    }

    if (params.validity_end_date && !params.validity_start_date) {
        qb.whereLessOrEqual("validity_date", params.validity_end_date);
    }

    if (params.file_no) {
        qb.whereLike("file_no", params.file_no);
    }

    qb.paginate(pageNo, pageSize);
    qb.orderBy("file_no", "ASC");
    // qb.countAllWithPagination();
    const buildedQuery = qb.countAllWithPagination();

    const result = await poolQuery({ client, query: buildedQuery.dataQuery.sql, values: buildedQuery.dataQuery.params })
    const count = await poolQuery({ client, query: buildedQuery.countQuery.sql, values: buildedQuery.countQuery.params })

    return { result, count };
}
// eslint-disable-next-line no-unused-vars
async function getBgExtensionDetails(client, params, tokenData,) {

    const pageNo = 1;
    const pageSize = 100;
    let qb = new QueryBuilder(SDBG_PAYMENT_ADVICE);
    qb.select(["*"]);

    if (params.validity_start_date && params.validity_end_date) {
        qb.whereBetween("validity_date", params.validity_start_date, params.validity_end_date);
    }

    if (params.validity_start_date && !params.validity_end_date) {
        qb.whereGreaterOrEqual("validity_date", params.validity_start_date);
    }

    if (params.validity_end_date && !params.validity_start_date) {
        qb.whereLessOrEqual("validity_date", params.validity_end_date);
    }

    if (params.file_no) {
        qb.whereLike("file_no", params.file_no);
    }

    qb.paginate(pageNo, pageSize);
    qb.orderBy("file_no", "ASC");
    // qb.countAllWithPagination();
    const buildedQuery = qb.countAllWithPagination();

    const result = await poolQuery({ client, query: buildedQuery.dataQuery.sql, values: buildedQuery.dataQuery.params })
    const count = await poolQuery({ client, query: buildedQuery.countQuery.sql, values: buildedQuery.countQuery.params })

    return { result, count };
}



async function saveBgExtension(client, tokenData, bgExtPayload) {

    const sanityPayload = bgExtSubmitPaylad(bgExtPayload, tokenData);

    if (!sanityPayload.success) {
        return successAndErrorObjectBulider(false, 200, Message.INVALID_PAYLOAD, {}, sanityPayload.errors);
    }
    const { q, val } = generateQuery(INSERT, SDBG_EXTENSION, sanityPayload.data);
    const response = await poolQuery({ client, query: q, values: val });

    return successAndErrorObjectBulider(true, 200, Message.DATA_SEND_SUCCESSFULL, response, response);
}


async function updateBgExtensionByDo(client, tokenData, bgExtPayload) {

    const sanityPayload = bgExtSubmitDoPaylad(bgExtPayload, tokenData);

    if (!sanityPayload.success) {
        return successAndErrorObjectBulider(false, 200, Message.INVALID_PAYLOAD, {}, sanityPayload.errors);
    }
    const { file_no, po_number, ...other } = sanityPayload.data;
    const { q, val } = generateQuery(UPDATE, SDBG_EXTENSION, other, { file_no, po_number });
    const response = await poolQuery({ client, query: q, values: val });

    return successAndErrorObjectBulider(true, 200, Message.DATA_SEND_SUCCESSFULL, response, response);
}
async function submitBgExtensionRecomendationByDo(client, tokenData, bgExtPayload) {

    const sanityPayload = bgExtSubmitDoRecomendationPaylad(bgExtPayload, tokenData);

    if (!sanityPayload.success) {
        return successAndErrorObjectBulider(false, 200, Message.INVALID_PAYLOAD, {}, sanityPayload.errors);
    }
    const { file_no, po_number, ...other } = sanityPayload.data;
    const { q, val } = generateQuery(UPDATE, SDBG_EXTENSION, other, { file_no, po_number });
    const response = await poolQuery({ client, query: q, values: val });

    return successAndErrorObjectBulider(true, 200, Message.DATA_SEND_SUCCESSFULL, response, response);
}
async function submitBgExtensionRecomendationByFi(client, tokenData, bgExtPayload) {

    const sanityPayload = bgExtSubmitFiRecomendationPaylad(bgExtPayload, tokenData);

    if (!sanityPayload.success) {
        return successAndErrorObjectBulider(false, 200, Message.INVALID_PAYLOAD, {}, sanityPayload.errors);
    }
    const { file_no, po_number, ...other } = sanityPayload.data;
    const { q, val } = generateQuery(UPDATE, SDBG_EXTENSION, other, { file_no, po_number });
    const response = await poolQuery({ client, query: q, values: val });

    return successAndErrorObjectBulider(true, 200, Message.DATA_SEND_SUCCESSFULL, response, response);
}

async function updateBgExtensionByFi(client, tokenData, bgExtPayload) {

    const sanityPayload = bgExtSubmitFiPaylad(bgExtPayload, tokenData);

    if (!sanityPayload.success) {
        return successAndErrorObjectBulider(false, 200, Message.INVALID_PAYLOAD, {}, sanityPayload.errors);
    }

    const { file_no, po_number, ...other } = sanityPayload.data;
    const { q, val } = generateQuery(UPDATE, SDBG_EXTENSION, other, { file_no, po_number });

    const response = await poolQuery({ client, query: q, values: val });

    return successAndErrorObjectBulider(true, 200, Message.DATA_SEND_SUCCESSFULL, response, response);
}



function bgExtSubmitPaylad(payload, tokenData) {
    const rules = {
        file_no: { required: true, type: "string", min: 3, max: 20 },
        po_number: { required: true, type: "string" },
        bg_date: { required: true, type: "date" },
        bg_amount: { required: true, type: "number", min: 1 },
        validity_date: { type: "date" },
        vendor_status: { type: "string" },
        bg_filename: { type: "string" },
        bg_file_path: { type: "string" },
        // do_status: { type: "string" },
        // finance_status: { type: "boolean" }
    };

    // Step 1: Validate
    const validation = validatePayload(payload, rules);

    if (!validation.isValid) {
        return successAndErrorObjectBulider(false, 200, validation.message, {}, validation.errors);
    }

    // Step 2: Build sanitized object
    const obj = {
        file_no: payload.file_no,
        po_number: payload.po_number,
        bg_date: payload.bg_date,
        bg_amount: payload.bg_amount,
        validity_date: payload.validity_date,
        extension_date1: payload.extension_date1,
        extension_date2: payload.extension_date2,
        extension_date3: payload.extension_date3,
        extension_date4: payload.extension_date4,
        extension_date5: payload.extension_date5,
        extension_date6: payload.extension_date6,
        release_date: payload.release_date,
        vendor_status: payload.vendor_status,
        bg_filename: payload.bg_filename,
        bg_file_path: payload.bg_file_path,
        // do_status: payload.do_status,
        // finance_status: payload.finance_status,
        created_at: getEpochTime(),
        created_by: tokenData.vendor_code,
        updated_at: getEpochTime(),
        updated_by: tokenData.vendor_code
    };

    return successAndErrorObjectBulider(true, 200, Message.VALIDATION_SUCCESSFULL, obj, validation.errors);
}
function bgExtSubmitDoPaylad(payload, tokenData) {
    const rules = {
        file_no: { required: true, type: "string", min: 3, max: 20 },
        po_number: { required: true, type: "string" },
        // bg_date: { required: true, type: "date" },
        // bg_amount: { required: true, type: "number", min: 1 },
        // validity_date: { type: "date" },
        // vendor_status: { type: "string" },
        // bg_filename: { type: "string" },
        // bg_file_path: { type: "string" },
        do_status: { type: "string" },
        // finance_status: { type: "boolean" }
    };

    // Step 1: Validate
    const validation = validatePayload(payload, rules);

    if (!validation.isValid) {
        return successAndErrorObjectBulider(false, 200, validation.message, {}, validation.errors);
    }

    // Step 2: Build sanitized object
    const obj = {
        file_no: payload.file_no,
        po_number: payload.po_number,
        do_status: payload.do_status,
        updated_at: getEpochTime(),
        updated_by: tokenData.vendor_code
    };

    return successAndErrorObjectBulider(true, 200, Message.VALIDATION_SUCCESSFULL, obj, validation.errors);
}
function bgExtSubmitDoRecomendationPaylad(payload, tokenData) {
    const rules = {
        file_no: { required: true, type: "string", min: 3, max: 20 },
        po_number: { required: true, type: "string" },
        extension_count: { required: true, type: "number", min: 1, max: 6 },
        extension_remarks: { required: true, type: "string" },
        do_status: { required: true, type: "string" }
    };

    // Step 1: Validate
    const validation = validatePayload(payload, rules);

    if (!validation.isValid) {
        return successAndErrorObjectBulider(false, 200, validation.message, {}, validation.errors);
    }

    // Step 2: Build sanitized object
    const obj = {
        file_no: payload.file_no,
        po_number: payload.po_number,
        do_status: payload.do_status,
        extension_count: payload.extension_count,
        extension_remarks: payload.extension_remarks,
        updated_at: getEpochTime(),
        updated_by: tokenData.vendor_code
    };

    return successAndErrorObjectBulider(true, 200, Message.VALIDATION_SUCCESSFULL, obj, validation.errors);
}
function bgExtSubmitFiRecomendationPaylad(payload, tokenData) {
    const rules = {
        file_no: { required: true, type: "string", min: 3, max: 20 },
        po_number: { required: true, type: "string" },
        fi_status: { required: true, type: "string" }
    };

    // Step 1: Validate
    const validation = validatePayload(payload, rules);

    if (!validation.isValid) {
        return successAndErrorObjectBulider(false, 200, validation.message, {}, validation.errors);
    }

    // Step 2: Build sanitized object
    const obj = {
        file_no: payload.file_no,
        po_number: payload.po_number,
        fi_status: payload.do_status,
        updated_at: getEpochTime(),
        updated_by: tokenData.vendor_code
    };

    return successAndErrorObjectBulider(true, 200, Message.VALIDATION_SUCCESSFULL, obj, validation.errors);
}
function bgExtSubmitFiPaylad(payload, tokenData) {
    const rules = {
        file_no: { required: true, type: "string", min: 3, max: 20 },
        po_number: { required: true, type: "string" },
        fi_status: { type: "status" }
    };

    // Step 1: Validate
    const validation = validatePayload(payload, rules);

    if (!validation.isValid) {
        return successAndErrorObjectBulider(false, 200, validation.message, {}, validation.errors);
    }

    // Step 2: Build sanitized object
    const obj = {
        file_no: payload.file_no,
        po_number: payload.po_number,
        fi_status: payload.fi_status,
        updated_at: getEpochTime(),
        updated_by: tokenData.vendor_code
    };

    return successAndErrorObjectBulider(true, 200, Message.VALIDATION_SUCCESSFULL, obj, validation.errors);
}




module.exports = {
    getBgExtensionList,
    getBgExtensionDetails,
    saveBgExtension,
    updateBgExtensionByDo,
    updateBgExtensionByFi,
    submitBgExtensionRecomendationByDo,
    submitBgExtensionRecomendationByFi
}