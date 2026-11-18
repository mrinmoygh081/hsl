const { getGrnIcgrnByInvoiceService } = require("../btn.services");

const verifyGRNAmount = async (client, poNumber, invoiceNo, invoiceAmount) => {
  const grnResult = await getGrnIcgrnByInvoiceService(
    client,
    poNumber,
    invoiceNo,
  );
  console.log(505, grnResult);

  if (!grnResult || grnResult.success === false) {
    return {
      matched: false,
      message: grnResult?.message || "GRN record not found",
    };
  }

  // Get GRN records
  const grnRecords = grnResult?.data?.grn_nos || [];
  console.log(61, grnRecords);
  if (!grnRecords.length) {
    return {
      matched: false,
      message: "No GRN details found",
    };
  }
  console.log(62);

  let grnAmount = 0;
  let grnQuantity = 0;

  for (const item of grnRecords) {
    // const quantity = Number(item.accepted_quantity);
    const quantity = Number(item.grn_quantity - item.return_quantity);
    const price = Number(item.price);

    console.log(quantity, price);

    if (!Number.isFinite(quantity) || !Number.isFinite(price)) {
      throw new Error("Invalid quantity or price in GRN data");
    }

    grnQuantity += quantity;
    grnAmount += price;
  }

  const amount = Number(invoiceAmount);

  if (!Number.isFinite(amount)) {
    throw new Error("Invalid invoice amount");
  }
  console.log(63);

  const difference = amount - grnAmount;
  //   const difference = 0;
  console.log(64, amount, grnAmount, difference);

  // Currency comparison tolerance: 1 paisa.

  const amountMatched = Math.abs(difference) < 0.01;

  return {
    matched: amountMatched,

    message: amountMatched
      ? "Invoice amount matched with GRN report"
      : "Total claimed amount does not match with GRN report",

    invoiceAmount: amount,
    grnAmount: Number(grnAmount.toFixed(2)),
    differenceAmount: Number(difference.toFixed(2)),

    grnQuantity,

    grnRecords,
  };
};

module.exports = {
  verifyGRNAmount,
};
