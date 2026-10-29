const { poolQuery } = require("../config/pgDbConfig");
const { BTN_BG_RETENTION_RELEASE } = require("../lib/constant");
const { APPROVED } = require("../lib/status");
const { BTN_BG_RETENTION, BTN_BG_RETENTION_LINE, SDBG_ENTRY, EKKO, BTN_ASSIGN } = require("../lib/tableName");
const { getEpochTime } = require("../lib/utils");
const { getPoBgTerms } = require("./poBgTerms.services");

// Workflow (To-Be 6.22.2): Contractor -> Commercial (DO) -> Finance -> Payment Section
const BG_RET_SUBMITTED = "SUBMITTED_BY_VENDOR";
const BG_RET_RECOMMENDED = "RECOMMENDED_BY_DO";
const BG_RET_ASSIGNED = "ASSIGNED_TO_FI";
const BG_RET_ACCEPTED = "ACCEPTED_BY_FI";
const BG_RET_PART_ACCEPTED = "PARTIALLY_ACCEPTED_BY_FI";
const BG_RET_REJECTED = "REJECTED";

/**
 * Vendor's accepted, unreleased BGs (across POs) a retention release can be claimed against,
 * with warranty / PO closure from SAP terms and any open claim on the BG.
 */
async function getClaimableBgs(client, vendorCode) {
  const q = `SELECT bg.purchasing_doc_no, bg.reference_no AS sdbg_reference_no, bg.bg_no, bg.bg_type,
                    bg.bg_ammount, bg.currency, bg.validity_date, bg.bg_file_no,
                    open_claim.btn_num AS open_claim_btn_num
             FROM ${SDBG_ENTRY} AS bg
             JOIN ${EKKO} AS po ON (po.ebeln = bg.purchasing_doc_no)
             LEFT JOIN LATERAL (
                SELECT line.btn_num FROM ${BTN_BG_RETENTION_LINE} AS line
                JOIN ${BTN_BG_RETENTION} AS hdr ON (hdr.btn_num = line.btn_num)
                WHERE line.sdbg_reference_no = bg.reference_no AND hdr.status <> $3
                  AND COALESCE(line.fi_status, '') <> $3
                LIMIT 1
             ) AS open_claim ON true
             WHERE po.lifnr = $1 AND bg.status = $2 AND COALESCE(bg.release_date, 0) = 0
             ORDER BY bg.purchasing_doc_no, bg.created_at`;
  const rows = await poolQuery({ client, query: q, values: [vendorCode, APPROVED, BG_RET_REJECTED] });

  const termsCache = {};
  for (const row of rows) {
    if (!termsCache[row.purchasing_doc_no]) termsCache[row.purchasing_doc_no] = await getPoBgTerms(client, row.purchasing_doc_no);
    const terms = termsCache[row.purchasing_doc_no];
    row.warranty_expiry_date = terms.warranty_expiry_date || null;
    row.po_closed = terms.po_closed ?? null;
  }
  return rows;
}

async function getBgRetentionDetails(client, btn_num) {
  const hdr = await poolQuery({
    client,
    query: `SELECT hdr.*, assign.assign_to AS do_id, assign.assign_to_fi AS fi_officer,
                   do_user.cname AS do_name, fi_user.cname AS fi_officer_name
            FROM ${BTN_BG_RETENTION} AS hdr
            LEFT JOIN ${BTN_ASSIGN} AS assign ON (assign.btn_num = hdr.btn_num)
            LEFT JOIN pa0002 AS do_user ON (do_user.pernr::character varying = assign.assign_to)
            LEFT JOIN pa0002 AS fi_user ON (fi_user.pernr::character varying = assign.assign_to_fi)
            WHERE hdr.btn_num = $1`,
    values: [btn_num],
  });
  if (!hdr.length) return null;

  const lines = await poolQuery({
    client,
    query: `SELECT * FROM ${BTN_BG_RETENTION_LINE} WHERE btn_num = $1 ORDER BY id`,
    values: [btn_num],
  });
  const termsCache = {};
  for (const line of lines) {
    if (!termsCache[line.purchasing_doc_no]) termsCache[line.purchasing_doc_no] = await getPoBgTerms(client, line.purchasing_doc_no);
    line.warranty_expiry_date = termsCache[line.purchasing_doc_no].warranty_expiry_date || null;
    line.po_closed = termsCache[line.purchasing_doc_no].po_closed ?? null;
  }
  return { ...hdr[0], lines };
}

const bgRetentionHeaderPayload = (body, files, tokenData, btn_num, net_claim_amount, primaryPo) => ({
  btn_num,
  purchasing_doc_no: primaryPo,
  vendor_code: tokenData.vendor_code,
  net_claim_amount,
  ...files,
  remarks: body.remarks || null,
  status: BG_RET_SUBMITTED,
  btn_type: BTN_BG_RETENTION_RELEASE,
  created_at: getEpochTime(),
  created_by_id: tokenData.vendor_code,
});

module.exports = {
  getClaimableBgs,
  getBgRetentionDetails,
  bgRetentionHeaderPayload,
  BG_RET_SUBMITTED,
  BG_RET_RECOMMENDED,
  BG_RET_ASSIGNED,
  BG_RET_ACCEPTED,
  BG_RET_PART_ACCEPTED,
  BG_RET_REJECTED,
};
