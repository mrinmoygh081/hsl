const multer = require("multer");
const { fileStore } = require("../lib/fileUpload");

const pdfFileFilter = (req, file, cb) => {
  if (file.mimetype === "application/pdf") {
    cb(null, true);
  } else {
    cb(new Error("Only PDF file is allowed!"), false);
  }
};

const uploadWDCs = multer({
  storage: fileStore,
  pdfFileFilter,
  limits: { fileSize: 20 * 1000 * 1000 },
});

exports.wdcmw = () => {
  return uploadWDCs.fields([
    { name: "file_inspection_note_ref_no", maxCount: 1 },
    { name: "file_hinderence_report_cerified_by_berth", maxCount: 1 },
    { name: "file_attendance_report", maxCount: 1 },
  ]);
};

