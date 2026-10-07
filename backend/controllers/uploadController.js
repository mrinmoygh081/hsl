/* eslint-disable no-undef */
const { getQuery, query } = require("../config/pgDbConfig");
const { INSERT } = require("../lib/constant");
const { TNC_MINUTE_UPLOAD } = require("../lib/event");
const { resSend } = require("../lib/resSend");
const { TNC_MINUTES } = require("../lib/tableName");
const { getEpochTime, generateQuery } = require("../lib/utils");
const { sendMail } = require("../services/mail.services");
const fs = require("fs");
const path = require("path");
const Busboy = require("busboy");
const { formatDateYYYYMMDDHHMMSSMS } = require("../utils/dateTime");
const Message = require("../utils/messages");
const { execFile } = require("child_process"); // To run virus scanner

const uploadImage = (req, res) => {
  // Handle Image Upload
  let fileData = {};
  if (req.file) {
    fileData = {
      fileName: req.file.filename,
      filePath: req.file.path,
      fileType: req.file.mimetype,
      fileSize: req.file.size,
    };
    resSend(res, true, 200, "file uploaded!", fileData, null);
  } else {
    resSend(res, false, 200, "Please upload a valid image", fileData, null);
  }
};

const updoadExcelFileController = async (req, res) => {
  try {
    let fileData = {};
    let tokenData = req.tokenData;
    const id = "FILE" + new Date().getTime();
    if (req.file) {
      fileData = {
        fileName: req.file.filename,
        filePath: req.file.path,
        fileType: req.file.mimetype,
        fileSize: req.file.size,
        id,
      };
      const filePayload = {
        id,
        file_name: req.file.filename,
        file_path: req.file.path,
        used: "Y",
        created_at: new Date().getTime(),
        created_by: tokenData.vendor_code,
      };
      const { q, val } = generateQuery(INSERT, "files", filePayload);
      await query({ query: q, values: val });
      resSend(res, true, 200, "file uploaded!", fileData, null);
    } else {
      resSend(res, false, 200, "Please upload a valid Excel File", fileData, null);
    }
  } catch (err) {
    console.error(err.message);
    resSend(res, false, 200, "Please upload a valid Excel File", err.message, null);
  }
};

const updoadPdfFileController = async (req, res) => {
  try {
    let fileData = {};
    let tokenData = req.tokenData;
    const id = "FILE" + new Date().getTime();
    if (req.file) {
      fileData = {
        fileName: req.file.filename,
        filePath: req.file.path,
        fileType: req.file.mimetype,
        fileSize: req.file.size,
        id,
      };
      const filePayload = {
        id,
        file_name: req.file.filename,
        file_path: req.file.path,
        used: "Y",
        created_at: new Date().getTime(),
        created_by: tokenData.vendor_code,
      };

      const { q, val } = generateQuery(INSERT, "files", filePayload);
      await query({ query: q, values: val });
      resSend(res, true, 200, "file uploaded!", fileData, null);
    } else {
      resSend(res, false, 200, "Please upload a valid file", fileData, null);
    }
  } catch (err) {
    console.error(err.message);
    resSend(res, false, 200, err.message, "Please upload a valid File", null);
  }
};

const uploadTNCMinuts = async (req, res) => {
  // Handle Image Upload
  let fileData = {};
  const tokenData = { ...req.tokenData };

  if (!req.body.purchasing_doc_no) {
    return resSend(res, true, 200, "Please send purchasing_doc_no !!.", null, null);
  }

  if (req.file) {
    fileData = {
      fileName: req.file.filename,
      filePath: req.file.path,
      fileType: req.file.mimetype,
      fileSize: req.file.size,
    };

    const payload = {
      file_name: req.file.filename,
      file_path: req.file.path,
      file_type: req.file.mimetype,
      created_by_id: tokenData.vendor_code,
      created_at: getEpochTime(),
      purchasing_doc_no: req.body.purchasing_doc_no,
    };

    const { q, val } = generateQuery(INSERT, TNC_MINUTES, payload);
    const result = await getQuery({ query: q, values: val });
    handelMail(payload);
    resSend(res, true, 200, "file uploaded!", fileData, result);
  } else {
    resSend(res, false, 400, "Please upload a valid image", fileData, null);
  }
};

async function handelMail(payload) {

  await sendMail(TNC_MINUTE_UPLOAD, payload, {}, TNC_MINUTE_UPLOAD);
}

// 1. Safe Upload Directory (Outside your source code)
const UPLOAD_ROOT = path.resolve(__dirname, "../../uploads");
const STORE_UPLOAD_ROOT = path.resolve(__dirname, "../uploads");
const QUARANTINE_DIR = path.join(UPLOAD_ROOT, "tempfiles");

// Ensure Quarantine Exists
if (!fs.existsSync(QUARANTINE_DIR)) fs.mkdirSync(QUARANTINE_DIR, { recursive: true });

// --- HELPER 1: QPDF SANITIZER ---
const sanitizePdf = (inputPath, outputPath) => {
  return new Promise((resolve, reject) => {
    // --warning-exit-0: Treats warnings as success
    // --replace-input: This would overwrite, but we use explicit output for safety
    execFile('qpdf', ['--warning-exit-0', inputPath, outputPath], (error, stdout, stderr) => {
      if (error) {
        console.error("❌ QPDF Failed:", stderr);
        return reject(new Error("PDF Integrity Check Failed. File is malformed."));
      }
      resolve(true);
    });
  });
};

// --- HELPER 2: VIRUS SCANNER ---
const scanFileForVirus = (filePath) => {
  return new Promise((resolve, reject) => {
    // Change 'clamdscan' to 'clamscan' if you don't have the daemon running
    execFile('clamdscan', ['--fdpass', filePath], (error, stdout, stderr) => {
      if (error) {
        if (error.code === 1) return reject(new Error("VIRUS DETECTED!"));
        return reject(new Error("Virus scan failed to execute."));
      }
      resolve(true);
    });
  });
};

// --- MAIN CONTROLLER ---
const uploaFileStreamController = async (req, res) => {
  try {
    const tokenData = req.tokenData;
    const busboy = Busboy({
      headers: req.headers,
      limits: { fileSize: 100 * 1000 * 1000 }, // 100MB
    });

    let fileUploaded = false;
    let uploadProgress = 0;
    let fileSize = 0;
    let filePath = "";
    let fileName = "";
    let fileType = "";
    let rawFileName = "";

    const formFields = { type: "", ref: "" };

    busboy.on("field", (fieldname, val) => {
      if (fieldname === "type") formFields.type = val;
      if (fieldname === "ref") formFields.ref = val;
    });

    // eslint-disable-next-line no-unused-vars
    busboy.on("file", (fieldname, file, filename, encoding, mimetype) => {
      if (fileUploaded) {
        resSend(res, false, 400, "Multiple file uploads not allowed.", null, null);
        file.resume(); // discard extra files
        return;
      }

      fileUploaded = true;
      rawFileName = filename.filename;
      fileType = filename.mimeType;

      if (!rawFileName || typeof rawFileName !== "string") {
        return resSend(res, false, 400, "Invalid file name", null, null);
      }

      // Allowed mime types
      const allowedMimeTypes = ["application/pdf", "application/zip"];
      if (!allowedMimeTypes.includes(fileType)) {
        return resSend(res, false, 415, "Unsupported file type", null, null);
      }

      const formattedDateTime = formatDateYYYYMMDDHHMMSSMS();
      const cleanType = String(formFields.type || "").replace(/\s+/g, "_");
      const cleanRef = String(formFields.ref || "").replace(/\s+/g, "_");

      const todayYYYYMMDD = formatDateYYDDMM(new Date());
      const releventDir = path.join("..", "uploads", todayYYYYMMDD);
      const uploadDir = path.join(__dirname, releventDir);

      // Ensure folder exists safely
      fs.mkdirSync(uploadDir, { recursive: true });

      fileName = `${formattedDateTime}-${cleanType}-${cleanRef}${path.extname(rawFileName)}`;
      filePath = path.join(uploadDir, fileName);
      const responsePath = path.join("uploads", todayYYYYMMDD, fileName);

      const writeStream = fs.createWriteStream(filePath);
      file.pipe(writeStream);

      file.on("data", (chunk) => {
        uploadProgress += chunk.length;
      });

      file.on("limit", () => {
        resSend(res, false, 413, "File too large. Max 100MB.", null, null);
      });

      file.on("end", async () => {
        try {
          fileSize = uploadProgress;
          const fileAckData = {
            fileName,
            filePath: responsePath,
            fileType,
            fileSize,
            originalName: rawFileName,
          };
          const id = await fileAcknowledgementSave(tokenData, { ...fileAckData, formattedDateTime });
          console.log("✅ File uploaded and saved successfully.");
          resSend(res, true, 200, Message.FILE_UPLOAD_SUCCESSFULLY, { id, ...fileAckData }, null);
        } catch (error) {
          console.error("❌ DB Insert Error:", error);
          resSend(res, false, 500, error.message, Message.SERVER_ERROR, null);
        }
      });
    });

    busboy.on("finish", () => {
      if (!fileUploaded) {
        return resSend(res, false, 400, "No file uploaded", null, null);
      }
    });

    busboy.on("error", (err) => {
      console.error("❌ Busboy error:", err);
      resSend(res, false, 500, "Error processing file", null, null);
    });

    req.pipe(busboy);
  } catch (err) {
    console.error("❌ Unexpected server error:", err);
    resSend(res, false, 500, "Unexpected server error", null, null);
  }
};

const fileAcknowledgementSave = async (tokenData, filePayload) => {
  try {
    const sInfo = process.env.SERVER_ENV || "DEFAULT";

    const payload = {
      id: "F" + sInfo + filePayload.formattedDateTime,
      file_name: filePayload.fileName,
      file_path: filePayload.filePath,
      used: "Y",
      created_at: Date.now(),
      created_by: tokenData.vendor_code,
    };
    const { q, val } = generateQuery(INSERT, "files", payload);
    await query({ query: q, values: val });
    return payload.id;
  } catch (err) {
    console.error("❌ DB Insert Error:", err);
    throw err;
  }
};

function formatDateYYDDMM(date) {
  const day = String(date.getDate()).padStart(2, "0"); // Ensures two-digit day
  const month = String(date.getMonth() + 1).padStart(2, "0"); // Ensures two-digit month
  const year = date.getFullYear();
  return `${year}${month}${day}`;
}

module.exports = { uploadImage, updoadExcelFileController, uploadTNCMinuts, updoadPdfFileController, uploaFileStreamController };