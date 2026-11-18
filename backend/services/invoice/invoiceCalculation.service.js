const calculateInvoice = (invoiceAmount, penaltyApplicable = false) => {
  const amount = Number(invoiceAmount);

  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error("Invalid invoice amount");
  }

  const penaltyPercentage = penaltyApplicable ? 10 : 0;

  const penaltyAmount = Number(((amount * penaltyPercentage) / 100).toFixed(2));


  return {
    invoiceAmount: amount,
    penaltyPercentage,
    penaltyAmount,
    payableAmount: Number((amount - penaltyAmount).toFixed(2)),
  };
};

module.exports = {
  calculateInvoice,
};
