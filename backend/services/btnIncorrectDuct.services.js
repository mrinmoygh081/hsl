
const btnIncorrectDuctionPayload = (payloadObject) => {
    const pl = {
        "purchasing_doc_no": payloadObject.purchasing_doc_no || null,
        "ref_invoice1_filename": payloadObject.ref_invoice1_filename || null,
        "ref_invoice1_file_path": payloadObject.ref_invoice1_file_path || null,
        "ref_invoice1_no": payloadObject.ref_invoice1_no || null,
        "ref_invoice1_amount": payloadObject.ref_invoice1_amount ?? 0,
        "ref_invoice1_remarks": payloadObject.ref_invoice1_remarks || null,
        "ref_invoice2_no": payloadObject.ref_invoice2_no || null,
        "ref_invoice2_filename": payloadObject.ref_invoice2_filename || null,
        "ref_invoice2_file_path": payloadObject.ref_invoice2_file_path || null,
        "ref_invoice2_amount": payloadObject.ref_invoice2_amount || 0,
        "ref_invoice2_remarks": payloadObject.ref_invoice2_remarks || null,
        "ref_invoice3_no": payloadObject.ref_invoice3_no || null,
        "ref_invoice3_filename": payloadObject.ref_invoice3_filename || null,
        "ref_invoice3_file_path": payloadObject.ref_invoice3_file_path || null,
        "ref_invoice3_amount": payloadObject.ref_invoice3_amount ?? 0,
        "ref_invoice3_remarks": payloadObject.ref_invoice3_remarks || null,
        "ref_invoice4_no": payloadObject.ref_invoice4_no || null,
        "ref_invoice4_filename": payloadObject.ref_invoice4_filename || null,
        "ref_invoice4_file_path": payloadObject.ref_invoice4_file_path || null,
        "ref_invoice4_amount": payloadObject.ref_invoice4_amount ?? 0,
        "ref_invoice4_remarks": payloadObject.ref_invoice4_remarks || null,
        // "balance_claim_invoice": payloadObject.balance_claim_invoice || null,
        // "balance_claim_invoice_file_path": payloadObject.balance_claim_invoice_file_path || null,
        // "balance_claim_invoice_fileame": payloadObject.balance_claim_invoice_fileame || null,
        "total_claim_amount": payloadObject.total_claim_amount ?? 0,
        // "net_payable_amount": payloadObject.net_payable_amount ?? 0,
        "btn_type": payloadObject.btn_type || null,
        "letter_reference_no": payloadObject.letter_reference_no || null,
        "letter_date": payloadObject.letter_date || null,
        "net_claim_amount": payloadObject.total_claim_amount ?? 0,
        "invoice_file_path": null,
        "invoice_filename" : null
        
    }
    return pl;

}



module.exports = { btnIncorrectDuctionPayload }