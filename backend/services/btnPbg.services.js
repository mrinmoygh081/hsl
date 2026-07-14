const { poolQuery } = require("../config/pgDbConfig");
const { getEpochTime } = require("../lib/utils");
const { getPBGApprovedFiles } = require("../utils/btnUtils");


const btnPBGPayload = (tokenData, reqBody) => {

    return {
        btn_num: reqBody.btn_num,
        purchasing_doc_no: reqBody.purchasing_doc_no,
        original_invoice_filename: reqBody.original_invoice_filename,
        original_invoice_file_path: reqBody.original_invoice_file_path,
        original_invoice_no: reqBody.original_invoice_no,
        net_claim_amount: reqBody.net_claim_amount,
        invoice_filename: null,
        invoice_file_path: null,
        invoice_no: reqBody.invoice_no,
        invoice_date: reqBody.invoice_date,
        pbg_files: reqBody.pbg_files,
        vendor_code: tokenData?.vendor_code,
        created_by_id: tokenData?.vendor_code,
        created_at: getEpochTime(),
        btn_type: "claim-against-pbg",
    }

}



const getPBGBTNDetails = async (client, queryParms) => {
    let getPBgBtnQuery = `
        SELECT btn_pbg.*
        FROM
            btn_pbg AS btn_pbg
        `;

    let whereCondition = " WHERE 1=1 ";
    let count = 0;
    let val = [];

    if (queryParms.btn_num) {
        whereCondition += ` AND btn_num = $${++count}`;
        val.push(queryParms.btn_num);
    }
    getPBgBtnQuery += whereCondition;

    let result = await poolQuery({ client, query: getPBgBtnQuery, values: val });
    return { data: result[0] || {}, message: "Data fetch successfull", status: true, statusCode: 200 }


}


const initPBGData = async (client, queryParmas) => {

    const pbgApprovedFiles = await getPBGApprovedFiles(queryParmas.poNo);
    const pbgFilesArr = pbgApprovedFiles.map((el) => (
        {
            file_name: el?.file_name,
            file_path: el?.file_path,
            reference_no: el?.reference_no,
            bg_no: el?.bg_no
        }));

    return { data: { pbgFiles: pbgFilesArr }, message: "Data fetch successfull", status: true, statusCode: 200 }

}


module.exports = { btnPBGPayload, getPBGBTNDetails, initPBGData }