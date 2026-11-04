const { poolClient, poolQuery } = require("../config/pgDbConfig");
const { INSERT, UPDATE, USER_TYPE_VENDOR, ASSIGNER, STAFF } = require("../lib/constant");
const { FINANCE } = require("../lib/depertmentMaster");
const { resSend } = require("../lib/resSend");
const { APPROVED, REJECTED } = require("../lib/status");
const { BTN_BG_RETENTION, BTN_BG_RETENTION_LINE, BTN_ASSIGN } = require("../lib/tableName");
const { generateQuery, getEpochTime } = require("../lib/utils");
const { filesData } = require("../services/btn.services");
const { addToBTNListFn } = require("../services/btnServiceHybrid.services");
const { create_btn_no } = require("../services/po.services");
const { getAssigneeList } = require("../services/lastassignee.servces");
const {
  getClaimableBgs,
  getBgRetentionDetails,
  bgRetentionHeaderPayload,
  BG_RET_SUBMITTED,
  BG_RET_RECOMMENDED,
  BG_RET_ASSIGNED,
  BG_RET_ACCEPTED,
  BG_RET_PART_ACCEPTED,
  BG_RET_REJECTED,
} = require("../services/btnBgRetention.services");
const { checkIsDealingOfficer } = require("./poController/sdbgController");
const Message = require("../utils/messages");

const REQUIRED_FILES = ["warranty_cert_filename", "no_due_cert_filename"];

async function upsertBtnAssign(client, data) {
  const q = `INSERT INTO ${BTN_ASSIGN} (btn_num, purchasing_doc_no, assign_by, assign_to, last_assign, assign_by_fi, assign_to_fi, last_assign_fi)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             ON CONFLICT (btn_num, purchasing_doc_no) DO UPDATE SET
               assign_by = COALESCE(EXCLUDED.assign_by, ${BTN_ASSIGN}.assign_by),
               assign_to = COALESCE(EXCLUDED.assign_to, ${BTN_ASSIGN}.assign_to),
               last_assign = EXCLUDED.last_assign,
               assign_by_fi = EXCLUDED.assign_by_fi,
               assign_to_fi = EXCLUDED.assign_to_fi,
               last_assign_fi = EXCLUDED.last_assign_fi`;
  await poolQuery({
    client,
    query: q,
    values: [data.btn_num, data.purchasing_doc_no, data.assign_by || null, data.assign_to || null, !data.assign_to_fi, data.assign_by_fi || "", data.assign_to_fi || "", !!data.assign_to_fi],
  });
}

async function updateHeader(client, btn_num, payload) {
  const { q, val } = generateQuery(UPDATE, BTN_BG_RETENTION, payload, { btn_num });
  await poolQuery({ client, query: q, values: val });
}

// GET /btn/bg-retention?type=init | details&btn_num= | fi-staff
const getBgRetentionData = async (req, res) => {
  let client;
  try {
    client = await poolClient();
    const tokenData = req.tokenData;
    switch (req.query.type) {
      case "init": {
        if (tokenData.user_type != USER_TYPE_VENDOR) {
          return resSend(res, false, 200, Message.LOGIN_AS_VALID_USER, null, null);
        }
        const bgs = await getClaimableBgs(client, tokenData.vendor_code);
        return resSend(res, true, 200, Message.DATA_FETCH_SUCCESSFULL, { bgs }, null);
      }
      case "details": {
        if (!req.query.btn_num) {
          return resSend(res, false, 200, "Please send btn number", null, null);
        }
        const details = await getBgRetentionDetails(client, req.query.btn_num);
        if (details && tokenData.user_type == USER_TYPE_VENDOR && details.vendor_code !== tokenData.vendor_code) {
          return resSend(res, false, 200, "You are not authorized.", null, null);
        }
        return resSend(res, true, 200, Message.DATA_FETCH_SUCCESSFULL, details || {}, null);
      }
      case "fi-staff": {
        const staff = await getAssigneeList(FINANCE, STAFF);
        return resSend(res, true, 200, Message.DATA_FETCH_SUCCESSFULL, staff, null);
      }
      default:
        return resSend(res, false, 200, "Please send a valid type!", null, null);
    }
  } catch (error) {
    console.error("getBgRetentionData error", error.message, error);
    resSend(res, false, 500, Message.SOMTHING_WENT_WRONG, null, null);
  } finally {
    if (client) client.release();
  }
};

// Vendor (OVMS NIC): raise a BG Retention Release claim against one or more POs/BGs
const submitBgRetention = async (req, res) => {
  let client;
  try {
    const tokenData = req.tokenData;
    if (tokenData.user_type != USER_TYPE_VENDOR) {
      return resSend(res, false, 200, Message.LOGIN_AS_VALID_USER, null, null);
    }

    let lines = req.body.lines;
    try {
      lines = typeof lines === "string" ? JSON.parse(lines) : lines;
    } catch {
      lines = null;
    }
    if (!Array.isArray(lines) || !lines.length) {
      return resSend(res, false, 200, "Please select at least one BG to claim.", null, null);
    }
    if (lines.some((l) => !l.purchasing_doc_no || !l.sdbg_reference_no || !(Number(l.claim_amount) > 0))) {
      return resSend(res, false, 200, "Each claim line needs a PO, a BG and a claim amount.", null, null);
    }
    const files = filesData(req.files || {});
    const missing = REQUIRED_FILES.filter((f) => !files[f]);
    if (missing.length) {
      return resSend(res, false, 200, "Please upload the Warranty Completion Certificate and No Due Certificate.", null, null);
    }

    client = await poolClient();

    // Only the vendor's own accepted, unreleased BGs without an open claim
    const claimable = await getClaimableBgs(client, tokenData.vendor_code);
    const claimableByRef = Object.fromEntries(claimable.map((b) => [b.sdbg_reference_no, b]));
    for (const l of lines) {
      const bg = claimableByRef[l.sdbg_reference_no];
      if (!bg || bg.purchasing_doc_no !== l.purchasing_doc_no) {
        return resSend(res, false, 200, `BG ${l.sdbg_reference_no} is not available for a retention release claim.`, null, null);
      }
      if (bg.open_claim_btn_num) {
        return resSend(res, false, 200, `BG ${bg.bg_no} already has an open claim (BTN ${bg.open_claim_btn_num}).`, null, null);
      }
    }

    // Routed to one Commercial / Dealing Officer: all POs in a claim must share the DO
    const poList = [...new Set(lines.map((l) => l.purchasing_doc_no))];
    const dos = await poolQuery({ client, query: `SELECT DISTINCT ernam FROM ekko WHERE ebeln = ANY($1)`, values: [poList] });
    if (dos.length !== 1) {
      return resSend(res, false, 200, "All POs in one claim must belong to the same Dealing Officer. Please raise separate claims.", null, null);
    }
    const doId = dos[0].ernam;

    await client.query("BEGIN");
    const btn_num = await create_btn_no(client);
    const net_claim_amount = lines.reduce((sum, l) => sum + Number(l.claim_amount), 0);
    const header = bgRetentionHeaderPayload(req.body, files, tokenData, btn_num, net_claim_amount, poList[0]);
    const hq = generateQuery(INSERT, BTN_BG_RETENTION, header);
    await poolQuery({ client, query: hq.q, values: hq.val });

    for (const l of lines) {
      const bg = claimableByRef[l.sdbg_reference_no];
      const lq = generateQuery(INSERT, BTN_BG_RETENTION_LINE, {
        btn_num,
        purchasing_doc_no: l.purchasing_doc_no,
        sdbg_reference_no: l.sdbg_reference_no,
        bg_no: bg.bg_no,
        claim_amount: Number(l.claim_amount),
        created_at: getEpochTime(),
      });
      await poolQuery({ client, query: lq.q, values: lq.val });
    }

    await upsertBtnAssign(client, { btn_num, purchasing_doc_no: poList[0], assign_by: tokenData.vendor_code, assign_to: doId });
    await addToBTNListFn(
      client,
      { ...header, net_payable_amount: net_claim_amount, assign_by: tokenData.vendor_code, assign_to: doId },
      BG_RET_SUBMITTED,
    );
    await client.query("COMMIT");
    resSend(res, true, 201, Message.BTN_CREATED, { btn_num }, null);
  } catch (error) {
    console.error("submitBgRetention error", error.message, error);
    if (client) await client.query("ROLLBACK");
    resSend(res, false, 500, Message.SOMTHING_WENT_WRONG, null, null);
  } finally {
    if (client) client.release();
  }
};

// Commercial / Dealing Officer (OVMS LAN): verify and recommend to Finance, or reject
const bgRetentionActionByDo = async (req, res) => {
  let client;
  try {
    const tokenData = req.tokenData;
    const { btn_num, status, remarks } = req.body;
    if (!btn_num || !remarks || (status !== BG_RET_RECOMMENDED && status !== REJECTED)) {
      return resSend(res, false, 200, `Please send btn_num, remarks and status ${BG_RET_RECOMMENDED} or ${REJECTED}.`, null, null);
    }
    client = await poolClient();
    const claim = await getBgRetentionDetails(client, btn_num);
    if (!claim) return resSend(res, false, 200, "Claim not found.", null, null);
    if (claim.status !== BG_RET_SUBMITTED) {
      return resSend(res, false, 200, `You can't take any action. Current status: ${claim.status}`, null, null);
    }
    const isDO = await checkIsDealingOfficer(claim.purchasing_doc_no, tokenData.vendor_code);
    if (!isDO || isDO == 0) {
      return resSend(res, false, 200, "Please Login as dealing officer.", null, null);
    }

    const newStatus = status === REJECTED ? BG_RET_REJECTED : BG_RET_RECOMMENDED;
    await client.query("BEGIN");
    await updateHeader(client, btn_num, { status: newStatus, do_remarks: remarks, do_action_by: tokenData.vendor_code, do_action_at: getEpochTime() });
    await addToBTNListFn(
      client,
      {
        ...claim,
        net_payable_amount: claim.net_claim_amount,
        remarks,
        assign_by: tokenData.vendor_code,
        assign_to: status === REJECTED ? claim.vendor_code : "FINANCE_NODAL",
      },
      newStatus,
    );
    await client.query("COMMIT");
    resSend(res, true, 200, status === REJECTED ? "Claim rejected." : "Claim recommended and forwarded to Finance nodal point.", null, null);
  } catch (error) {
    console.error("bgRetentionActionByDo error", error.message, error);
    if (client) await client.query("ROLLBACK");
    resSend(res, false, 500, Message.SOMTHING_WENT_WRONG, null, null);
  } finally {
    if (client) client.release();
  }
};

// Finance (OVMS LAN): nodal point assigns a Finance Officer; the officer accepts/rejects fully or per line
const bgRetentionActionByFinance = async (req, res) => {
  let client;
  try {
    const tokenData = req.tokenData;
    if (tokenData.department_id != FINANCE) {
      return resSend(res, false, 200, "Please login as finance!", null, null);
    }
    const { btn_num, action } = req.body;
    if (!btn_num || !action) {
      return resSend(res, false, 200, "Please send btn_num and action.", null, null);
    }
    client = await poolClient();
    const claim = await getBgRetentionDetails(client, btn_num);
    if (!claim) return resSend(res, false, 200, "Claim not found.", null, null);

    if (action === "ASSIGN") {
      if (tokenData.internal_role_id != ASSIGNER) {
        return resSend(res, false, 200, "Only the Finance nodal point can assign.", null, null);
      }
      if (claim.status !== BG_RET_RECOMMENDED && claim.status !== BG_RET_ASSIGNED) {
        return resSend(res, false, 200, `You can't assign this claim. Current status: ${claim.status}`, null, null);
      }
      if (!req.body.assign_to) {
        return resSend(res, false, 200, "Please choose a Finance Officer.", null, null);
      }
      await client.query("BEGIN");
      await upsertBtnAssign(client, {
        btn_num,
        purchasing_doc_no: claim.purchasing_doc_no,
        assign_by_fi: tokenData.vendor_code,
        assign_to_fi: req.body.assign_to,
      });
      await updateHeader(client, btn_num, { status: BG_RET_ASSIGNED });
      await addToBTNListFn(
        client,
        { ...claim, net_payable_amount: claim.net_claim_amount, assign_by: tokenData.vendor_code, assign_to: req.body.assign_to, remarks: "Assigned by Finance nodal point" },
        BG_RET_ASSIGNED,
      );
      await client.query("COMMIT");
      return resSend(res, true, 200, `Claim assigned to ${req.body.assign_to}.`, null, null);
    }

    if (action !== "DECIDE") {
      return resSend(res, false, 200, "action must be ASSIGN or DECIDE.", null, null);
    }
    if (claim.status !== BG_RET_ASSIGNED || claim.fi_officer !== tokenData.vendor_code) {
      return resSend(res, false, 200, "This claim is not assigned to you.", null, null);
    }

    // decisions: [{ id, fi_status: APPROVED|REJECTED, approved_amount, fi_remarks }]
    let decisions = req.body.lines;
    if (!Array.isArray(decisions) || decisions.length !== claim.lines.length) {
      return resSend(res, false, 200, "Please accept or reject every line.", null, null);
    }
    const lineById = Object.fromEntries(claim.lines.map((l) => [String(l.id), l]));
    for (const d of decisions) {
      const line = lineById[String(d.id)];
      if (!line || (d.fi_status !== APPROVED && d.fi_status !== REJECTED)) {
        return resSend(res, false, 200, "Invalid line decision.", null, null);
      }
      if (d.fi_status === REJECTED && !d.fi_remarks) {
        return resSend(res, false, 200, "Please give remarks for every rejected line.", null, null);
      }
      const amt = d.fi_status === APPROVED ? Number(d.approved_amount ?? line.claim_amount) : 0;
      if (amt < 0 || amt > Number(line.claim_amount)) {
        return resSend(res, false, 200, `Accepted amount for BG ${line.bg_no} must be between 0 and the claimed amount.`, null, null);
      }
      d.approved_amount = amt;
    }

    const misc = !!req.body.misc_recovery_applicable;
    const miscAmount = misc ? Number(req.body.misc_recovery_amount || 0) : 0;
    const acceptedTotal = decisions.reduce((s, d) => s + d.approved_amount, 0);
    if (miscAmount < 0 || miscAmount > acceptedTotal) {
      return resSend(res, false, 200, "Misc. recovery must be between 0 and the accepted amount.", null, null);
    }
    const acceptedCount = decisions.filter((d) => d.fi_status === APPROVED).length;
    const newStatus = acceptedCount === 0 ? BG_RET_REJECTED : acceptedCount === decisions.length ? BG_RET_ACCEPTED : BG_RET_PART_ACCEPTED;
    const net_payable_amount = acceptedTotal - miscAmount;

    await client.query("BEGIN");
    for (const d of decisions) {
      const { q, val } = generateQuery(
        UPDATE,
        BTN_BG_RETENTION_LINE,
        { fi_status: d.fi_status, approved_amount: d.approved_amount, fi_remarks: d.fi_remarks || null },
        { id: d.id, btn_num },
      );
      await poolQuery({ client, query: q, values: val });
    }
    await updateHeader(client, btn_num, {
      status: newStatus,
      fi_remarks: req.body.remarks || null,
      fi_action_by: tokenData.vendor_code,
      fi_action_at: getEpochTime(),
      misc_recovery_applicable: misc,
      misc_recovery_amount: misc ? miscAmount : null,
      misc_recovery_remarks: misc ? req.body.misc_recovery_remarks || null : null,
      net_payable_amount,
    });
    await addToBTNListFn(
      client,
      { ...claim, net_payable_amount, remarks: req.body.remarks || newStatus, assign_by: tokenData.vendor_code, assign_to: tokenData.vendor_code },
      newStatus,
    );
    await client.query("COMMIT");
    resSend(res, true, 200, `Claim ${newStatus.replace(/_/g, " ").toLowerCase()}. Net payable: ${net_payable_amount.toFixed(2)}`, null, null);
  } catch (error) {
    console.error("bgRetentionActionByFinance error", error.message, error);
    if (client) await client.query("ROLLBACK");
    resSend(res, false, 500, Message.SOMTHING_WENT_WRONG, null, null);
  } finally {
    if (client) client.release();
  }
};

module.exports = { getBgRetentionData, submitBgRetention, bgRetentionActionByDo, bgRetentionActionByFinance };
