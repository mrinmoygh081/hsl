/* eslint-disable no-undef */
const { resSend } = require("../../lib/resSend");
const { query, getQuery, withTransaction, poolQuery } = require("../../config/pgDbConfig");
// const fileDetails = require("../../lib/filePath");
const path = require("path");
const fs = require("fs").promises;
const { POfileFilter, POfileFilterOrderBy, paymentAdviceFiles } = require("../../lib/fetchFileDirectory");
const Message = require("../../utils/messages");
const QueryBuilder = require("../../utils/QueryBuilder");
const { EKKO } = require("../../lib/tableName");

// const download = async (req, res) => {
//   // const queryParams = req.query;

//   const typeArr = ["drawing", "sdbg", "qap"];

//   const { id, type } = req.query;

//   if (!typeArr.includes(type)) {
//     return resSend(res, false, 400, "Please send valid type ! i.e. drawing, sdbg, qap", null, null);
//   }
//   let fileFoundQuery = "";

//   const tableName = fileDetails[type]["tableName"];
//   const downaoadPath = fileDetails[type]["filePath"];

//   switch (type) {
//     case "drawing":
//       fileFoundQuery = `SELECT * FROM ${tableName} WHERE id = ?`;
//       break;
//     case "sdbg":
//       fileFoundQuery = `SELECT * FROM ${tableName} WHERE id = ?`;
//       break;
//     case "qap":
//       fileFoundQuery = `SELECT * FROM ${tableName} WHERE id = ?`;
//       break;

//     default:
//       break;
//   }

//   if (!fileFoundQuery) {
//     return resSend(res, false, 404, "file not found or invalid query", fileFoundQuery, null);
//   }

//   const response = await query({ query: fileFoundQuery, values: [id] });

//   if (!response?.length || !response[0]?.file_name) {
//     return resSend(res, true, 200, `file not uploaded with this id ${id}`, null, null);
//   }

//   const selectedPath = `${downaoadPath}${response[0].file_name}`;
//   const downloadPath = path.join(__dirname, "..", "..", selectedPath);
//   res.download(downloadPath, (err) => {
//     if (err) resSend(res, false, 404, "file not found", err, null);
//   });
// };

const tncdownload = async (req, res) => {
  try {
    const { purchesing_doc_no } = req.query;
    if (!purchesing_doc_no) {
      return resSend(res, false, 200, "You dont have access", null, null);
    }

    // if (tokenData.department_id == QAP || tokenData.department_id == RIC || tokenData.department_id == USER_TYPE_HSL_PURCHASE) {
    // const fileName = `${purchesing_doc_no}.pdf`;
    // const downloadPath = path.join(__dirname, "..", "..", "uploads", "tncminutes", fileName);
    const q = `SELECT file_name, file_path, file_type, purchasing_doc_no FROM tnc_minutes WHERE purchasing_doc_no = $1 order by id desc`;
    const result = await getQuery({ query: q, values: [purchesing_doc_no] });

    if (result.length) {
      const response = [{ ...result[0], full_file_path: result[0]?.file_path }];
      resSend(res, true, 200, "File fetched successfully", response, null);
    } else {
      resSend(res, true, 200, "No file found", [], null);
    }

    // res.download((downloadPath), (err) => {
    // 	if (err)
    //     	resSend(res, false, 404, "file not found", err, null)
    // });
    // } else {
    //   resSend(res, false, 401, "You dont have access", null, null);
    // }
  } catch (error) {
    console.error("tnc error", error);
    resSend(res, false, 500, "INTERNL SERVER ERROR", error, null);
  }
};

const downloadLatest = async (req, res) => {
  try {
    if (!req.query.poNo) {
      return resSend(res, false, 400, "Please send PO number", null, null);
    }
    let file = {};
    try {
      file = await POfileFilter(req.query.poNo);

      if (file.success && file?.data?.length) {
        const fileName = file.data[0];
        // const directoryPath = path.join(__dirname, '..', '..', 'sapuploads', 'po', `${fileName}`);
        // const directoryPath = path.join(__dirname, '..', '..', '..', '..', '..', 'ftpgrse', 'po', `${fileName}`);
        // const directoryPath = path.resolve(`/home/obps/archieve/${fileName}`);
        // const file_path = path.join('home', 'obps', 'archieve', `${fileName}`)
        // const response = [{ full_file_path: directoryPath, file_name: fileName, file_path }];

        const directoryPath = path.join(__dirname, "..", "..", "uploads", "po", `${file}`);
        const file_path = path.join("uploads", "po", `${file}`);
        const response = [{ full_file_path: directoryPath, file_name: fileName, file_path }];

        // res.download(directoryPath, (err) => {
        // 	if (err)
        // 	return resSend(res, false, 404, "file not found", err, null)
        // });

        if (!fileName) {
          return resSend(res, false, 404, "file not found", err, null);
        }
        resSend(res, true, 200, "File fetched successfully", response, null);
      } else {
        resSend(res, true, 200, file.msg, file.data, null);
      }
    } catch (error) {
      console.error("[error]", error);
      return resSend(res, false, 500, "GET FILE ERROR", null, null);
    }
  } catch (error) {
    console.error("[error]", error);
    return resSend(res, false, 500, "INTERNL SERVER ERROR", null, null);
  }
};

const getPoFileList = async (req, res) => {
  try {
    if (!req.query.poNo) {
      return resSend(res, false, 400, "Please send PO number", null, null);
    }
    let files;
    try {
      files = await POfileFilterOrderBy(req.query.poNo);

      if (files.success && files?.data?.length) {
        const resustFiles = files.data.map((file) => {
          // const directoryPath = path.join(__dirname, '..', '..', 'sapuploads', 'po', `${file}`);
          // const file_path = path.join('sapuploads', 'po', `${file}`);
          // const directoryPath = path.join(__dirname, '..', '..', '..', '..', '..', 'ftpgrse', 'po', `${file}`);
          const directoryPath = path.join(__dirname, "..", "..", "uploads", "po", `${file}`);
          const file_path = path.join("uploads", "po", `${file}`);
          let fileInfo = {};
          fileInfo.FullFilePath = directoryPath;
          fileInfo.filePath = file_path;
          fileInfo.fileName = file;

          return fileInfo; //filteredFilesById;
        });

        resSend(res, true, 200, "File fetched successfully", resustFiles, null);
      } else {
        resSend(res, true, 200, files.msg, files.data, null);
      }
    } catch (error) {
      return resSend(res, false, 500, "GET FILE ERROR", error, null);
    }
  } catch (error) {
    console.error("download po api error", error);
    return resSend(res, false, 500, "INTERNL SERVER ERROR", null, null);
  }
};

const getPaymentAdvliceList = async (req, res) => {
  try {
    // if (!req.query.poNo) {
    // 	return resSend(res, false, 400, "Please send PO number", null, null);
    // }

    const payload = req.body;

    let files;
    try {
      files = await paymentAdviceFiles(req.query.poNo);

      if (files.success && files?.data?.length) {
        const queryValues = files?.data?.map((el) => el.split("_")[0]);
        // const placeholders = queryValues.map(() => "?").join(",");
        const placeholders = queryValues.map((_, index) => `$${index + 1}`).join(",");

        // const paymentAdviceQuery = `SELECT * FROM zfi_pymt_advce_data_final WHERE vblnr in ( ${placeholders} )`;
        let paymentAdviceQuery = `SELECT  
													bldat AS "docuentDate", 
													lifnr AS "vendor_code",
													vblnr AS "documentNo"
														FROM zfi_pymt_advce_data_final 
															WHERE 1 = 1 AND vblnr in ( ${placeholders} )`;

        if (payload.poNo) {
          const result = await getQuery({
            query: `SELECT lifnr AS vendor_code FROM ekko WHERE ebeln = $1`,
            values: [payload.poNo],
          });

          paymentAdviceQuery = paymentAdviceQuery.concat(" AND lifnr = $2");
          queryValues.push(result[0].vendor_code);
        }
        const result = await getQuery({
          query: paymentAdviceQuery,
          values: queryValues,
        });

        const resustFiles = result.map((ele) => {
          const realFileName = files?.data?.find((el) => el.includes(ele.documentNo));
          // const directoryPath = path.join(__dirname, '..', '..', '..', '..', '..', 'ftpgrse', 'pymtadvice', `${realFileName}`);
          // const file_path = path.join('home', 'ftpgrse', 'pymtadvice', `${realFileName}`);
          // const directoryPath = path.join('home','obps', 'pymtadvice', `${realFileName}`);
          // const file_path = path.join('home', 'obps', 'pymtadvice', `${realFileName}`);

          const directoryPath = path.join(__dirname, "..", "..", "uploads", "paymentadvice", `${realFileName}`);
          const file_path = path.join("uploads", "paymentadvice", `${realFileName}`);

          return {
            ...ele,
            fullFilePath: directoryPath,
            filePath: file_path,
            fileName: realFileName,
          };
        });

        // const resustFiles = files.data.map(file => {
        // 	let fileInfo = {};
        // 	fileInfo.fullFilePath = directoryPath;
        // 	fileInfo.filePath = file_path;
        // 	fileInfo.fileName = file;

        // 	return fileInfo;
        // });

        resSend(res, true, 200, Message.FILE_FETCH_SUCCESSFULLY, { resustFiles }, null);
      } else {
        resSend(res, true, 200, files.msg, files.data, null);
      }
    } catch (error) {
      console.error("[error]", error);
      return resSend(res, false, 500, Message.FILE_FETCH_ERROR, null, null);
    }
  } catch (error) {
    console.error("[error]", error);
    resSend(res, false, 500, Message.SERVER_ERROR, null, null);
  }
};

const getPaymentAdvController = async (req, res) => {
  try {
    const { purchasing_doc_no } = req.query;

    if (!purchasing_doc_no) {
      return resSend(res, false, 200, "You dont have access", null, null);
    }

    const q = `SELECT distinct(btn_num) FROM btn_list WHERE purchasing_doc_no = $1`;
    const { rows } = await query({ query: q, values: [purchasing_doc_no] });

    let result = [];

    for (let item of rows) {
      let payload = {
        ...item,
      };
      const folderName = item.btn_num.substring(0, 8);
      // payload.file_path = await checkPdfFile(
      //   path.join(
      //     __dirname,
      //     "../",
      //     "../uploads/paymentadvice",
      //     folderName,
      //     `${item?.btn_num}.pdf`
      //   )
      // );
      payload.file_path = await checkPdfFile(path.join("uploads/paymentadvice", folderName, `${item?.btn_num}.pdf`));

      result.push(payload);
    }

    if (result.length) {
      resSend(res, true, 200, "File fetched successfully", result, null);
    } else {
      resSend(res, true, 200, "No file found", [], null);
    }
  } catch (error) {
    console.error("[error]", error);
    resSend(res, false, 500, "INTERNL SERVER ERROR", null, null);
  }
};

async function checkPdfFile(filePath) {
  try {
    await fs.access(filePath, fs.constants.F_OK);
    return filePath;
    // eslint-disable-next-line no-unused-vars
  } catch (err) {
    // console.error(`File does not exist: `, err);
    return null;
  }
}
const poListDownload = async (req, res) => {
  try {
    await withTransaction(async (client) => {
      let pageNo = parseInt(req.query.pageNo);
      let pageSize = parseInt(req.query.pageSize);

      const qb = new QueryBuilder(EKKO);

      qb.select(["*"]);

      if (pageNo && pageSize) {
        qb.paginate(pageNo, pageSize);
      }

      const baseQuery = qb.toJSON();

      const result = await poolQuery({ client, query: baseQuery.sql, values: baseQuery.params });

      resSend(res, true, 200, Message.DATA_FETCH_SUCCESSFULL, result, "", pageSize, pageNo);
    });
  } catch (error) {
    console.error("[ERROR] PO LIST Download API", error.message, error.stack);
    resSend(res, false, 500, Message.SOMTHING_WENT_WRONG, null, null);
  }
};

module.exports = {
  // download,
  tncdownload,
  downloadLatest,
  getPoFileList,
  getPaymentAdvliceList,
  getPaymentAdvController,
};
