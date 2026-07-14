const fs = require("fs");
const path = require("path");
const Busboy = require("busboy");
const { execFile } = require("child_process");
const unzipper = require("unzipper");
const { resSend } = require("../lib/resSend");
const { formatDateYYYYMMDDHHMMSSMS, formatDateYYYYMM, formatDateDD } = require("../utils/dateTime");
const { generateQuery } = require("../lib/utils");
const { query } = require("../config/pgDbConfig");
const { INSERT } = require("../lib/constant");
const Message = require("../utils/messages");

// --- CONFIGURATION ---
// eslint-disable-next-line no-undef
const UPLOAD_ROOT = path.resolve(__dirname, "../../uploads");
// eslint-disable-next-line no-undef
const STORE_UPLOAD_ROOT = path.resolve(__dirname, "../uploads");
const QUARANTINE_DIR = path.join(UPLOAD_ROOT, "tempfiles");

// Ensure Quarantine Exists
if (!fs.existsSync(QUARANTINE_DIR)) fs.mkdirSync(QUARANTINE_DIR, { recursive: true });

// --- HELPER 1: QPDF SANITIZER ---
const sanitizePdf = (inputPath, outputPath) => {
    return new Promise((resolve, reject) => {
        execFile('qpdf', ['--warning-exit-0', inputPath, outputPath], (error, stdout, stderr) => {
            if (error) {
                console.error("❌ QPDF Failed:", stderr);
                return reject(new Error("PDF Integrity Check Failed. File is malformed."));
            }
            resolve(true);
        });
    });
};

// --- HELPER 2: PDF ACTIVE CONTENT CHECKER (Stop JS Attacks) ---
// const hasActivePdfContent = (filePath) => {
//     // Read file as string (Max 5MB limit makes this safe)
//     const data = fs.readFileSync(filePath, 'utf8').toLowerCase();
//     const blocked = [
//         "/javascript",
//         "/js",
//         "/openaction",
//         "/aa",   // Additional Actions
//         "/launch",
//         "/embeddedfiles",
//         "/richmedia"
//     ];
//     return blocked.some(k => data.includes(k));
// };

// Smarter check (Use only if absolutely required)
const hasActivePdfContent = (filePath) => {
    const data = fs.readFileSync(filePath, 'utf8'); // Don't lowercase yet
    // Regex looks for /JavaScript or /JS preceded by a non-word char (to avoid matching "myjavascript.txt")
    // eslint-disable-next-line no-useless-escape
    const dangerousPattern = /[\s\/<](JavaScript|JS|OpenAction|Launch)[\s\/]/i;
    return dangerousPattern.test(data);
};

// --- HELPER 3: ZIP CONTENT INSPECTOR (Stop ZIP Bombs / Exes) ---
const validateZipContents = async (zipPath) => {
    try {
        const directory = await unzipper.Open.file(zipPath);
        // Allowed extensions INSIDE the zip
        const allowed = ['.pdf', '.png', '.jpg', '.jpeg', '.docx', '.xlsx'];
        let totalSize = 0;

        for (const file of directory.files) {
            // 1. Prevent Zip Slip (Path Traversal)
            if (file.path.includes("..")) return false;

            // 2. Check extensions inside zip
            const ext = path.extname(file.path).toLowerCase();
            if (!allowed.includes(ext)) return false;

            // 3. Prevent Zip Bombs (Max 20MB extracted size)
            totalSize += file.uncompressedSize;
            if (totalSize > 20 * 1024 * 1024) return false;
        }
        return true;
    } catch (e) {
        console.error("Zip Validation Error:", e);
        return false; // Fail safe
    }
};

// --- HELPER 4: VIRUS SCANNER ---
// eslint-disable-next-line no-unused-vars
const scanFileForVirus = (filePath) => {
    return new Promise((resolve, reject) => {
        // Ensure you have ClamAV installed: sudo apt-get install clamav clamav-daemon
        // eslint-disable-next-line no-unused-vars
        execFile('clamdscan', ['--fdpass', filePath], (error, stdout, stderr) => {
            if (error) {
                if (error.code === 1) return reject(new Error("VIRUS DETECTED!"));
                return reject(new Error("Virus scan failed to execute."));
            }
            resolve(true);
        });
    });
};

// --- HELPER 5: hasEmbeddedFiles ---
const hasEmbeddedFiles = (filePath) => {
    const data = fs.readFileSync(filePath, 'binary').toLowerCase();
    return data.includes('/embeddedfiles') || data.includes('/filespec');
};

// --- MAIN CONTROLLER ---
const uploaFileStreamController2 = async (req, res) => {
    try {
        // ✅ 1. Dynamic Import for ESM module
        const { fileTypeFromStream } = await import("file-type");

        const busboy = Busboy({
            headers: req.headers,
            limits: { fileSize: 5 * 1024 * 1024 }, // 5MB Limit
        });

        let fileUploaded = false;
        let tempFilePath = "";
        const formFields = { type: "", ref: "" };

        busboy.on("field", (fieldname, val) => {
            if (fieldname === "type") formFields.type = val;
            if (fieldname === "ref") formFields.ref = val;
        });

        busboy.on("file", async (fieldname, file, info) => {
            const { filename } = info;

            if (fileUploaded) {
                file.resume();
                return resSend(res, false, 400, "Multiple files not allowed.");
            }
            fileUploaded = true;

            // ✅ 2. Quarantine: Write to temporary path
            const randomName = `temp_${Date.now()}_${Math.random().toString(36).substring(7)}`;
            tempFilePath = path.join(QUARANTINE_DIR, randomName);

            const writeStream = fs.createWriteStream(tempFilePath);

            file.on("error", (err) => {
                if (fs.existsSync(tempFilePath)) fs.unlink(tempFilePath, () => { });
                console.error("error", err);
                resSend(res, false, 500, "Upload stream failed.");
            });

            file.pipe(writeStream);

            writeStream.on("finish", async () => {
                try {
                    // ✅ 3. Security Check: Magic Bytes
                    const fileStream = fs.createReadStream(tempFilePath);
                    const realType = await fileTypeFromStream(fileStream);
                    fileStream.destroy();

                    // GAP 3 FIX: Strict MIME checking
                    const allowedMime = {
                        pdf: 'application/pdf',
                        zip: ['application/zip', 'application/x-zip-compressed']
                    };
                    const allowedExtensions = ['pdf', 'zip'];

                    // Check if extension is allowed AND matches the correct MIME type
                    const isValidType = realType && allowedExtensions.includes(realType.ext) && (
                        realType.ext === 'pdf'
                            ? realType.mime === allowedMime.pdf
                            : allowedMime.zip.includes(realType.mime)
                    );

                    if (!isValidType) {
                        throw new Error("SECURITY_RISK: Mime-type mismatch or forbidden file.");
                    }

                    // ✅ 4. Security Check: Virus Scan (Uncomment when ClamAV is ready)
                    // await scanFileForVirus(tempFilePath);

                    // ✅ 5. Extension Specific Security Logic
                    if (realType.ext === 'pdf') {
                        // CHECK EMBADED FILES
                        if (hasEmbeddedFiles(tempFilePath)) {
                            throw new Error("SECURITY_RISK: Embedded files not allowed in PDF");
                        }
                        // GAP 2 FIX: Check for malicious JS keywords
                        if (hasActivePdfContent(tempFilePath)) {
                            throw new Error("SECURITY_RISK: Active PDF content (JS/Actions) detected.");
                        }

                        const cleanPdfPath = tempFilePath + "_clean";
                        // Sanitize Structure with QPDF
                        // console.log("tempFilePath, cleanPdfPath", tempFilePath, cleanPdfPath);

                        await sanitizePdf(tempFilePath, cleanPdfPath);

                        // Swap Files
                        fs.unlinkSync(tempFilePath);
                        if (!fs.existsSync(cleanPdfPath)) fs.mkdirSync(cleanPdfPath, { recursive: true });
                        fs.renameSync(cleanPdfPath, tempFilePath);
                    }
                    else if (realType.ext === 'zip') {
                        // GAP 1 & 4 FIX: Check Zip Contents & Size
                        const isZipSafe = await validateZipContents(tempFilePath);
                        if (!isZipSafe) {
                            throw new Error("SECURITY_RISK: Zip contains forbidden files or is too large.");
                        }
                    }

                    // ✅ 6. Final Move: To Permanent Storage
                    const todayYYYYMMDD = formatDateYYDDMM(new Date());
                    let finalDir = path.join(STORE_UPLOAD_ROOT, todayYYYYMMDD);



                    let cleanType = (formFields.type || "doc").replace(/[^a-zA-Z0-9]/g, "_");
                    const cleanRef = (formFields.ref || "gen").replace(/[^a-zA-Z0-9]/g, "_");
                    // FOR ONLY FOR HR COMPLIANCE

                    let hrReleventPath = "";

                    console.log("cleanType", cleanType);
                    if (cleanType == 'hr' || cleanType == 'HR') {
                        cleanType = cleanType.toLocaleUpperCase();
                        const basePath = "compliances";
                        const now = new Date();
                        const todayYYYYMMDD = formatDateYYYYMM(now); // YYYYMM
                        const day = formatDateDD(now); // DD
                        finalDir = path.join(STORE_UPLOAD_ROOT, basePath, todayYYYYMMDD, day);
                        hrReleventPath = path.join("uploads", "compliances", todayYYYYMMDD, day);
                    }
                    console.log("finalDirfinalDirfinalDir", finalDir);
                    if (!fs.existsSync(finalDir)) fs.mkdirSync(finalDir, { recursive: true });

                    const finalFileName = `${formatDateYYYYMMDDHHMMSSMS()}-${cleanType}-${cleanRef}.${realType.ext}`;
                    const finalPath = path.join(finalDir, finalFileName);

                    fs.renameSync(tempFilePath, finalPath);
                    let releventPath = path.join("uploads", todayYYYYMMDD, finalFileName);

                    if (cleanType == 'hr' || cleanType == 'HR') {
                        releventPath = path.join(hrReleventPath, finalFileName)
                    }

                    // ✅ 7. DB Save
                    const fileAckData = {
                        fileName: finalFileName,
                        filePath: releventPath,
                        fileType: realType.mime,
                        fileSize: fs.statSync(finalPath).size,
                        originalName: filename
                    };

                    const { id } = await fileAcknowledgementSave(req.tokenData, { ...fileAckData, formattedDateTime: formatDateYYYYMMDDHHMMSSMS() });
                    // file ID ATTACHED 


                    resSend(res, true, 200, "File uploaded securely.", { id, ...fileAckData });

                } catch (err) {
                    // CLEANUP ON FAILURE
                    if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
                    if (fs.existsSync(tempFilePath + "_clean")) fs.unlinkSync(tempFilePath + "_clean");

                    console.error("Security Check Failed:", err.message, err);
                    resSend(res, false, 200, `${Message.FILE_UPLOAD_SECURITY_FAIL_MSG} [ERROR]  ${err.message}`);
                }
            });
        });

        req.pipe(busboy);

    } catch (error) {
        console.error("uploaFileStreamController Error:", error);
        resSend(res, false, 500, Message.SOMTHING_WENT_WRONG);
    }
};

const fileAcknowledgementSave = async (tokenData, filePayload) => {
    try {
        // eslint-disable-next-line no-undef
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
        return payload
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


module.exports = { uploaFileStreamController2 }
