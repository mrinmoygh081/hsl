const fs = require("fs/promises");
const path = require("path");
const { performance } = require("perf_hooks");

const renameInvoiceFile = async (filePath, originalName, invoiceNo) => {
  const extension = path.extname(originalName).toLowerCase();

  const normalizedInvoiceNo = String(invoiceNo)
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, "_");

  const uniqueId = `${Date.now()}-${Math.floor(performance.now() * 1000)}`;

  const newFileName = `${normalizedInvoiceNo}-${uniqueId}${extension}`;

  const newPath = path.join(path.dirname(filePath), newFileName);

  await fs.rename(filePath, newPath);

  return {
    fileName: newFileName,
    filePath: newPath,
  };
};

module.exports = {
  renameInvoiceFile,
};
