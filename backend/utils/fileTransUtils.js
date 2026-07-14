/* eslint-disable no-undef */
const fs = require("fs").promises;
const path = require("path");
const cron = require("node-cron");
const { existsSync } = require("fs");
const { LAN_SERVER } = require("../lib/constant");

const pymtFileTransController = async () => {
  const directoryPath = path.join(__dirname, "../uploads/paymentadvice");
  try {
    const entries = await fs.readdir(directoryPath, { withFileTypes: true });
    const pdfFiles = entries
      .filter(
        (entry) =>
          entry.isFile() && path.extname(entry.name).toLowerCase() === ".pdf"
      )
      .map((entry) => entry.name);

    for (const fileName of pdfFiles) {
      const folderName = fileName.substring(0, 8);
      const folderPath = path.join(directoryPath, folderName);
      const oldFilePath = path.join(directoryPath, fileName);
      const newFilePath = path.join(folderPath, fileName);


      // Create the folder if it doesn't exist
      try {
        await fs.mkdir(folderPath, { recursive: true });
      } catch (err) {
        console.error(`Error creating folder: ${folderPath}, ${err.message}`);
      }
      try {
        await fs.rename(oldFilePath, newFilePath);

      } catch (err) {
        console.error(`Error moving file: ${fileName}, ${err.message}`);
      }
    }
  } catch (err) {
    console.error(`Error reading directory: ${err.message}`);
  }
};



const icgrnFileTransController = async () => {
  const icgrnDirectoryPath = path.join(__dirname, "../uploads/icgrnremarks");
  try {
    const entries = await fs.readdir(icgrnDirectoryPath, { withFileTypes: true });
    const pdfFiles = entries
      .filter(
        (entry) =>
          entry.isFile() && path.extname(entry.name).toLowerCase() === ".pdf"
      )
      .map((entry) => entry.name);

    for (const fileName of pdfFiles) {
      let tempFileName = fileName?.split("_");
      const newFolderName = tempFileName[0] || "INVALID_DATE";
      const newFileName = tempFileName[1] || "INVALID_FILE";
      const folderPath = path.join(icgrnDirectoryPath, newFolderName);
      const oldFilePath = path.join(icgrnDirectoryPath, fileName);
      const newFilePath = path.join(folderPath, newFileName);
      try {
        if (!existsSync(folderPath)) {
          await fs.mkdir(folderPath, { recursive: true });
        }
      } catch (err) {
        console.error(`Error creating folder: ${folderPath}, ${err.message}`);
      }
      // Move the file to the folder
      try {
        await fs.rename(oldFilePath, newFilePath);

      } catch (err) {
        console.error(`Error moving file: ${fileName}, ${err.message}`);
      }
    }
  } catch (err) {
    console.error(`Error reading directory: ${err.message}`);
  }
};

exports.pymtFileTrans = async () => {
  if (process.env.SERVER_ENV != LAN_SERVER) return;
  cron.schedule(
    "* * * * *",
    () => {
      icgrnFileTransController();
      pymtFileTransController();
    },
    {
      scheduled: true,
    }
  );
};
