const ExcelJS = require("exceljs");
const path = require("path");
const { poolQuery } = require("../config/pgDbConfig");

/**
 * Modify SDBG Payload object to insert data
 * @param {Object} payload
 * @param {string} status
 * @returns Object
 */

const getDepartmentByPernr = async (client, pernr) => {
  const excelPath = path.join(
    __dirname,
    "../lib/empMasterExcelSheet/employeeMasterExcel.xlsx",
  );

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(excelPath);

  const worksheet = workbook.worksheets[0];

  if (!worksheet) {
    throw new Error("Department worksheet not found");
  }

  let departmentName = null;

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;

    const excelPernr = String(row.getCell(5).value || "").trim();
    const excelDepartment = row.getCell(8).value;

    if (excelPernr === String(pernr).trim()) {
      departmentName = String(excelDepartment || "").trim();
    }
  });

  if (!departmentName) {
    return null;
  }

  const result = await client.query(
    `SELECT id
     FROM depertment_master
     WHERE LOWER(TRIM(name)) = LOWER(TRIM($1))
     LIMIT 1`,
    [departmentName],
  );

  return result.rows.length > 0 ? result.rows[0].id : null;
};

const pfPayload = (payload) => {
  const payloadObj = {
    purchasing_doc_no: payload.purchasing_doc_no
      ? payload.purchasing_doc_no
      : null,
    file_name: payload.fileName ? payload.fileName : null,
    file_path: payload.filePath ? payload.filePath : null,
    vendor_code: payload.vendor_code ? payload.vendor_code : null,
    remarks: payload.remarks ? payload.remarks : null,
    status: payload.status,
    updated_by: payload.updated_by,
    created_at: payload.created_at,
    created_by_id: payload.created_by_id,
  };

  return payloadObj;
};

module.exports = { getDepartmentByPernr, pfPayload };
