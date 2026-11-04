const { poolQuery } = require("../config/pgDbConfig");
const { PO_BG_TERMS, EKPO } = require("../lib/tableName");
const { generateInsertUpdateQuery, getEpochTime } = require("../lib/utils");

const BG_BASIS_PO_VALUE = "PO_VALUE";
// Tolerance for "BG Value to be in line with PO terms" (To-Be 6.2.1) — rounding only
const BG_AMOUNT_TOLERANCE = 1;

/**
 * Per-PO BG terms replicated from SAP, with PO value.
 * Returns {} when SAP has not sent terms for the PO yet.
 */
async function getPoBgTerms(client, poNo) {
  const q = `SELECT terms.*,
                    (SELECT SUM(NULLIF(netwr, '')::numeric) FROM ${EKPO} WHERE ebeln = $1 AND COALESCE(loekz, '') = '') AS po_value
             FROM ${PO_BG_TERMS} AS terms
             WHERE terms.purchasing_doc_no = $1`;
  const result = await poolQuery({ client, query: q, values: [poNo] });
  const terms = result[0];
  if (!terms) return {};

  return { ...terms, expected_bg_amount: getExpectedBgAmount(terms) };
}

/**
 * BG amount the PO terms call for. Only derivable when SAP gives a fixed amount,
 * or a percentage of PO value; running-invoice / BPO bases are known only per bill.
 */
function getExpectedBgAmount(terms) {
  if (terms.bg_amount && Number(terms.bg_amount) > 0) return Number(terms.bg_amount);
  if (terms.bg_percentage && terms.bg_basis === BG_BASIS_PO_VALUE && terms.po_value) {
    return Math.round(Number(terms.po_value) * Number(terms.bg_percentage)) / 100;
  }
  return null;
}

/**
 * Non-blocking check of a BG amount against PO terms. Returns a warning message or null.
 */
async function getBgAmountWarning(client, poNo, bgAmount) {
  const terms = await getPoBgTerms(client, poNo);
  if (!terms.expected_bg_amount || !bgAmount) return null;

  const diff = Number(bgAmount) - terms.expected_bg_amount;
  if (Math.abs(diff) <= BG_AMOUNT_TOLERANCE) return null;

  return `BG Amount ${Number(bgAmount).toFixed(2)} is ${diff < 0 ? "less" : "more"} than the amount as per PO terms (${terms.expected_bg_amount.toFixed(2)}${
    terms.bg_percentage ? `, ${terms.bg_percentage}% of PO value` : ""
  }).`;
}

/**
 * Upsert PO BG terms sent by SAP (PO replication).
 */
async function upsertPoBgTerms(client, payload) {
  const obj = {
    purchasing_doc_no: payload.purchasing_doc_no,
    bg_percentage: payload.bg_percentage || null,
    bg_amount: payload.bg_amount || null,
    bg_basis: payload.bg_basis || null,
    currency: payload.currency || null,
    bg_submission_date: payload.bg_submission_date || null,
    warranty_expiry_date: payload.warranty_expiry_date || null,
    po_closed: !!payload.po_closed,
    po_closed_date: payload.po_closed_date || null,
    sd_percentage: payload.sd_percentage || null,
    sd_amount: payload.sd_amount || null,
    created_at: getEpochTime(),
  };
  const { q, val } = await generateInsertUpdateQuery(obj, PO_BG_TERMS, ["purchasing_doc_no"]);
  return await poolQuery({ client, query: q, values: val });
}

module.exports = { getPoBgTerms, getExpectedBgAmount, getBgAmountWarning, upsertPoBgTerms, BG_BASIS_PO_VALUE };
