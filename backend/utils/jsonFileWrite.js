/* eslint-disable no-undef */
const fs = require("fs");
const fsPromises = require("fs").promises; // Use promises for async I/O
// const { CSV_DATA_PATH } = require("../lib/constant"); // Assuming this is needed

exports.writeJsonToFile = async (tableName, data, dirPath, filePath ) => {
  try {
    // const parentDir = path.resolve(__dirname, "..");
    // const dirPath = path.join(parentDir, CSV_DATA_PATH, todayDate);

    // 1. ASYNC DIRECTORY CREATION (No more blocking!)
    await fsPromises.mkdir(dirPath, { recursive: true });

    // const filePath = path.join(dirPath, `${todayDate}_${tableName}_data.json`);
    console.log("dirPath", dirPath);
    console.log("filePath", filePath);

    // Return the Promise containing the stream logic
    return await new Promise((resolve, reject) => {
      const writeStream = fs.createWriteStream(filePath);
      let currentSize = 0;
      let hasError = false;

      writeStream.on("error", (error) => {
        hasError = true;
        console.error(`Error writing JSON for ${tableName}: ${error}`); // Fixed 'item' to 'tableName'
        reject({ file_path: filePath, success: false, error });
      });

      writeStream.on("finish", () => {
        if (!hasError) {
          const sizeMB = (currentSize / (1024 * 1024)).toFixed(2);
          console.log(`Write to JSON for ${tableName} completed! Size: ${sizeMB} MB`);
          resolve({ file_path: filePath, success: true, size: currentSize });
        }
      });

      // We wrap the iteration in an async function to handle stream backpressure
      const writeData = async () => {
        try {
          if (Array.isArray(data)) {
            writeStream.write("[\n");
            currentSize += 2;

            for (let i = 0; i < data.length; i++) {
              const jsonItem = JSON.stringify(data[i], null, 2);
              const itemSize = Buffer.byteLength(jsonItem, "utf8");
              currentSize += itemSize;

              const isLastItem = i === data.length - 1;
              const chunk = isLastItem ? `${jsonItem}\n` : `${jsonItem},\n`;
              currentSize += Buffer.byteLength(chunk, "utf8"); // Accurate size tracking

              // 2. HANDLE BACKPRESSURE
              // If write returns false, the internal buffer is full.
              const canWriteMore = writeStream.write(chunk);

              if (!canWriteMore) {
                // Wait for the hard drive to catch up before continuing the loop
                await new Promise((r) => writeStream.once("drain", r));
              }

              // 3. YIELD TO EVENT LOOP
              // Pause briefly every 500 rows so node-cron and other requests don't freeze
              if (i % 500 === 0) {
                await new Promise((r) => setImmediate(r));
              }
            }

            writeStream.write("]\n");
            currentSize += 2;
          } else {
            // Handle single objects
            const jsonString = JSON.stringify(data, null, 2);
            currentSize = Buffer.byteLength(jsonString, "utf8");
            writeStream.write(jsonString);
          }

          // Close the stream, which triggers the 'finish' event
          writeStream.end();
        } catch (err) {
          // If something breaks inside the loop, destroy the stream and pass the error
          writeStream.destroy(err); 
        }
      };

      // Start the writing process
      writeData();
    });

  } catch (error) {
    console.error(`Error processing JSON for ${tableName}: ${error.message}`);
    // Standardized to return 'success: false' instead of 'resp: false'
    return { file_path: null, success: false, error: error.message }; 
  }
};