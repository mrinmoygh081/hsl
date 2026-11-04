
const { poolQuery } = require("../config/pgDbConfig");
const { INSERT, UPDATE, USER_TYPE_VENDOR, ASSIGNER } = require("../lib/constant");
const { successAndErrorObjectBulider } = require("../lib/resSend");
const { SDBG_EXTENSION, SDBG_ENTRY, SDBG } = require("../lib/tableName");
const { getPoBgTerms } = require("./poBgTerms.services");
const { generateQuery, getEpochTime } = require("../lib/utils");
const { SUBMITTED, FORWARD_TO_FINANCE, REJECTED, APPROVED } = require("../lib/status");
const { FINANCE } = require("../lib/depertmentMaster");
const Message = require("../utils/messages");
const QueryBuilder = require("../utils/QueryBuilder");
const { validatePayload } = require("../utils/validationCheck");

const ACTION_TYPE_EXTENSION = "EXTENSION";
const ACTION_TYPE_RELEASE = "RELEASE";

async function getBgExtensionList(client, params, tokenData) {
  const pageNo = 1;
  const pageSize = 100;
  let qb = new QueryBuilder(SDBG_EXTENSION);
  qb.select(["*"]);

  if (tokenData.user_type === USER_TYPE_VENDOR) {
    qb.where("created_by", "=", tokenData.vendor_code);
  } else if (tokenData.department_id === FINANCE) {
    // Requests go to the Finance Officer who originally accepted the BG; the nodal point sees all
    qb.where("status", "=", FORWARD_TO_FINANCE);
    if (tokenData.internal_role_id != ASSIGNER) {
      const myBgs = await poolQuery({
        client,
        query: `SELECT DISTINCT reference_no FROM ${SDBG} WHERE status = $1 AND created_by_id = $2`,
        values: [APPROVED, tokenData.vendor_code],
      });
      qb.whereIn("sdbg_reference_no", myBgs.length ? myBgs.map((r) => r.reference_no) : [""]);
    }
  } else {
    qb.where("status", "=", SUBMITTED);
  }

  if (params.purchasing_doc_no) {
    qb.where("purchasing_doc_no", "=", params.purchasing_doc_no);
  }

  qb.paginate(pageNo, pageSize);
  qb.orderBy("created_at", "DESC");
  const buildedQuery = qb.countAllWithPagination();

  const result = await poolQuery({ client, query: buildedQuery.dataQuery.sql, values: buildedQuery.dataQuery.params });
  const count = await poolQuery({ client, query: buildedQuery.countQuery.sql, values: buildedQuery.countQuery.params });

  return { result, count };
}

async function getBgExtensionDetails(client, reference_no) {
  const q = `SELECT * FROM ${SDBG_EXTENSION} WHERE reference_no = $1`;
  const result = await poolQuery({ client, query: q, values: [reference_no] });
  if (result[0]) {
    // Release is recommended only after cross-verifying warranty period and PO closure in SAP (To-Be 6.2.6)
    const terms = await getPoBgTerms(client, result[0].purchasing_doc_no);
    result[0].warranty_expiry_date = terms.warranty_expiry_date || null;
    result[0].po_closed = terms.po_closed ?? null;
    result[0].po_closed_date = terms.po_closed_date || null;
    result[0].fi_officer = await getOriginalApprovingOfficer(client, result[0].sdbg_reference_no);
  }
  return result;
}

/**
 * Original, already-accepted BG this extension/release request is against.
 */
async function getOriginalSdbgEntry(client, sdbg_reference_no) {
  const q = `SELECT * FROM ${SDBG_ENTRY} WHERE reference_no = $1`;
  const result = await poolQuery({ client, query: q, values: [sdbg_reference_no] });
  return result[0];
}

/**
 * The Finance Officer who originally accepted this BG (created_by_id on the APPROVED sdbg row).
 */
async function getOriginalApprovingOfficer(client, sdbg_reference_no) {
  const q = `SELECT created_by_id FROM ${SDBG} WHERE reference_no = $1 AND status = $2 ORDER BY created_at DESC LIMIT 1`;
  const result = await poolQuery({ client, query: q, values: [sdbg_reference_no, APPROVED] });
  return result[0]?.created_by_id;
}

async function saveBgExtension(client, tokenData, bgExtPayload) {
  const sanityPayload = bgExtSubmitPaylad(bgExtPayload, tokenData);

  if (!sanityPayload.success) {
    return successAndErrorObjectBulider(false, 200, Message.INVALID_PAYLOAD, {}, sanityPayload.errors);
  }

  const original = await getOriginalSdbgEntry(client, sanityPayload.data.sdbg_reference_no);
  if (!original || original.status !== APPROVED) {
    return successAndErrorObjectBulider(false, 200, "No accepted BG found for this reference. Extension/Release can only be requested against an accepted BG.", {}, []);
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
  const { reference_no, ...other } = sanityPayload.data;
  const { q, val } = generateQuery(UPDATE, SDBG_EXTENSION, other, { reference_no });
  const response = await poolQuery({ client, query: q, values: val });

  return successAndErrorObjectBulider(true, 200, Message.DATA_SEND_SUCCESSFULL, response, response);
}

async function updateBgExtensionByFi(client, tokenData, bgExtPayload) {
  const sanityPayload = bgExtSubmitFiPaylad(bgExtPayload, tokenData);

  if (!sanityPayload.success) {
    return successAndErrorObjectBulider(false, 200, Message.INVALID_PAYLOAD, {}, sanityPayload.errors);
  }

  const extRows = await getBgExtensionDetails(client, sanityPayload.data.reference_no);
  const ext = extRows[0];
  if (!ext) {
    return successAndErrorObjectBulider(false, 200, "Extension/Release request not found.", {}, []);
  }
  if (ext.status !== FORWARD_TO_FINANCE) {
    return successAndErrorObjectBulider(false, 200, `This request is not forwarded to Finance (current status: ${ext.status}).`, {}, []);
  }

  if (sanityPayload.data.fi_status === APPROVED && ext.action_type === ACTION_TYPE_RELEASE) {
    const originalOfficer = await getOriginalApprovingOfficer(client, ext.sdbg_reference_no);
    if (!originalOfficer || originalOfficer !== tokenData.vendor_code) {
      return successAndErrorObjectBulider(false, 200, "Only the Finance Officer who originally accepted this BG can process its release.", {}, []);
    }
  }

  const { reference_no, fi_status, ...other } = sanityPayload.data;
  const { q, val } = generateQuery(UPDATE, SDBG_EXTENSION, { ...other, status: fi_status }, { reference_no });
  await poolQuery({ client, query: q, values: val });

  if (fi_status === APPROVED) {
    if (ext.action_type === ACTION_TYPE_EXTENSION) {
      await applyExtensionToOriginalBg(client, ext);
    } else if (ext.action_type === ACTION_TYPE_RELEASE) {
      await applyReleaseToOriginalBg(client, ext);
    }
  }

  return successAndErrorObjectBulider(true, 200, Message.DATA_SEND_SUCCESSFULL, { ...ext, status: fi_status }, null);
}

/**
 * On Finance approval of an EXTENSION request: push the new validity date onto the
 * original BG and record it in the next free extension_dateN slot (1..6).
 */
async function applyExtensionToOriginalBg(client, ext) {
  const original = await getOriginalSdbgEntry(client, ext.sdbg_reference_no);
  if (!original) return;

  const slots = ["extension_date1", "extension_date2", "extension_date3", "extension_date4", "extension_date5", "extension_date6"];
  const nextEmptySlot = slots.find((slot) => !original[slot]);

  // sdbg_extension stores dates as native DATE columns; sdbg_entry stores BG dates as epoch seconds.
  const newValidityEpoch = Math.floor(new Date(ext.validity_date).getTime() / 1000);

  const updatePayload = {
    validity_date: newValidityEpoch,
  };
  if (ext.bg_date) updatePayload.bg_date = Math.floor(new Date(ext.bg_date).getTime() / 1000);
  if (ext.bank_gu_no) updatePayload.bg_no = ext.bank_gu_no;
  if (nextEmptySlot) updatePayload[nextEmptySlot] = newValidityEpoch;

  const { q, val } = generateQuery(UPDATE, SDBG_ENTRY, updatePayload, { reference_no: ext.sdbg_reference_no });
  await poolQuery({ client, query: q, values: val });
}

/**
 * On Finance approval of a RELEASE request: set the release date on the original BG.
 */
async function applyReleaseToOriginalBg(client, ext) {
  const { q, val } = generateQuery(UPDATE, SDBG_ENTRY, { release_date: Math.floor(getEpochTime() / 1000) }, { reference_no: ext.sdbg_reference_no });
  await poolQuery({ client, query: q, values: val });
}

function bgExtSubmitPaylad(payload, tokenData) {
  const isExtension = payload.action_type === ACTION_TYPE_EXTENSION;

  const rules = {
    sdbg_reference_no: { required: true, type: "string", min: 10, max: 30 },
    purchasing_doc_no: { required: true, type: "string", max: 20 },
    action_type: { required: true, type: "string" },
    reason: { required: true, type: "string" },
    validity_date: { required: isExtension, type: "date" },
    bg_date: { required: false, type: "date" },
    bg_amount: { required: false, type: "string" },
    bank_gu_no: { required: false, type: "string" },
  };

  const validation = validatePayload(payload, rules);

  if (!validation.isValid) {
    return successAndErrorObjectBulider(false, 200, validation.message, {}, validation.errors);
  }

  if (payload.action_type !== ACTION_TYPE_EXTENSION && payload.action_type !== ACTION_TYPE_RELEASE) {
    return successAndErrorObjectBulider(false, 200, "action_type must be EXTENSION or RELEASE.", {}, []);
  }

  if (isExtension && (!payload.bg_filename || !payload.bg_file_path)) {
    return successAndErrorObjectBulider(false, 200, "Please upload the revised Bank Guarantee document issued by the bank.", {}, []);
  }

  const obj = {
    reference_no: `${isExtension ? "EXT" : "REL"}${Date.now()}${String(tokenData.vendor_code).slice(-4)}`,
    sdbg_reference_no: payload.sdbg_reference_no,
    file_no: payload.file_no || null,
    bank_gu_no: payload.bank_gu_no || null,
    purchasing_doc_no: payload.purchasing_doc_no,
    action_type: payload.action_type,
    validity_date: payload.validity_date || null,
    bg_date: payload.bg_date || null,
    bg_amount: payload.bg_amount || null,
    reason: payload.reason,
    remarks: payload.reason,
    bg_filename: payload.bg_filename || null,
    bg_file_path: payload.bg_file_path || null,
    status: SUBMITTED,
    created_at: getEpochTime(),
    created_by: tokenData.vendor_code,
    updated_at: getEpochTime(),
    updated_by: tokenData.vendor_code,
  };

  return successAndErrorObjectBulider(true, 200, Message.VALIDATION_SUCCESSFULL, obj, validation.errors);
}

function bgExtSubmitDoPaylad(payload, tokenData) {
  const rules = {
    reference_no: { required: true, type: "string" },
    status: { required: true, type: "string" },
    remarks: { required: true, type: "string" },
  };

  const validation = validatePayload(payload, rules);

  if (!validation.isValid) {
    return successAndErrorObjectBulider(false, 200, validation.message, {}, validation.errors);
  }

  if (payload.status !== FORWARD_TO_FINANCE && payload.status !== REJECTED) {
    return successAndErrorObjectBulider(false, 200, "status must be FORWARD_TO_FINANCE or REJECTED.", {}, []);
  }

  const obj = {
    reference_no: payload.reference_no,
    status: payload.status,
    remarks: payload.remarks,
    updated_at: getEpochTime(),
    updated_by: tokenData.vendor_code,
  };

  return successAndErrorObjectBulider(true, 200, Message.VALIDATION_SUCCESSFULL, obj, validation.errors);
}

function bgExtSubmitFiPaylad(payload, tokenData) {
  const rules = {
    reference_no: { required: true, type: "string" },
    fi_status: { required: true, type: "string" },
    remarks: { required: true, type: "string" },
  };

  const validation = validatePayload(payload, rules);

  if (!validation.isValid) {
    return successAndErrorObjectBulider(false, 200, validation.message, {}, validation.errors);
  }

  if (payload.fi_status !== APPROVED && payload.fi_status !== REJECTED) {
    return successAndErrorObjectBulider(false, 200, "fi_status must be APPROVED or REJECTED.", {}, []);
  }

  const obj = {
    reference_no: payload.reference_no,
    fi_status: payload.fi_status,
    remarks: payload.remarks,
    updated_at: getEpochTime(),
    updated_by: tokenData.vendor_code,
  };

  return successAndErrorObjectBulider(true, 200, Message.VALIDATION_SUCCESSFULL, obj, validation.errors);
}

module.exports = {
  getBgExtensionList,
  getBgExtensionDetails,
  getOriginalSdbgEntry,
  saveBgExtension,
  updateBgExtensionByDo,
  updateBgExtensionByFi,
  ACTION_TYPE_EXTENSION,
  ACTION_TYPE_RELEASE,
};
