const multer = require("multer");
const { existsSync, mkdirSync } = require("fs");
const path = require("path");
const { formatDateSync, formatDateYYDDMM, formatDateYYYYMM, formatDateDD, formatDateYYYYMMDDHHMMSSMS } = require("../utils/dateTime");
const { OTHER_SERVER_DATA_PATH } = require("./constant");

const dynamicFileFilter = (req, file, cb) => {
  cb(null, true); // Accept the file
};

// Specify file format that can be saved
function pdfZipFileFilter(req, file, cb) {
  if (
    file.mimetype === "application/zip" ||
    file.mimetype === "application/pdf"
  ) {
    cb(null, true);
  } else {
    cb(new Error("Only PDF and ZIP files are allowed!"), false);
  }
}

const fileStore = multer.diskStorage({
  destination: (req, file, cb) => {
    // Set the destination folder for the uploads
    let fPath = "uploads/";
    let todayYYYYMMDD = formatDateYYDDMM(new Date());
    fPath += todayYYYYMMDD;
    if (!existsSync(fPath)) {
      mkdirSync(fPath);
    }
    cb(null, fPath);
  },
  filename: (req, file, cb) => {
    const { purchasing_doc_no } = req.body;
    if (purchasing_doc_no && typeof purchasing_doc_no === "string") {
      const uniqueSuffix = (BigInt(Date.now()) * 1000n + BigInt(Math.floor(performance.now() * 1000)));
      const lastParam = req.path.split("/").pop();

      let fileNameTypeName = fileNameType[lastParam] || "";
      let newFileName = uniqueSuffix + "-" + fileNameTypeName + "-";
      newFileName += purchasing_doc_no;
      const extension = path.extname(file.originalname)?.toLowerCase();
      newFileName += extension;
      cb(null, newFileName);
    } else {
      cb(new Error("PO number missing!!"), false);
    }
  },
});

const invoiceStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    let uploadPath = `uploads/${req.path.split("/").pop()}`;

    if (!existsSync(uploadPath)) {
      mkdirSync(uploadPath, { recursive: true });
    }

    cb(null, uploadPath);
  },

  filename: (req, file, cb) => {
    const uniqueSuffix =
      BigInt(Date.now()) * 1000n + BigInt(Math.floor(performance.now() * 1000));
    const lastParam = req.path.split("/").pop();

    let fileNameTypeName = lastParam || "";
    let newFileName = uniqueSuffix + "-" + fileNameTypeName;
    const extension = path.extname(file.originalname)?.toLowerCase();
    newFileName += extension;

    cb(null, newFileName);
  },
});

const uploadSinglePdf = multer({
  storage: invoiceStorage, //removing po number
  fileFilter: dynamicFileFilter,
  limits: { fileSize: 100 * 1000 * 1000 },
});

const dynamicallyUpload = multer({
  storage: fileStore,
  fileFilter: dynamicFileFilter,
  limits: { fileSize: 100 * 1000 * 1000 },
});

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads");
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now();
    cb(null, uniqueSuffix + "-" + file.originalname);
  },
});

// Specify file format that can be saved
function fileFilter(req, file, cb) {
  if (
    file.mimetype === "image/jpeg" ||
    file.mimetype === "image/jpg" ||
    file.mimetype === "image/png" ||
    file.mimetype === "image/pdf" ||
    file.mimetype === "application/pdf"
  ) {
    cb(null, true);
  } else {
    cb(new Error("Only jpeg, jpg, pdf and png files are allowed!"), false);
  }
}

function pdfFileFilter(req, file, cb) {
  if (file.mimetype === "application/pdf") {
    cb(null, true);
  } else {
    cb(new Error("Only PDF file is allowed!"), false);
  }
}

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 20 * 1000 * 1000 },
});

const excelFilter = (req, file, cb) => {
  if (
    file.mimetype.includes("excel") ||
    file.mimetype.includes("spreadsheetml")
  ) {
    cb(null, true);
  } else {
    cb("Please upload only excel file.", false);
  }
};

const uploadExcelFile = multer({
  storage: storage,
  excelFilter: excelFilter,
  limits: { fileSize: 20 * 1000 * 1000 },
});

const storageFile = multer.diskStorage({
  destination: (req, file, cb) => {
    // Set the destination folder for the uploads
    const basePath = "uploads/compliances/";
    const now = new Date();
    const todayYYYYMMDD = formatDateYYYYMM(now); // YYYYMM
    const day = formatDateDD(now); // DD
    const fPath = path.join(basePath, todayYYYYMMDD, day);

    if (!existsSync(fPath)) {
      mkdirSync(fPath, { recursive: true });
    }
    cb(null, fPath);
  },
  filename: (req, file, cb) => {
    const { type, ref } = req.body;

    if ((type && typeof type === "string") && (ref && typeof ref === "string")) {
      const uniqueSuffix = formatDateYYYYMMDDHHMMSSMS()
      let fileNameTypeName = type?.toUpperCase();
      let newFileName = uniqueSuffix + "-" + fileNameTypeName + "-";
      newFileName += ref;
      const extension = path.extname(file.originalname)?.toLowerCase();
      newFileName += extension;
      cb(null, newFileName);
    } else {
      cb(new Error("File upload error -- type, ref missing!!"), false);
    }
  },
});

const uploadPdfZipFile = multer({
  storage: storageFile,
  fileFilter: pdfZipFileFilter,
  limits: { fileSize: 8 * 1000 * 1000 }
});

const uploadExcelData = multer({
  storage: storageFile,
  excelFilter: excelFilter,
  limits: { fileSize: 20 * 1000 * 1000 },
});

const storageSDBG = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/sdbg");
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now();
    cb(null, uniqueSuffix + "-" + file.originalname);
  },
});

const uploadSDBGFile = multer({
  storage: storageSDBG,
  dest: "uploads/sdbg",
  fileFilter,
  limits: { fileSize: 20 * 1000 * 1000 },
});

const uploadTNCMinuts = multer({
  storage: fileStore,
  fileFilter: pdfFileFilter,
  limits: { fileSize: 20 * 1000 * 1000 },
});

const storageShippingDocs = multer.diskStorage({
  destination: (req, file, cb) => {
    // Set the destination folder for the uploads
    let fPath = `uploads/shippingDocuments`;
    if (!existsSync(fPath)) {
      mkdirSync(fPath);
    }
    cb(null, fPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now();
    const { purchasing_doc_no } = req.body;
    let fileName = uniqueSuffix + "-" + "SHIPPING" + "-";
    if (purchasing_doc_no) {
      fileName += purchasing_doc_no;
    }
    const originalName = file.originalname;
    const extension = path.extname(originalName);

    fileName += extension;
    cb(null, fileName);
  },
});
const shippingDocuemntsUpload = multer({
  storage: storageShippingDocs,
  fileFilter: pdfFileFilter,
  limits: { fileSize: 20 * 1000 * 1000 },
});

const todayDate = formatDateSync(new Date());
const storageUnsyncedData = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, `${OTHER_SERVER_DATA_PATH}/${todayDate}`);
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  },
});
function zipFileFilter(req, file, cb) {

  if (file.mimetype === "image/zip") {
    cb(null, true);
  } else {
    cb(new Error("Only zip file is allowed!"), false);
  }
}
const uploadUnsyncedData = multer({
  storage: storageUnsyncedData,
  dest: `${OTHER_SERVER_DATA_PATH}/${todayDate}`,
  zipFileFilter,
  limits: { fileSize: 20 * 1000 * 1000 },
});

const fileNameType = {
  submitSDBG: "SDBG",
  submitDrawing: "DRAWING",
  submitWdc: "WDC",
  submitILMS: "ILMS",
  sdoc: "SHIPPING",
  insertQapSave: "QAP",
  hrComplianceUpload: "HR",
  submitIRN: "IRN",
  mrs: "MRS",
  wmc: "WMC",
  vendorActivities: "VENACTIVITY",
  pf: "PF",
  voucher: "VOUCHER",
  qap: "QAP",
  BillsMaterialHybrid: "BTN",
  submitServiceHybrid: "BTN",
  submitIncorrectDuct: "BTN",
  "submit-adv-bill-against-bg": "BTN",
  pbg: "BTN",
  "submit-jcc": "BTN",
  insp: "INSPL",
  tncminutes: "TNC",
  submit: "DRAWING",
};

module.exports = {
  upload,
  uploadExcelFile,
  uploadSDBGFile,
  dynamicallyUpload,
  uploadTNCMinuts,
  shippingDocuemntsUpload,
  uploadUnsyncedData,
  uploadSinglePdf,
  fileStore,
  uploadExcelData,
  uploadPdfZipFile
};
