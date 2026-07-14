const { poolQuery } = require("../config/pgDbConfig");
const { SDBG_PAYMENT_ADVICE, SDBG_ENTRY, EKKO } = require("../lib/tableName");
const QueryBuilder = require("../utils/QueryBuilder");


// eslint-disable-next-line no-unused-vars
async function getDasboardBgExtensionList(client, params, tokenData,) {

    const pageNo = 1;
    const pageSize = 100;
    let qb = new QueryBuilder(`${SDBG_PAYMENT_ADVICE} AS zfi_bgm_1`);
    qb.select(
        [
            // "zfi_bgm_1.*",
            "zfi_bgm_1.file_no",
            "zfi_bgm_1.po_number as purchasing_doc_no",
            "zfi_bgm_1.bank_gu_no",
            "zfi_bgm_1.validity_date",
            "sdbg_entry.reference_no as sdbg_reference_no",
            "ekko.lifnr as vendor_code",
            // "sdbg_extension.status",
            // "sdbg_extension.extension_remarks as remarks"
        ]
    );
    qb.joinTable("LEFT", `${SDBG_ENTRY} AS sdbg_entry`, "zfi_bgm_1.file_no = sdbg_entry.bg_file_no  AND zfi_bgm_1.po_number = sdbg_entry.purchasing_doc_no");
    qb.joinTable("LEFT", `${EKKO} AS ekko`, "ekko.ebeln = zfi_bgm_1.po_number");
    // qb.joinTable("LEFT", `${SDBG_EXTENSION} AS sdbg_extension`, "zfi_bgm_1.file_no = sdbg_extension.file_no AND zfi_bgm_1.po_number = sdbg_extension.purchasing_doc_no");


    qb.where("ekko.ernam", "=", tokenData.vendor_code);

    if (params.validity_start_date && params.validity_end_date) {
        qb.whereBetween("zfi_bgm_1.validity_date", params.validity_start_date, params.validity_end_date);
    }

    if (params.validity_start_date && !params.validity_end_date) {
        qb.whereGreaterOrEqual("zfi_bgm_1.validity_date", params.validity_start_date);
    }

    if (params.validity_end_date && !params.validity_start_date) {
        qb.whereLessOrEqual("zfi_bgm_1.validity_date", params.validity_end_date);
    }

    if (params.file_no) {
        qb.whereLike("zfi_bgm_1.file_no", params.file_no);
    }

    qb.paginate(pageNo, pageSize);
    qb.orderBy("zfi_bgm_1.validity_date", "ASC");
    // qb.countAllWithPagination();
    const buildedQuery = qb.countAllWithPagination();

  
    const result = await poolQuery({ client, query: buildedQuery.dataQuery.sql, values: buildedQuery.dataQuery.params })
    const count = await poolQuery({ client, query: buildedQuery.countQuery.sql, values: buildedQuery.countQuery.params })

    return { result, count };
}

module.exports = { getDasboardBgExtensionList }