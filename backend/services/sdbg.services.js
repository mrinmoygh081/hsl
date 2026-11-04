/* eslint-disable no-unused-vars */

const { successAndErrorObjectBulider } = require("../lib/resSend");
const { getEpochTime } = require("../lib/utils");
const { VALIDATION_SUCCESSFULL } = require("../utils/messages");
const { validatePayload } = require("../utils/validationCheck");
const { BG_MODES } = require("../lib/constant");

/**
 * Modify SDBG Payload object to insert data
 * @param {Object} payload
 * @param {string} status
 * @returns Object
 */
const sdbgEntryPayload = (payload, status) => {
  const rules = {
    reference_no: { required: true, type: "string", min: 20, max: 30 },
    check_list_reference: { required: true, type: "string", min: 20, max: 30 },
    purchasing_doc_no: { required: false, type: "string", max: 20 },
    status: { required: true, type: "string", max: 50 },
    bg_no: { required: true, type: "string", max: 100 },
    vendor_address1: { required: false, type: "string" },
    vendor_address2: { required: false, type: "string" },
    branch_name: { required: false, type: "string" },
    ifsc_code: { required: false, type: "string" },
    bank_addr1: { required: false, type: "string" },
    bank_addr2: { required: false, type: "string" },
    bank_addr3: { required: false, type: "string" },
    bank_city: { required: false, type: "string" },
    bank_name: { required: true, type: "string" },
    bank_email: { required: true, type: "string", max: 255 },
    bank_pin_code: { required: false, type: "string", max: 7 },
    bg_ammount: { required: true, type: "number", min: 1, max: 5000000000 },
    bg_date: { required: true, type: "number", min: 10000 },
    check_list_date: { required: true, type: "number", min: 10000 },
    bg_recived_date: { required: true, type: "number", min: 10000 },
    bg_type: { required: true, type: "string", max: 60 },
    bg_mode: { required: true, type: "string", max: 20 },
    currency: { required: true, type: "string", max: 5 },
    yard_no: { required: false, type: "string", max: 10 },
    claim_priod: { required: true, type: "number", min: 10000 },
    validity_date: { required: true, type: "number" },
    created_at: { required: true, type: "number" },
    created_by: { required: true, type: "string" },
  };

  const validation = validatePayload(payload, rules);

  if (!validation.isValid) {
    return successAndErrorObjectBulider(false, 200, validation.message, {}, validation.errors);
  }

  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!EMAIL_REGEX.test(String(payload.bank_email))) {
    return successAndErrorObjectBulider(false, 200, "Please provide a valid Banker's Email Id.", {}, []);
  }

  if (!BG_MODES.includes(payload.bg_mode)) {
    return successAndErrorObjectBulider(false, 200, `Mode of BG must be one of: ${BG_MODES.join(", ")}.`, {}, []);
  }

  const payloadObj = {
    reference_no: payload.reference_no,
    check_list_reference: payload.check_list_reference,
    bg_no: payload.bg_no,
    status: payload.status,
    purchasing_doc_no: payload.purchasing_doc_no,
    vendor_address1: payload.vendor_address1,
    vendor_address2: payload.vendor_address2,
    vendor_address3: payload.vendor_address3,
    bank_addr1: payload.bank_addr1,
    bank_addr2: payload.bank_addr2,
    bank_addr3: payload.bank_addr3,
    bank_city: payload.bank_city,
    bank_name: payload.bank_name,
    bank_email: payload.bank_email,
    ifsc_code: payload.ifsc_code,
    branch_name: payload.branch_name,
    bank_pin_code: payload.bank_pin_code,
    bg_ammount: payload.bg_ammount,
    currency: payload.currency,
    bg_mode: payload.bg_mode,
    bg_date: payload.bg_date,
    bg_recived_date: payload.bg_recived_date,
    yard_no: payload.yard_no,
    bg_type: payload.bg_type,
    claim_priod: payload.claim_priod,
    validity_date: payload.validity_date,
    check_list_date: payload.check_list_date,
    created_at: payload.created_at,
    created_by: payload.created_by,
  };
  console.log("payloadObj", payloadObj);

  return successAndErrorObjectBulider(true, 200, VALIDATION_SUCCESSFULL, payloadObj, []);
};

const sdbgPayloadVendor = (payload, status) => {
  const rules = {
    reference_no: { required: true, type: "string", min: 5, max: 30 },
    purchasing_doc_no: { required: true, type: "string", min: 5, max: 20 },
    file_name: { required: true, type: "string" },
    file_path: { required: true, type: "string" },
    remarks: { required: false, type: "string" },
    status: { required: true, type: "string", max: 50 },
    action_type: { required: true, type: "string", min: 2, max: 200 },
    updated_by: { required: true, type: "string", max: 20 },
    vendor_code: { required: true, type: "string", max: 20 },
    assigned_from: { required: false, type: "string", max: 20 },
    assigned_to: { required: false, type: "string", max: 20 },
    action_by: { required: true, type: "string", max: 20 },
    action_on: { required: true, type: "string", max: 20 },
    created_by_id: { required: true, type: "string", max: 20 },
    created_at: { required: true, type: "number" },
  };
  const validation = validatePayload(payload, rules);

  if (!validation.isValid) {
    return successAndErrorObjectBulider(false, 200, validation.message, {}, validation.errors);
  }
  const payloadObj = {
    reference_no: payload.reference_no,
    purchasing_doc_no: payload.purchasing_doc_no,
    file_name: payload.file_name,
    file_path: payload.file_path,
    remarks: payload.remarks,
    status: payload.status,
    action_type: payload.action_type,
    updated_by: payload.updated_by,
    vendor_code: payload.vendor_code,
    assigned_from: payload.assigned_from,
    assigned_to: payload.assigned_to,
    created_at: payload.created_at || getEpochTime(),
    created_by_id: payload.created_by_id,
    bg_no: payload.bg_no,
    action_by: payload.action_by,
    action_on: payload.action_on,
  };

  return successAndErrorObjectBulider(true, 200, VALIDATION_SUCCESSFULL, payloadObj, []);
};

module.exports = { sdbgPayloadVendor, sdbgEntryPayload };
