/* eslint-disable no-undef */
const fs = require("fs");
const path = require("path");
const { resSend } = require("./resSend");
const { getQuery } = require("../config/pgDbConfig");
const { SOMTHING_WENT_WRONG } = require("../utils/messages");

/**
 *
 * file delete in a director all/specific file
 * @param {string} directory
 * @param {string} file_to_delete
 */

const handleFileDeletion = async (directory, file_to_delete) => {
  
  fs.readdir(directory, (error, files) => {
    if (error) {
      console.error(error.message);
      throw new Error("Could not read directory");
    }

    files.forEach((file) => {
      const file_path = path.join(directory, file);

      fs.stat(file_path, (error, stat) => {
        if (error) {
          console.error(error.message);
          throw new Error("Could not stat file");
        }

        if (stat.isDirectory()) {
          // Here instead of doing a consle.log(),
          // we recursively search for the file in subdirectories
          handleFileDeletion(file_path, file_to_delete);
        } else if (file === file_to_delete) {
          fs.unlink(file_path, (error) => {
            if (error) {
              console.error(error);
              throw new Error("Could not delete file");
            }

          });
        }
      });
    });
  });
};

const deleteSingleFile = async (req, res) => {
  try {
    const { id } = req.body;

    if (!id) {
      return resSend(res, false, 400, "File id is required", null, null);
    }

    const getFileData = await getQuery({ query: "SELECT * FROM files WHERE id = $1", values: [id] });

    if (!getFileData.length) {
      return resSend(res, false, 400, "Invalid file id", null, null);
    }
    const filePath = getFileData[0]?.file_path;

    const filePathDirectory = path.join(__dirname, "..", filePath);
  
    // Check if the file exists and is not a directory
    fs.stat(filePathDirectory, (error, stat) => {
      if (error) {
        return resSend(res, false, 404, "File not found or inaccessible", error.message, null);
      }

      if (!stat.isFile()) {
        return resSend(res, false, 400, "Provided path is not a file", filePath, null);
      }

      // Attempt to delete the file
      fs.unlink(filePathDirectory, (error) => {
        if (error) {
          console.error("[error]", error);
          return resSend(res, false, 500, "Could not delete file", null, null);
        }

        resSend(res, true, 200, "File deleted successfully", filePathDirectory, null);
      });
    });
  } catch (error) {
    console.error(`Unexpected error: ${error.message}`);
    resSend(res, false, 500, SOMTHING_WENT_WRONG, null);
  }
};

const deleteFileByPath = async (filePathDirectory) => {
  if (!fs.existsSync(filePathDirectory)) return true;

  fs.stat(filePathDirectory, (error, stat) => {
    if (error) {
      throw new Error(`Error stating file: ${error.message}`);
    }

    if (!stat.isFile()) {
      throw new Error("Provided path is not a file");
    }

    // Attempt to delete the file
    fs.unlink(filePathDirectory, (error) => {
      if (error) {
        throw new Error(`Error deleting file: ${error.message}`);
      }

      return true;
    });
  });
};

module.exports = { handleFileDeletion, deleteSingleFile, deleteFileByPath };
