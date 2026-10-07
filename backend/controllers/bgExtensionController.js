const { poolClient } = require("../config/pgDbConfig");
const { resSend } = require("../lib/resSend");
const Message = require("../utils/messages");
const bgExtensionServices = require("../services/bgExtension.services");
const { checkIsDealingOfficer } = require("./poController/sdbgController");
const { FINANCE } = require("../lib/depertmentMaster");
const { sendMail } = require("../services/mail.services");
const { getUserDetailsQuery } = require("../utils/mailFunc");
const { getQuery } = require("../config/pgDbConfig");
const { BG_EXTENSION_RELEASE, BG_EXTENSION_RELEASE_BANK, BG_EXTENSION_SUBMITTED } = require("../lib/event");
const { APPROVED, REJECTED } = require("../lib/status");

async function getBgExtensionList(req, res) {
  let client;
  try {
    client = await poolClient();
    const tokenData = req.tokenData;
    const bgData = await bgExtensionServices.getBgExtensionList(client, req.query, tokenData);

    resSend(res, true, 200, Message.DATA_FETCH_SUCCESSFULL, bgData.result, "");
  } catch (error) {
    console.error("getBgExtensionList error", error.message, error);
    resSend(res, false, 500, Message.SOMTHING_WENT_WRONG, error);
  } finally {
    if (client) client.release();
  }
}

async function getBgExtensionDetails(req, res) {
  let client;
  try {
    client = await poolClient();
    const result = await bgExtensionServices.getBgExtensionDetails(client, req.params.reference_no);

    resSend(res, true, 200, Message.DATA_FETCH_SUCCESSFULL, result, "");
  } catch (error) {
    console.error("getBgExtensionDetails error", error.message, error);
    resSend(res, false, 500, Message.SOMTHING_WENT_WRONG, error);
  } finally {
    if (client) client.release();
  }
}

// Vendor: request an Extension or Release against an already-accepted BG (OVMS NIC)
async function submitBgExtension(req, res) {
  let client;
  try {
    client = await poolClient();
    const tokenData = req.tokenData;
    const resp = await bgExtensionServices.saveBgExtension(client, tokenData, req.body);
    if (!resp.success) {
      return resSend(res, false, resp.statusCode, resp.message, resp.error);
    }

    const doDetails = await getQuery({ query: getUserDetailsQuery("do", "$1"), values: [req.body.purchasing_doc_no] });
    await sendMail(BG_EXTENSION_SUBMITTED, req.body, { users: doDetails }, BG_EXTENSION_SUBMITTED);

    resSend(res, true, 200, Message.DATA_SEND_SUCCESSFULL, resp.data);
  } catch (error) {
    console.error("submitBgExtension error", error.message, error);
    resSend(res, false, 500, Message.SOMTHING_WENT_WRONG, error);
  } finally {
    if (client) client.release();
  }
}

// Dealing Officer: forward the request to Finance, or reject it outright (OVMS LAN)
async function submitBgExtensionByDo(req, res) {
  let client;
  try {
    client = await poolClient();
    const tokenData = req.tokenData;

    const isDO = await checkIsDealingOfficer(req.body.purchasing_doc_no, tokenData.vendor_code);
    if (!isDO) {
      return resSend(res, false, 200, "Please Login as dealing officer.", null, null);
    }

    const resp = await bgExtensionServices.updateBgExtensionByDo(client, tokenData, req.body);
    if (!resp.success) {
      return resSend(res, false, resp.statusCode, resp.message, resp.error);
    }

    if (req.body.status === REJECTED) {
      await notifyVendorOfOutcome(req.body.reference_no, REJECTED);
    }

    resSend(res, true, 200, Message.DATA_SEND_SUCCESSFULL, resp.data, "", resp.data);
  } catch (error) {
    console.error("submitBgExtensionByDo error", error.message, error);
    resSend(res, false, 500, Message.SOMTHING_WENT_WRONG, error);
  } finally {
    if (client) client.release();
  }
}

async function submitBgExtensionByFinance(req, res) {
  let client;
  try {
    client = await poolClient();
    const tokenData = req.tokenData;

    if (tokenData.department_id != FINANCE) {
      return resSend(res, false, 200, "Please login as finance!", null, null);
    }

    const resp = await bgExtensionServices.updateBgExtensionByFi(client, tokenData, req.body);
    if (!resp.success) {
      return resSend(res, false, resp.statusCode, resp.message, resp.error);
    }

    await notifyVendorOfOutcome(req.body.reference_no, req.body.fi_status, resp.data);

    resSend(res, true, 200, Message.DATA_SEND_SUCCESSFULL, resp.data, "", resp.data);
  } catch (error) {
    console.error("submitBgExtensionByFinance error", error.message, error);
    resSend(res, false, 500, Message.SOMTHING_WENT_WRONG, error);
  } finally {
    if (client) client.release();
  }
}

async function notifyVendorOfOutcome(reference_no, status, ext) {
  try {
    let client;
    try {
      client = await poolClient();
      const extRow = ext?.action_type ? ext : (await bgExtensionServices.getBgExtensionDetails(client, reference_no))[0];
      if (!extRow) return;

      const vendorDetails = await getQuery({ query: getUserDetailsQuery("vendor", "$1"), values: [extRow.created_by] });
      await sendMail(BG_EXTENSION_RELEASE, { ...extRow, status }, { users: vendorDetails }, BG_EXTENSION_RELEASE);

      if (status === APPROVED) {
        const original = await bgExtensionServices.getOriginalSdbgEntry(client, extRow.sdbg_reference_no);
        if (original?.bank_email) {
          await sendMail(
            BG_EXTENSION_RELEASE_BANK,
            { ...extRow, status },
            { users: [{ u_id: original.bg_no, u_name: original.bank_name, u_email: original.bank_email, u_type: "bank" }] },
            BG_EXTENSION_RELEASE_BANK,
          );
        }
      }
    } finally {
      if (client) client.release();
    }
  } catch (error) {
    console.error("notifyVendorOfOutcome error", error.message, error);
  }
}

module.exports = {
  getBgExtensionList,
  getBgExtensionDetails,
  submitBgExtension,
  submitBgExtensionByDo,
  submitBgExtensionByFinance,
};
