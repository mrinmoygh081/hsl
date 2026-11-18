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
  console.log(10027, invoiceData.gst_no, invoiceDate, gstResult);

  // STEP 1: If GST is missing, request confirmation

  console.log(102, gstResult.found, continueWithPenalty);
  if (!gstResult.found && !continueWithPenalty) {
    return {
      success: false,
      requiresConfirmation: true,
      status: gstResult.reason,

      message: gstResult.message,

      penaltyPercentage: 2,
    };
  }
  // Gate entry verification
  //   const gateEntryResult = await verifyGateEntry(
  //   client,
  //   invoiceData.po_no,
  //   invoiceData.invoice_no,
  // );
  const gateEntryResult = await getGateEntryDetails(client, [
    invoiceData.po_no,
    invoiceData.invoice_no,
  ]);

  console.log(88, gateEntryResult);

  if (!gateEntryResult) {
    return {
      success: false,
      requiresConfirmation: false,
      status: "GATE_ENTRY_MISMATCH",
      message: gateEntryResult.message,
      gateEntryDetails: gateEntryResult,
    };
  }

  // STEP 2: GRN verification

  const grnResult = await verifyGRNAmount(
    client,
    invoiceData.po_no,
    invoiceData.invoice_no,
    invoiceData.sub_total,
  );

  if (!grnResult.matched) {
    return {
      success: false,
      requiresConfirmation: false,
      status: "GRN_MISMATCH",
      message: grnResult.message,
      grnDetails: grnResult,
    };
  }

  // STEP 3: Calculate penalty

  const amountDetails = calculateInvoice(
    invoiceData.sub_total,
    !gstResult.found && continueWithPenalty,
  );

  // STEP 4: Final result

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
};

module.exports = {
  processExtractedInvoice,
};
