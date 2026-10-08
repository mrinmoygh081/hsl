const multer = require("multer");
const { fileStore } = require("../lib/fileUpload");
const pdfFileFilter = (req, file, cb) => {
  if (file.mimetype === "application/pdf") {
    cb(null, true);
  } else {
    cb(new Error("Only PDF file is allowed!"), false);
  }
};

const uploadBTNs = multer({
  storage: fileStore,
  pdfFileFilter,
  limits: { fileSize: 20 * 1000 * 1000 }
});

// eslint-disable-next-line no-unused-vars
exports.btnmw = (req, res) => {
  return uploadBTNs.fields([
    { name: "invoice_filename", maxCount: 1 },
    { name: "invoice_supporting_doc", maxCount: 1 },
    // { name: "e_invoice_filename", maxCount: 1 },
    { name: "debit_credit_filename", maxCount: 1 },
    { name: "get_entry_filename", maxCount: 1 },
    { name: "demand_raise_filename", maxCount: 1 },
    // { name: "invoice_filename", maxCount: 1 },
    { name: "balance_claim_invoice_filename", maxCount: 1 },

    { name: "invoice_file", maxCount: 1 },
    { name: "ref_invoice1_file", maxCount: 1 },
    { name: "ref_invoice2_file", maxCount: 1 },
    { name: "ref_invoice3_file", maxCount: 1 },
    { name: "ref_invoice4_file", maxCount: 1 },
  ]);
};

exports.serviceBtnFilesUpload = () => {
  return uploadBTNs.fields([
    { name: "invoice_filename", maxCount: 1 },
    { name: "suppoting_invoice_filename", maxCount: 1 },
    { name: "debit_credit_filename", maxCount: 1 },
    // { name: "hinderance_register_filename", maxCount: 1 },
    // { name: "esi_compliance_filename", maxCount: 1 },
    // { name: "pf_compliance_filename", maxCount: 1 },
  ]);
};

exports.btnAdvanceBillHybridUploadFile = () => {
  return uploadBTNs.fields([
    { name: "invoice_filename", maxCount: 1 },
    { name: "suppoting_invoice_filename", maxCount: 1 },
  ]);
};

exports.btnJccUploadFile = () => {
  return uploadBTNs.fields([
    { name: "invoice_filename", maxCount: 1 },
    // { name: "suppoting_invoice_filename", maxCount: 1 },
    { name: "bonus_claim_filename", maxCount: 1 },
    // { name: "jcc_filename", maxCount: 1 },
    { name: "earned_leave_filename", maxCount: 1 }
  ]);
};
