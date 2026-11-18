const { verifyGSTRecord } = require("./gstVerification.service");

const { verifyGRNAmount } = require("./grnVerification.service");
const { getGateEntryDetails } = require("../btn.services");

const { calculateInvoice } = require("./invoiceCalculation.service");


const processExtractedInvoice = async (
  client,
  invoiceData,
  invoiceDate,
  gstResult,
  continueWithPenalty = false,
) => {
  try {
    console.log("GST Verification:", gstResult);
    console.log("Continue With Penalty:", continueWithPenalty);

    // STEP 1: GST verification
    if (!gstResult?.found && !continueWithPenalty) {
      return {
        success: false,
        requiresConfirmation: true,
        status: gstResult?.reason || "GST_NOT_FOUND",
        message: gstResult?.message || "GST record not found",

        penaltyPercentage: 10,
      };
    }

    // STEP 2: Gate Entry verification
    const gateEntryResult = await getGateEntryDetails(client, [
      invoiceData.po_no,
      invoiceData.invoice_no,
    ]);

    console.log("Gate Entry Result:", gateEntryResult);

    if (!gateEntryResult || gateEntryResult.success === false) {
      return {
        success: false,
        requiresConfirmation: false,
        status: "GATE_ENTRY_MISMATCH",
        message: gateEntryResult?.message || "Gate entry details not found",
        gateEntryDetails: gateEntryResult,
      };
    }

    // STEP 3: GRN verification
    const grnResult = await verifyGRNAmount(
      client,
      invoiceData.po_no,
      invoiceData.invoice_no,
      invoiceData.sub_total,
    );

    console.log("GRN Result:", grnResult);

    if (!grnResult?.matched) {
      return {
        success: false,
        requiresConfirmation: false,
        status: "GRN_MISMATCH",
        message: grnResult?.message || "GRN amount mismatch",
        grnDetails: grnResult,
      };
    }

    // STEP 4: Calculate invoice amount
    const penaltyApplicable = !gstResult?.found && continueWithPenalty === true;

    const amountDetails = calculateInvoice(
      invoiceData.sub_total,
      penaltyApplicable,
    );

    // STEP 5: Final response
    return {
      success: true,
      requiresConfirmation: false,
      status: "VERIFIED",
      message: "Invoice successfully verified",

      gstVerification: gstResult,

      gateEntryVerification: gateEntryResult,

      grnVerification: grnResult,

      invoiceDetails: invoiceData,

      amountDetails,
    };
  } catch (error) {
    console.error("processExtractedInvoice error:", error);
    throw error;
  }
};
module.exports = {
  processExtractedInvoice,
};
