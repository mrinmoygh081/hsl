/* eslint-disable no-undef */
const path = require("path");
const fsPromises = require("fs").promises;
const fs = require("fs");
const AdmZip = require("adm-zip");
const { OTHER_SERVER_DATA_PATH, LAN_SERVER, NIC_SERVER } = require("../lib/constant");
const { formatDateYYDDMM } = require("../utils/dateTime");
const { poolQuery, withTransaction } = require("../config/pgDbConfig");
const { generateBulkUpsertQuery } = require("../lib/utils");
const { UNZIP_DATA_PATH } = require("../lib/constant");
const { RESTORE_START, RESTORE_SUCCESSFULL, RESTORE_ERROR } = require("../lib/status");
const { cronLog } = require("../services/sync.serveices");
const { resSend } = require("../lib/resSend");
const SERVER_ENV = process.env.SERVER_ENV;
const SYNC_SERVER_ENV = SERVER_ENV === LAN_SERVER ? NIC_SERVER : LAN_SERVER;


/**
 * Safely extracts the table name from the hyphenated file format.
 */
const getTableName = (fileName) => {
  const cleanName = path.basename(fileName, ".json");
  const parts = cleanName.split("-");
  return parts.length >= 3 ? parts.slice(2).join("-") : null;
};

/**
 * Checks if a file exists asynchronously without blocking the CPU.
 */
const checkFileExists = async (filePath) => {
  try {
    await fsPromises.access(filePath, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
};

/**
 * Reads and parses a JSON file asynchronously.
 */
const readJsonFile = async (filePath) => {
  const fileContent = await fsPromises.readFile(filePath, "utf-8");
  return JSON.parse(fileContent);
};


/**
 * Convert json file name to table name
 * @param {*} files 
 * @returns 
 */
function fileNamesToTableNamesConvert(files) {
  if (Array.isArray(files)) {
    return files.filter((f) => f.isFile()).map((f) => getTableName(f.name));
  }
  return [];
}

/**
 * Asynchronously extracts a ZIP file to a target directory.
 */
const extractZipAsync = async (zipFilePath, outputDir) => {
  return new Promise((resolve, reject) => {
    try {
      const zip = new AdmZip(zipFilePath);
      zip.extractAllToAsync(outputDir, true, (err) => {
        if (err) reject(err);
        else resolve();
      });
    } catch (error) {
      // Catches synchronous errors if the zip file is completely corrupted
      reject(error);
    }
  });
};

/**
 * SYNC DATA TO ONE SERVER TO ANOTHER SERVER
 * @param {*} req 
 * @param {*} res 
 * @returns 
 */
exports.syncUnzip3 = async (req, res) => {
  const logError = async (msg, stack = null) => {
    await cronLog("data", new Date(), RESTORE_ERROR, msg, stack, null);
  };

  try {
    // SYNC DATE
    const { from_date } = req.body;

    if (!from_date) {
      return resSend(res, false, 400, "Date field is required.", { from_date });
    }

    // 1. Setup Paths
    const currentDate = formatDateYYDDMM(new Date(from_date));
    const parentDir = path.resolve(__dirname, "..");
    const zipDataPath = path.join(parentDir, OTHER_SERVER_DATA_PATH, currentDate);
    const zipFilePath = path.join(zipDataPath, `${currentDate}-${SYNC_SERVER_ENV}-sync_data.zip`);

    // 2. Validate & Setup Directories
    const zipExists = await checkFileExists(zipFilePath);
    console.log("ZIP FILE EXIST CHECKED");
    if (!zipExists) {
      return resSend(res, false, 200, `sync_data.zip not found for date ${currentDate}`, null);
    }

    // UNZIP DIRIRECTORY SETUP AND CREATE
    const outputDir = path.join(parentDir, UNZIP_DATA_PATH, currentDate);
    await fsPromises.mkdir(outputDir, { recursive: true });
    console.log("OUTPUT DIRECTORY CREATED");

    // LOG SYNC START
    await cronLog("data", new Date(), RESTORE_START, `Data restore started for ${currentDate}`, null, null);

    // 3. Unzip the file
    try {
      await extractZipAsync(zipFilePath, outputDir);
      console.log("UNZIPED SUCCESSFULLY");

    } catch (unzipError) {
      await logError(`Unzip failed for ${currentDate}`, unzipError.stack);
      return resSend(res, false, 500, "Unzip process failed", null);
    }

    // 4. Ingest to Database
    let syncResult;
    try {
      // GET FILES FROM UNZIP DIRECTORY
      const files = await getFilesFromDirectory(outputDir);
      // CHECK IF FILES IS PRESENT THE UNZIP DIRECTORY
      if (!files.length) {
        return resSend(res, false, 200, "No files found", files);
      }
      // FILE NAME TO TABLE NAME CONVERT
      const tableNamesArr = fileNamesToTableNamesConvert(files);
      // FILE READ AND INSERT IN TO TABLE
      syncResult = await syncDataUpload3(currentDate, outputDir, tableNamesArr);
      console.log("DATA SYNCED", syncResult);
    } catch (syncError) {
      await logError(`Data sync failed for ${currentDate}`, syncError.stack);
      return resSend(res, false, 500, syncError.message, syncResult);
    }

    // 5. Handle Response
    if (!syncResult.sta) {
      await cronLog("data", new Date(), RESTORE_ERROR, `Sync completed with errors for ${currentDate}`, JSON.stringify(syncResult.failedTables), null);
      return resSend(res, false, 200, "Sync completed with errors", {
        date: currentDate,
        summary: syncResult.summary,
        failedTables: syncResult.failedTables,
      });
    }

    await cronLog("data", new Date(), RESTORE_SUCCESSFULL, `Data restore successful for ${currentDate}`, null, null);
    return resSend(res, true, 200, "Data synced successfully!", {
      date: currentDate,
      summary: syncResult.summary
    });

  } catch (err) {
    console.error("Unexpected syncUnzip error:", err);
    await logError(err.message, err.stack);
    return resSend(res, false, 500, "Unexpected error occurred while syncing data", null);
  }
};


exports.syncTable = async (req, res) => {
  const logError = async (msg, stack = null) => {
    await cronLog("data", new Date(), RESTORE_ERROR, msg, stack, null);
  };

  try {
    // get sync date and tabel name to be synced
    const { syncDate, tableName } = req.body;

    if (!syncDate || !tableName) {
      return resSend(res, false, 400, "Date/Table name field is required.", { syncDate });
    }

    const currentDate = formatDateYYDDMM(new Date(syncDate));
    const parentDir = path.resolve(__dirname, "..");
    const outputDir = path.join(parentDir, UNZIP_DATA_PATH, currentDate);

    let syncResult;
    try {
      // SET TABLE NAMES
      const tableNamesArr = [tableName];
      syncResult = await syncDataUpload3(currentDate, outputDir, tableNamesArr);
      console.log("DATA SYNCED", syncResult);
    } catch (syncError) {
      await logError(`Data sync failed for ${currentDate}`, syncError.stack);
      return resSend(res, false, 500, syncError.message, syncResult);
    }

    // 5. Handle Response
    if (!syncResult.sta) {
      return resSend(res, false, 200, "Sync completed with errors", {
        date: currentDate,
        summary: syncResult.summary,
        failedTables: syncResult.failedTables,
      });
    }

    return resSend(res, true, 200, "Data synced successfully!", {
      date: currentDate,
      summary: syncResult.summary
    });

  } catch (err) {
    console.error("Unexpected syncUnzip error:", err);
    await logError(err.message, err.stack);
    return resSend(res, false, 500, "Unexpected error occurred while syncing data", null);
  }
};


/**
 * Handles the logic for inserting data into a single table safely.
 */
// const processSingleTable = async (client, tableName, rData, savepoint) => {
//   let processed = 0;

//   await poolQuery({ client, query: `SAVEPOINT ${savepoint}` });

//   for (const item of rData) {
//     processed++;

//     if (tableName === "zpo_milestone") {
//       await poolQuery({
//         client,
//         query: `DELETE FROM zpo_milestone WHERE ebeln = $1`,
//         values: [item.EBELN || item.ebeln],
//       });
//     }

//     const enrichedItem = { ...item, sync: true };
//     const { q, val } = await generateInsertUpdateQuery(enrichedItem, tableName, ["sync_id"]);

//     // console.log("q, val", q, val)

//     try {
//       await poolQuery({ client, query: q, values: val });
//     } catch (rowError) {
//       // Attach metadata to the error so the caller knows exactly what failed
//       rowError.failedItem = item;
//       rowError.failedQuery = q;
//       rowError.failedValues = val;
//       throw rowError; 
//     }

//     // Yield to Event Loop
//     if (processed % 500 === 0) {
//       await new Promise((r) => setImmediate(r));
//     }
//   }

//   // Calculate total records AFTER sync
//   const totalCountRes = await poolQuery({
//     client,
//     query: `SELECT COUNT(*)::int AS count FROM ${tableName}`,
//     values: [],
//   });

//   await poolQuery({ client, query: `RELEASE SAVEPOINT ${savepoint}` });

//   return {
//     processed,
//     total_records: totalCountRes[0]?.count || 0,
//   };
// };


/**
 * Splits a massive array into smaller, digestible chunks
 */
const chunkArray = (array, size) => {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
};

/**
 * Handles bulk inserting data into a single table.
 */
const processSingleTable = async (client, tableName, rData, savepoint) => {
  let processed = 0;

  // Process 1000 rows per query to maximize speed without hitting PG parameter limits
  const BATCH_SIZE = 200;
  const batches = chunkArray(rData, BATCH_SIZE);

  await poolQuery({ client, query: `SAVEPOINT ${savepoint}` });

  for (const batch of batches) {

    // --- 1. BULK DELETE (Specific to zpo_milestone) ---
    if (tableName === "zpo_milestone") {
      // Extract all EBELNs in this batch
      const ebelns = batch.map(item => item.EBELN || item.ebeln).filter(Boolean);

      if (ebelns.length > 0) {
        // Delete all matching records in one single lightning-fast query
        await poolQuery({
          client,
          query: `DELETE FROM zpo_milestone WHERE ebeln = ANY($1::text[])`,
          values: [ebelns],
        });
      }
    }

    // --- 2. BULK UPSERT ---
    // Ensure all items have the sync flag set
    // const enrichedBatch = batch.map(item => {
    //   // eslint-disable-next-line no-unused-vars
    //   const { id, ...rest } = item;
    //   return { ...rest, sync: true };
    // });
    // REMOVE ID FLAG AND SETSYNC FLAG = TRUE;
    const enrichedBatch = removeIdAndAddSyncFieldFromData(batch);
    console.log("enrichedBatch", enrichedBatch);

    const { q, val } = generateBulkUpsertQuery(enrichedBatch, tableName, ["sync_id"]);

    try {
      await poolQuery({ client, query: q, values: val });
      processed += batch.length;
    } catch (batchError) {
      // Attach metadata to the error
      batchError.failedBatchLength = batch.length;
      batchError.failedQuery = q;
      console.log("q, val", q, val, batchError);

      throw batchError; // Rollback triggered in outer loop
    }

    // Yield to Event Loop after each massive batch to keep the server responsive
    await new Promise((r) => setImmediate(r));
  }

  // Calculate total records AFTER sync
  const totalCountRes = await poolQuery({
    client,
    query: `SELECT COUNT(*)::int AS count FROM ${tableName}`,
    values: [],
  });

  await poolQuery({ client, query: `RELEASE SAVEPOINT ${savepoint}` });

  return {
    processed,
    total_records: totalCountRes[0]?.count || 0,
  };
};

async function getFilesFromDirectory(folderPath) {
  let files = await fsPromises.readdir(folderPath, { withFileTypes: true });
  return files;
}

/**
 * Remove id and add sync = true;
 * @param {*} batch 
 * @returns 
 */
function removeIdAndAddSyncFieldFromData(batch) {

  const batchData = batch.map(item => {
    // eslint-disable-next-line no-unused-vars
    const { id, ...rest } = item;
    return { ...rest, sync: true };
  });
  return batchData;
}



/**
 * Orchestrates reading the extracted files and delegating to processSingleTable.
 */
const syncDataUpload3 = async (currentDate, folderPath, syncTabels) => {
  return withTransaction(async (client) => {
    const failedItems = [];
    const failedTables = [];
    const tableSummary = [];


    for (const tableName of syncTabels) {
      if (!tableName) continue;

      const savepoint = `sp_${tableName.replace(/[^a-zA-Z0-9_]/g, "_")}`;
      const formJsonFileName = `${currentDate}-${SYNC_SERVER_ENV}-${tableName}.json`;
      const syncDataPath = path.join(folderPath, formJsonFileName);

      let rData = [];
      try {
        rData = await readJsonFile(syncDataPath);
        console.log("READ JSON FOR TABLE : ", tableName);
      } catch (err) {
        failedTables.push({ table: tableName, error: `JSON Parse Error: ${err.message}` });
        continue;
      }

      try {
        console.log("DATA SYNC STARTING FOR TABLE : ", tableName);
        const result = await processSingleTable(client, tableName, rData, savepoint);

        tableSummary.push({
          table: tableName,
          json_count: rData.length,
          processed_count: result.processed,
          success_count: result.processed,
          failed_count: 0,
          total_records: result.total_records,
          has_error: false,
        });
        console.log("DATA SYNC COMPLETED FOR TABLE : ", tableName);
      } catch (tableError) {
        await poolQuery({ client, query: `ROLLBACK TO SAVEPOINT ${savepoint}` });

        console.log("DATA SYNC ERROR FOR TABLE : ", tableName);

        failedTables.push({ table: tableName, error: tableError.message });

        if (tableError.failedItem) {
          failedItems.push({
            table: tableName,
            sync_id: tableError.failedItem.sync_id,
            query: tableError.failedQuery,
            values: tableError.failedValues,
            error: tableError.message,
          });

          // Optional: Insert to error log
          if (typeof insertToErrLog === 'function') {
            insertToErrLog(tableName, tableError.failedItem.sync_id, tableError.message, tableError.stack);
          }
        }

        tableSummary.push({
          table: tableName,
          json_count: rData.length,
          processed_count: rData.length, // Or 0, depending on how you want to track it
          success_count: 0,
          failed_count: rData.length,
          total_records: null,
          has_error: true,
        });
      }
    }

    return {
      sta: failedTables.length === 0,
      msg: failedTables.length === 0 ? "Sync completed successfully" : "Sync completed with errors",
      summary: tableSummary,
      failedTables,
      failedItems,
    };
  });
};

