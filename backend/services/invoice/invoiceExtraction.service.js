const path = require("path");
const fs = require("fs/promises");

const extractInvoiceData = async (file) => {
  if (!file?.path) {
    throw new Error("Invoice file is required");
  }

  const fileBuffer = await fs.readFile(file.path);

  const formData = new FormData();

  const fileBlob = new Blob([fileBuffer], {
    type: file.mimetype || "application/pdf",
  });

  formData.append("File", fileBlob, file.originalname);

  const controller = new AbortController();

  const timeout = setTimeout(() => controller.abort(), 60000);
  const extractAPI = process.env.INVOICE_EXTRACTION_API;

  try {
    const response = await fetch(
      extractAPI || "http://localhost:8000/extract",
      {
        method: "POST",
        body: formData,
        signal: controller.signal,
      },
    );

    if (!response.ok) {
      throw new Error(`Extraction API failed with status ${response.status}`);
    }

    const result = await response.json();

    if (result.success !== true) {
      throw new Error(
        result.error || result.message || "Invoice extraction failed",
      );
    }

    const data = result.data;

    if (!data) {
      throw new Error("Extracted invoice data is empty");
    }

    return {
      success: result.success,
      status: result.code,
      message: result.message,
      error: result.error,

      invoiceData: {
        company_name: data.company_name,
        invoice_no: data.invoice_no,
        invoice_date: data.invoice_date,
        po_no: data.po_no,
        gst_no: data.gst_no,
        sub_total: Number(data.subtotal),
        items: data.items || [],
      },
    };
  } finally {
    clearTimeout(timeout);
  }
};

module.exports = {
  extractInvoiceData,
};
