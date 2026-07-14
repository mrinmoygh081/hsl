/* eslint-disable no-undef */
const { poolClient, poolQuery } = require("../../config/pgDbConfig");
const { resSend } = require("../../lib/resSend");
const { generateQuery, getEpochTime, generateInsertUpdateQuery } = require("../../lib/utils");
const { INSERT, UPDATE, ASSIGNER, STAFF, TYPE_RC, TYPE_PO, NOT_REQD_SORT_TEXT, FALSE_SORT_TEXT } = require("../../lib/constant");
const { HR_COMPLIANCE, HR_COMPLIANCE_DATA } = require("../../lib/tableName");
const Message = require("../../utils/messages");
const ALL_BRANCHES = require("../../utils/localData.json");
const ExcelJS = require("exceljs");
const path = require("path");
const { deleteFileByPath } = require("../../lib/deleteFile");
const { paylaodValidation, setVendorPoPayload, checkCurrentData, setVendorRcPayload, complianceListFromRc, complianceListFromPo, complianceView, paylaodValidationForHrRecepent, setHrPayload, currentDataValidation, findOutExistingAndNotExistingInNewData, createRefGroup } = require("../../services/hr.services");
const { APPROVED, STATUS_RECOMMEND, STATUS_HOLD_BY_HR, STATUS_HOLD_BY_HR_RECIPIENT, NOT_RECOMMEND, REJECTED, SUBMITTED } = require("../../lib/status");
const { create_reference_no } = require("../../services/po.services");
// const { datasync } = require("../../utils/hrDataMigration");


// /**
//  * UPLOAD BY CONTRACT CELL 
//  * @param {*} req 
//  * @param {*} res 
//  * @returns 
//  */
// const updoadExcelFileController = async (req, res) => {
//   try {
//     const client = await poolClient();
//     let excelFilePath = "";
//     try {
//       const tokenData = req.tokenData;
//       let fileData = {};
//       if (!req.file) {
//         resSend(res, false, 400, "Please upload an excel file!", fileData, null);
//       }

//       fileData = {
//         fileName: req.file.filename,
//         filePath: req.file.path,
//         fileType: req.file.mimetype,
//         fileSize: req.file.size,
//       };

//       excelFilePath = path.join(__dirname, "..", "..", req.file.path);
//       const workbook = xlsx.readFile(excelFilePath);

//       const sheetName = workbook.SheetNames[0];
//       const sheetData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

//       if (!sheetData.length) {
//         return resSend(res, false, 400, "Invalid file", req.file.filename, null);
//       }
//       // need excel header
//       const headerArr = ["rc_no", "unit", "purchasing_doc_no"].sort();
//       let excelHeaderArr = Object.keys(sheetData[0] || {});
//       excelHeaderArr = excelHeaderArr.sort();

//       if (JSON.stringify(headerArr) != JSON.stringify(excelHeaderArr)) {
//         return resSend(res, false, 400, "Invalid excel header file", req.file.filename, null);
//       }

//       let payload = [];
//       const allUnit = ALL_BRANCHES.allBranches;
//       if (sheetData.length) {
//         // payload = sheetData.map((sData, index) => ({ ...sData, created_at: getEpochTime(), created_by: tokenData.vendor_code }));

//         sheetData.forEach((el) => {
//           const unit = el.unit ?? el.unit.trim();
//           if (typeof unit === "string" && unit.toUpperCase() === "ALL") {
//             el.unit = allUnit;
//           } else if (unit && typeof unit === "string") {
//             el.unit = unit.split(",").map((u) => u.trim());
//           }
//           if (el.unit && Array.isArray(el.unit)) {
//             el.unit.forEach((u) => {
//               payload.push({
//                 rc_no: el.rc_no,
//                 purchasing_doc_no: el.purchasing_doc_no,
//                 unit: u,
//                 created_at: getEpochTime(),
//                 created_by: tokenData.vendor_code,
//               });
//             });
//           }
//         });
//       }
//       // const BATCH_SIZE = 50;

//       // for (let i = 0; i < payload.length; i += BATCH_SIZE) {
//       //     const batchedData = payload.slice(i, i + BATCH_SIZE);
//       //     const { q, val } = await generateQueryForMultipleData(batchedData, HR_COMPLIANCE, ["rc_no", "purchasing_doc_no", "unit"]);
//       //     try {
//       //         await poolQuery({ client, query: q, values: val });
//       //     } catch (error) {

//       //     }
//       // }
//       const responseArr = [];
//       for (let i = 0; i < payload.length; i++) {
//         if (allUnit.includes(payload[i]?.unit) && payload[i]?.rc_no && payload[i]?.purchasing_doc_no) {
//           // const ref_group = `${payload[i]?.rc_no}${payload[i]?.purchasing_doc_no}${payload[i]?.unit}`;
//           const ref_group = createRefGroup(payload[i])

//           const { q, val } = await generateInsertUpdateQuery({ ref_group, ...payload[i] }, HR_COMPLIANCE, ["rc_no", "purchasing_doc_no", "unit"]);
//           try {
//             await poolQuery({ client, query: q, values: val });
//             responseArr.push({ ...payload[i], message: Message.COMPLIANCE_INSERT_MSG });
//           } catch (error) {
//             console.error("Error : ", error.message.error.stack);
//           }
//         } else {
//           responseArr.push({ ...payload[i], message: "No such unit present" });
//         }
//       }
//       resSend(res, true, 200, Message.COMPLIANCE_ACTION_MSG, responseArr, null);
//     } catch (error) {
//       resSend(res, false, 500, Message.SOMTHING_WENT_WRONG, error.message, null);
//     } finally {
//       client.release();
//       deleteFileByPath(excelFilePath);
//     }
//   } catch (error) {
//     resSend(res, false, 500, Message.DATA_INSERT_FAILED, error.message, null);
//   }
// };


/**
 * UPLOAD BY CONTRACT CELL
 * @param {*} req
 * @param {*} res
 * @returns
 */
const updoadExcelFileController = async (req, res) => {
  let client;
  let excelFilePath = "";

  try {
    client = await poolClient();
    const tokenData = req.tokenData;
    let fileData = {};

    if (!req.file) {
      return resSend(res, false, 400, "Please upload an excel file!", fileData, null);
    }

    fileData = {
      fileName: req.file.filename,
      filePath: req.file.path,
      fileType: req.file.mimetype,
      fileSize: req.file.size,
    };

    excelFilePath = path.join(__dirname, "..", "..", req.file.path);

    /** ----------------- READ EXCEL USING EXCELJS ----------------- */
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(excelFilePath);

    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      return resSend(res, false, 400, "Invalid file", req.file.filename, null);
    }

    /** ----------------- EXTRACT HEADER ----------------- */
    const headerRow = worksheet.getRow(1);
    const excelHeaderArr = headerRow.values
      .slice(1)
      .map(h => String(h).trim())
      .sort();

    const headerArr = ["rc_no", "unit", "purchasing_doc_no"].sort();

    if (JSON.stringify(headerArr) !== JSON.stringify(excelHeaderArr)) {
      return resSend(res, false, 400, "Invalid excel header file", req.file.filename, null);
    }

    /** ----------------- EXTRACT DATA ----------------- */
    const sheetData = [];
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;

      const rowData = {};
      headerRow.eachCell((cell, colNumber) => {
        rowData[cell.value] = row.getCell(colNumber).value;
      });

      if (Object.keys(rowData).length) {
        sheetData.push(rowData);
      }
    });

    if (!sheetData.length) {
      return resSend(res, false, 400, "Invalid file", req.file.filename, null);
    }

    /** ----------------- PAYLOAD BUILDING ----------------- */
    const payload = [];
    const allUnit = ALL_BRANCHES.allBranches;

    sheetData.forEach((el) => {
      const unit = typeof el.unit === "string" ? el.unit.trim() : el.unit;

      if (typeof unit === "string" && unit.toUpperCase() === "ALL") {
        el.unit = allUnit;
      } else if (unit && typeof unit === "string") {
        el.unit = unit.split(",").map(u => u.trim());
      }

      if (Array.isArray(el.unit)) {
        el.unit.forEach((u) => {
          payload.push({
            rc_no: el.rc_no,
            purchasing_doc_no: el.purchasing_doc_no,
            unit: u,
            created_at: getEpochTime(),
            created_by: tokenData.vendor_code,
          });
        });
      }
    });

    /** ----------------- DB INSERT / UPDATE ----------------- */
    const responseArr = [];

    for (let i = 0; i < payload.length; i++) {
      if (
        allUnit.includes(payload[i]?.unit) &&
        payload[i]?.rc_no &&
        payload[i]?.purchasing_doc_no
      ) {
        const ref_group = createRefGroup(payload[i]);

        const { q, val } = await generateInsertUpdateQuery(
          { ref_group, ...payload[i] },
          HR_COMPLIANCE,
          ["rc_no", "purchasing_doc_no", "unit"]
        );

        try {
          await poolQuery({ client, query: q, values: val });
          responseArr.push({
            ...payload[i],
            message: Message.COMPLIANCE_INSERT_MSG,
          });
        } catch (error) {
          console.error("DB Error:", error);
        }
      } else {
        responseArr.push({
          ...payload[i],
          message: "No such unit present",
        });
      }
    }

    resSend(res, true, 200, Message.COMPLIANCE_ACTION_MSG, responseArr, null);
  } catch (error) {
    console.error("[ERROR] updoadExcelFileController : ", error);
    resSend(res, false, 500, Message.SOMTHING_WENT_WRONG, null, null);
  } finally {
    if (client) client.release();
    if (excelFilePath) deleteFileByPath(excelFilePath);
  }
};


const complianceDetails = async (req, res) => {
  let client;
  try {

    const tokenData = req.tokenData;
    const { type, docNo } = req.query;

    let result = [];
    let count = 0;

    client = await poolClient();
    // await datasync(client)

    switch (type) {
      case "rc": {
        result = await complianceListFromRc(client, tokenData, { docNo });
      }
        break;
      case "po": {
        result = await complianceListFromPo(client, tokenData, { docNo });
      }
        break;

      case "view": {
        const { complianceData, totalCount } = await complianceView(client, tokenData, req.query);
        result = complianceData;
        count = totalCount;
      }
        break;

      default:
        result = [];
        break;
    }

    resSend(res, true, 200, "HR Compliance Uploaded List fetched", result, "",count );
  } catch (error) {
    console.error("error", error)
    resSend(res, false, 500, Message.SOMTHING_WENT_WRONG, null);
  } finally {
    if (client) client.release();
  }
};


const submitHrComplients = async (req, res) => {
  let client;
  try {
    const tokenData = req.tokenData;
    const { type, compliance_data } = req.body;
    let responseArr = [];

    const checkValidPayload = paylaodValidation(compliance_data);

    if (!checkValidPayload) {
      return resSend(res, true, 200, "PLEASE VALIDATE PAYLOAD RC AND PO NO");
    }

    let complianceDataAfterUnitAndCompliances = []
    if (type == TYPE_PO) {
      complianceDataAfterUnitAndCompliances = setVendorPoPayload(compliance_data, tokenData);
    }
    if (type == TYPE_RC) {
      complianceDataAfterUnitAndCompliances = setVendorRcPayload(compliance_data, tokenData);
    }
    client = await poolClient();
    await client.query("BEGIN");

    if (!complianceDataAfterUnitAndCompliances.length) {
      return resSend(res, false, 200, Message.DATA_NOT_INSERTED, "Send valid payload", "");
    }

    // GET PREVIOUS DATA OF THE compliance_group_id
    const compliance_group_ids = complianceDataAfterUnitAndCompliances.map(cgId => cgId.compliance_group_id)
    const compFndPlaceholders = compliance_group_ids.map((_, i) => `$${++i}`).join(", ");
    const getQueryExistCompQuery = ` SELECT * FROM ${HR_COMPLIANCE_DATA} WHERE compliance_group_id IN(${compFndPlaceholders})`;
    const existingCompliences = await poolQuery({ client, query: getQueryExistCompQuery, values: compliance_group_ids });
    if (existingCompliences.length) {
      const { newItems, removedItems } = findOutExistingAndNotExistingInNewData(existingCompliences, complianceDataAfterUnitAndCompliances);

      for (let rmdata of removedItems) {
        const updateExisingComplQuery = generateQuery(UPDATE, HR_COMPLIANCE_DATA, { is_active: "T" }, { reference_no: rmdata.reference_no });
        await poolQuery({ client, query: updateExisingComplQuery["q"], values: updateExisingComplQuery["val"] });
      }
      if (newItems.length) {
        complianceDataAfterUnitAndCompliances = newItems;
      }
    }


    for await (let compl of complianceDataAfterUnitAndCompliances) {

      // INSERT INTO MASTER TABLE (HR_COMPLIANCE)
      const { q, val } = generateQuery(INSERT, HR_COMPLIANCE, { ref_group: compl.ref_group, purchasing_doc_no: compl.purchasing_doc_no, rc_no: compl.rc_no, unit: compl.unit })
      const Q = q.replace("RETURNING *", "ON CONFLICT(purchasing_doc_no, rc_no, unit) DO NOTHING RETURNING *");
      await poolQuery({ client, query: Q, values: val });

      let hrSavePayload = {
        reference_no: create_reference_no("HRC", tokenData.vendor_code),
        ref_group: compl.ref_group,
        compliance_group_id: compl.compliance_group_id,
        compliance_month: compl.compliance_month,
        compliance_year: compl.compliance_year,
        file1: compl.file1,
        compliance: compl.compliance,
        status: compl.status,
        vendor_code: tokenData.vendor_code,
        is_active: "F",
        created_by: tokenData.vendor_code,
        created_at: getEpochTime(),
      }

      const hrCurrentDetails = await checkCurrentData(client, { compliance_group_id: compl.compliance_group_id, compliance: compl.compliance, is_active: FALSE_SORT_TEXT });

      if (hrCurrentDetails && hrCurrentDetails.status && hrCurrentDetails.status === SUBMITTED) {
        return resSend(res, false, 200, "Compliance not upload, already submitted " + compl.compliance_group_id, { compliance_group_id: compl.compliance_group_id });
      }
      if (hrCurrentDetails && hrCurrentDetails.status && (
        hrCurrentDetails.status == STATUS_RECOMMEND ||
        hrCurrentDetails.status == APPROVED ||
        hrCurrentDetails.status == STATUS_HOLD_BY_HR ||
        hrCurrentDetails.status == STATUS_HOLD_BY_HR_RECIPIENT)) {
        return resSend(res, false, 200, "Compliance not upload, action already taken by HR Team " + compl.compliance_group_id, { compliance_group_id: compl.compliance_group_id });
      }
      if (hrCurrentDetails?.status == NOT_RECOMMEND || hrCurrentDetails.status === REJECTED) {
        const saveComplianceQuery = generateQuery(UPDATE, HR_COMPLIANCE_DATA, { is_active: NOT_REQD_SORT_TEXT }, { reference_no: hrCurrentDetails.reference_no });
        await poolQuery({ client, query: saveComplianceQuery["q"], values: saveComplianceQuery["val"] });
      }
      const saveComplianceQuery = generateQuery(INSERT, HR_COMPLIANCE_DATA, hrSavePayload);
      await poolQuery({ client, query: saveComplianceQuery["q"], values: saveComplianceQuery["val"] });
    }

    await client.query("COMMIT");
    resSend(res, true, 200, "Updated sucessfully!", responseArr);
  } catch (error) {
    if (client) await client.query("ROLLBACK");
    console.error("error", error)
    resSend(res, false, 500, Message.SOMTHING_WENT_WRONG, null, null);
  } finally {
    if (client) client.release();
  }
}

const updateHrComplients = async (req, res) => {
  let client;
  try {
    const tokenData = req.tokenData;
    const { compliance_data, } = req.body;
    let responseArr = [];
    client = await poolClient();
    await client.query("BEGIN");

    for (let complince of compliance_data) {
      const { compliance_group_id, supporting_doc } = complince;

      const complianceDetails = await complianceView(client, tokenData, { compliance_group_id });

      let supporting_docs = [];
      if (supporting_doc) {
        supporting_docs.push(supporting_doc);
      }
      if (complianceDetails[0]?.supporting_doc) {
        const suppFiles = JSON.parse(complianceDetails[0]?.supporting_doc);
        supporting_docs = supporting_docs.concat(suppFiles);
      }
      const saveComplianceQuery = generateQuery(UPDATE, HR_COMPLIANCE_DATA,
        { supporting_doc: JSON.stringify(supporting_docs) },
        { compliance_group_id });

      await poolQuery({ client, query: saveComplianceQuery["q"], values: saveComplianceQuery["val"] });
    }
    await client.query("COMMIT");
    resSend(res, true, 200, "Updated sucessfully!", responseArr);
  } catch (error) {
    // if (client) await client.query("ROLLBACK");
    console.error("error", error)
    resSend(res, false, 500, Message.SOMTHING_WENT_WRONG, null, null);
  } finally {
    if (client) client.release();
  }
}




const actionByHrRecepents = async (req, res) => {
  let client;
  try {
    const tokenData = req.tokenData;
    const { compliance_data } = req.body;
    let responseArr = [];

    const checkValidPayload = paylaodValidationForHrRecepent(compliance_data);

    if (!checkValidPayload) {
      return resSend(res, true, 200, "PLEASE VALIDATE PAYLOAD");
    }

    let complianceDataAfterUnitAndCompliances = []
    complianceDataAfterUnitAndCompliances = setHrPayload(compliance_data, tokenData);


    client = await poolClient();
    await client.query("BEGIN");


    for (let compl of complianceDataAfterUnitAndCompliances) {

      // actionByHrRecepents
      const complianceDetails = await complianceView(client, tokenData, { compliance_group_id: compl.compliance_group_id, is_active: FALSE_SORT_TEXT });
      const currDataValid = currentDataValidation(tokenData, complianceDetails[0] || {}, compl);

      if (!currDataValid.success) {
        return resSend(res, false, 200, currDataValid.message, "UNSELECT THE ITEM");
      }

      if (compl.status === APPROVED) {
        // compl.last_compliance_date = new Date("");
      }
      if (tokenData.internal_role_id == ASSIGNER) {
        compl.hr_remarks = compl.remarks;

      }
      if (tokenData.internal_role_id == STAFF) {
        compl.hr_retailer_remarks = compl.remarks;
      }
      delete compl.remarks;

      const saveComplianceQuery = generateQuery(UPDATE, HR_COMPLIANCE_DATA, compl, { compliance_group_id: compl.compliance_group_id, is_active: FALSE_SORT_TEXT });
      await poolQuery({ client, query: saveComplianceQuery["q"], values: saveComplianceQuery["val"] });
    }

    await client.query("COMMIT");
    resSend(res, true, 200, "Updated sucessfully!", responseArr);
  } catch (error) {
    if (client) await client.query("ROLLBACK");
    console.error("error", error)
    resSend(res, false, 500, Message.SOMTHING_WENT_WRONG, null, null);
  } finally {
    if (client) client.release();
  }
}



// async function handleEmail() {
//   // Maill trigger to QA, user dept and dealing officer upon uploading of each inspection call letters.
// }




module.exports = {
  submitHrComplients,
  complianceDetails,
  updoadExcelFileController,
  updateHrComplients,
  actionByHrRecepents
};
