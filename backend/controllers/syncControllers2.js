/* eslint-disable no-undef */
const path = require("path");
const fs = require("fs");
const fsPromises = require("fs").promises; // Use async fs methods
const archiver = require("archiver");
const cron = require("node-cron");
const { synced_tables } = require("../config/configTable");
const { formatDateYYDDMM } = require("../utils/dateTime");
const { CSV_DATA_PATH, ZIP_DATA_PATH, INSERT, DATA_SYNC_CRON, UNZIP_DATA_PATH, OTHER_SERVER_DATA_PATH } = require("../lib/constant");
const { generateQuery, generateInsertUpdateQuery } = require("../lib/utils");
const { query, withTransaction, poolQuery } = require("../config/pgDbConfig");
const { BACKUP_START, RESTORE_START, BACKUP_SUCCESSFULL } = require("../lib/status");
const { cronLog } = require("../services/sync.serveices");
const { writeJsonToFile } = require("../utils/jsonFileWrite");
const AdmZip = require("adm-zip");
const { resSend } = require("../lib/resSend");
const SERVER_ENV = process.env.SERVER_ENV;

/**---------------------------------------------------------------------------
                    SYNC CONTROLLERS
 ----------------------------------------------------------------------------*/

const syncDataDownloadMain = async (todayDate) => {
  let resData = { isData: false };
  let currentTableName = "";
  const parentDir = path.resolve(__dirname, "..");
  const dirPath = path.join(parentDir, CSV_DATA_PATH, todayDate);

  try {
    // Transaction ensures that if file writing fails, the DB updates are rolled back
    await withTransaction(async (client) => {
      for (const tableName of synced_tables) {
        currentTableName = tableName;

        // 1. Atomically update the rows AND return them. 
        const updateQuery = `
          UPDATE ${tableName} 
          SET sync = true, sync_updated_at = now() 
          WHERE sync = false 
          RETURNING *;
        `;

        const rows = await poolQuery({ client, query: updateQuery, values: [] });

        // 2. Store in JSON file if there are modifications
        if (rows.length) {
          resData.isData = true;
          const filePath = path.join(dirPath, `${todayDate}-${SERVER_ENV}-${tableName}.json`);
          const { file_path, success } = await writeJsonToFile(tableName, rows, dirPath, filePath);
          console.log(`File path: ${file_path}, Success: ${success}`);

          if (!success) {
            // Throwing an error here automatically rolls back the PostgreSQL transaction!
            // The rows will revert to `sync = false` so they can be picked up next time.
            throw new Error(`Failed to write JSON to file for table: ${tableName}`);
          }
        }
        resData[tableName] = rows;
      }
    });
  } catch (error) {
    console.error(`Error in data sync download table: ${currentTableName} ${error.message}`);
    await insertToErrLog("GENERAL", null, error.message, error.stack);
    throw error; // Rethrow so the parent cron job knows it failed
  }

  return resData;
};

const syncCompressMain = async (filesReadDir, zipDir, zipFilePath) => {
  console.log("filesReadDir, zipDir, zipFilePath:", filesReadDir, zipDir, zipFilePath);

  try {
    // Check if the source directory exists
    await fsPromises.access(filesReadDir);
  } catch (err) {
    console.log("err", err);
    await insertToErrLog("GENERAL", null, "No source folder found for today's date", "");
    return;
  }

  // Read directory asynchronously and filter for FILES
  const files = await fsPromises.readdir(filesReadDir, { withFileTypes: true });
  const filesToZip = files.filter(dirent => dirent.isFile()).map(dirent => dirent.name);

  if (filesToZip.length === 0) {
    await insertToErrLog("GENERAL", null, "No files found to compress", "");
    return;
  }

  // Ensure download directory exists
  await fsPromises.mkdir(zipDir, { recursive: true });

  const output = fs.createWriteStream(zipFilePath);

  // Tip: Lowered to level 5 to prevent high CPU usage/blocking the event loop
  const archive = archiver("zip", { zlib: { level: 5 } });

  return new Promise((resolve, reject) => {
    output.on("close", () => {
      console.log(`Archive finalized. Total bytes: ${archive.pointer()}`);
      resolve(zipFilePath);
    });

    archive.on("warning", (err) => {
      if (err.code === "ENOENT") console.warn(err);
      else reject(err);
    });

    archive.on("error", (err) => reject(err));

    archive.pipe(output);

    // FIX APPLIED HERE: Loop through files and append them properly
    filesToZip.forEach((fileName) => {
      // Look in the SOURCE directory (filesReadDir), not the destination directory
      const filePath = path.join(filesReadDir, fileName);

      // Use archive.file() because we are appending files, not directories
      archive.file(filePath, { name: fileName });
    });

    archive.finalize();
  });
};

exports.syncDataDownloadCorn = async () => {
  cron.schedule("30 22 * * *", async () => {

    try {
      const todayDate = formatDateYYDDMM(new Date());
      console.log("Sync Data Download Cron job started...", todayDate);

      /** CRON START LOG */
      await cronLog(DATA_SYNC_CRON, new Date().toISOString(), BACKUP_START, "backup started", null, null);
      /** SYNC FILES CREATE */
      const res = await syncDataDownloadMain(todayDate);
      console.log("res-----------------------", res);

      if (!res.isData) {
        console.log("no data for sync");
        return;
      }

      /** SYNC FILES ZIPPED */
      const parentDir = path.resolve(__dirname, "..");
      const zipDir = path.join(parentDir, ZIP_DATA_PATH, todayDate);
      const csvDataDir = path.join(parentDir, CSV_DATA_PATH, todayDate);
      const zipDataFilePath = path.join(zipDir, `${todayDate}-${SERVER_ENV}-sync_data.zip`);

      const result = await syncCompressMain(csvDataDir, zipDir, zipDataFilePath)
      console.log("result", result);

      await cronLog(DATA_SYNC_CRON, new Date().toISOString(), BACKUP_SUCCESSFULL, "backup completed", null, null);
      console.log("Cron job completed successfully");

    } catch (error) {
      console.error("Error during cron job:", error.message);

      // Use async append for the error log fallback
      await fsPromises.appendFile("error.log", `${new Date().toISOString()} - Error: ${error.message}\n`);
    }
  });
};

const insertToErrLog = async (tableName, sync_id, msg, stack) => {
  try {
    const { q, val } = generateQuery(INSERT, "sync_error_logs", {
      table_name: tableName,
      sync_id,
      error_message: msg,
      error_stack: stack,
      created_at: new Date()
    });
    await query({ query: q, values: val });
  } catch (err) {
    console.error("Failed to write to error log:", err.message);
  }
};

// ------------------------------------server 2 code ---------------------------

function getTableName(fileName) {
  const tName = path.basename(fileName.split("-").slice(2).join("_"), ".json");
  return tName;
}

const syncDataUpload2 = async (currentDate) => {
  return withTransaction(async (client) => {
    const failedItems = [];
    const failedTables = [];
    const tableSummary = [];

    const parentDir = path.resolve(__dirname, "..");
    const folderPath = path.join(parentDir, UNZIP_DATA_PATH, currentDate);

    const tableFolders = fs
      .readdirSync(folderPath)
      .filter((file) =>
        fs.lstatSync(path.join(folderPath, file)).isFile()
      );

    for (const fName of tableFolders) {
      const tableName = getTableName(fName);
      const savepoint = `sp_${tableName.replace(/[^a-zA-Z0-9_]/g, "_")}`;

      // SERVER_ENV change later

      const syncDataPath = path.join(folderPath, `${currentDate}-${SERVER_ENV}-${tableName}.json`);

      if (!fs.existsSync(syncDataPath)) continue;

      delete require.cache[require.resolve(syncDataPath)];
      const rData = require(syncDataPath);

      let processed = 0;
      let success = 0;
      let failed = 0;

      try {
        await poolQuery({ client, query: `SAVEPOINT ${savepoint}` });

        for (const item of rData) {
          processed++;
          let q = null;
          let val = null;

          try {
            if (tableName === "zpo_milestone") {
              await poolQuery({
                client,
                query: `DELETE FROM zpo_milestone WHERE ebeln = $1`,
                values: [item.EBELN || item.ebeln],
              });
            }

            const enrichedItem = {
              ...item,
              sync: true,
            };

            // insert update query , dependig on sync_id
            const result = await generateInsertUpdateQuery(
              enrichedItem,
              tableName,
              ["sync_id"]
            );

            q = result.q;
            val = result.val;

            await poolQuery({ client, query: q, values: val });
            success++;
          } catch (rowError) {
            failed++;

            failedItems.push({
              table: tableName,
              sync_id: item.sync_id,
              query: q,
              values: val,
              error: rowError.message,
            });

            insertToErrLog(
              tableName,
              item.sync_id,
              rowError.message,
              rowError.stack
            );
          }
        }

        // total records in table AFTER sync
        const totalCountRes = await poolQuery({
          client,
          query: `SELECT COUNT(*)::int AS count FROM ${tableName}`,
          values: [],
        });

        tableSummary.push({
          table: tableName,
          json_count: rData.length,
          processed_count: processed,
          success_count: success,
          failed_count: failed,
          total_records: totalCountRes[0]?.count || 0,
          has_error: failed > 0,
        });

        await poolQuery({ client, query: `RELEASE SAVEPOINT ${savepoint}` });
      } catch (tableError) {
        failedTables.push({ table: tableName, error: tableError.message });

        await poolQuery({
          client,
          query: `ROLLBACK TO SAVEPOINT ${savepoint}`,
        });

        tableSummary.push({
          table: tableName,
          json_count: rData.length,
          processed_count: 0,
          success_count: 0,
          failed_count: rData.length,
          total_records: null,
          has_error: true,
        });
      }
    }

    return {
      sta: failedTables.length === 0,
      msg:
        failedTables.length === 0
          ? "Sync completed successfully"
          : "Sync completed with errors",
      summary: tableSummary,
      failedTables,
      failedItems,
    };
  });
};

exports.syncUnzip2 = async (req, res) => {
  const logError = async (msg, stack = null) => {
    await syncLog("data", new Date(), RESTORE_ERROR, msg, stack, null);
  };

  try {
    const { from_date } = req.body;

    if (!from_date) {
      return resSend(res, false, 400, "Date field is required.", { from_date });
    }

    const currentDate = formatDateYYDDMM(new Date(from_date));
    const parentDir = path.resolve(__dirname, "..");
    const outputDir = path.join(parentDir, UNZIP_DATA_PATH, currentDate);
    const zipDataPath = path.join(parentDir, OTHER_SERVER_DATA_PATH, currentDate);
    const zipFilePath = path.join(zipDataPath, `${currentDate}-${SERVER_ENV}-sync_data.zip`);

    // Ensure unzip output directory
    fs.mkdirSync(outputDir, { recursive: true });

    // Validate zip source folder
    if (!fs.existsSync(zipDataPath)) {
      return resSend(res, false, 200, `No zip file found for date ${currentDate}`, null);
    }

    // Validate zip file
    try {
      await fs.promises.access(zipFilePath, fs.constants.F_OK);
    } catch {
      return resSend(res, false, 200, `sync_data.zip not found for date ${currentDate}`, null);
    }

    await cronLog("data", new Date(), RESTORE_START, `Data restore started for ${currentDate}`, null, null);

    // Unzip
    try {
      const zip = new AdmZip(zipFilePath);
      zip.extractAllTo(outputDir, true);
    } catch (unzipError) {
      await logError(`Unzip failed for ${currentDate}`, unzipError.stack);
      return resSend(res, false, 500, "Unzip process failed", null);
    }

    // Sync data
    let syncResult;
    try {
      syncResult = await syncDataUpload2(currentDate);
    } catch (syncError) {
      await logError(`Data sync failed for ${currentDate}`, syncError.stack);
      return resSend(res, false, 500, syncError.message, syncResult);
    }

    // Final logging + response
    if (!syncResult.sta) {
      await cronLog("data", new Date(), RESTORE_ERROR, `Sync completed with errors for ${currentDate}`, JSON.stringify(syncResult.failedTables), null);

      return resSend(res, false, 200, "Sync completed with errors", {
        date: currentDate,
        summary: syncResult.summary,
        failedTables: syncResult.failedTables,
      });
    }

    await cronLog("data", new Date(), RESTORE_SUCCESSFULL, `Data restore successful for ${currentDate}`, null, null);

    return resSend(res, true, 200, "Data synced successfully!", { date: currentDate, summary: syncResult.summary, });
  } catch (err) {
    console.error("Unexpected syncUnzip error:", err);

    await cronLog("data", new Date(), RESTORE_ERROR, err.message, err.stack, null);

    resSend(res, false, 500, "Unexpected error occurred while syncing data", null, null);
  }
};