/* eslint-disable no-undef */
const path = require("path");
const ExcelJS = require("exceljs");
const { poolClient, poolQuery } = require("../config/pgDbConfig");
const { resSend } = require("../lib/resSend");
const { HOLIDAY_CALENDAR } = require("../lib/tableName");
const { HR } = require("../lib/depertmentMaster");
const { generateInsertUpdateQuery, getEpochTime } = require("../lib/utils");
const { deleteFileByPath } = require("../lib/deleteFile");
const { toYyyyMmDd } = require("../services/holiday.services");
const Message = require("../utils/messages");

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const isHrUser = (tokenData) => tokenData.department_id == HR;

/**
 * Excel cell -> YYYY-MM-DD. Accepts real date cells, "YYYY-MM-DD" and "DD/MM/YYYY" / "DD-MM-YYYY" text.
 */
function parseExcelDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  const text = String(value?.text ?? value).trim();
  if (DATE_REGEX.test(text)) return text;
  const m = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (m) return toYyyyMmDd(new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1])));
  return null;
}

async function saveHoliday(client, holiday_date, description, tokenData) {
  const obj = { holiday_date, description: description || null, is_active: true, created_by: tokenData.vendor_code };
  const { q, val } = await generateInsertUpdateQuery(obj, HOLIDAY_CALENDAR, ["holiday_date"]);
  return poolQuery({ client, query: q, values: val });
}

// Visible to everyone
async function getHolidays(req, res) {
  let client;
  try {
    client = await poolClient();
    const year = Number(req.query.year) || new Date().getFullYear();
    const q = `SELECT id, holiday_date, description, created_by, created_at FROM ${HOLIDAY_CALENDAR}
               WHERE is_active = true AND EXTRACT(YEAR FROM holiday_date) = $1 ORDER BY holiday_date`;
    const result = await poolQuery({ client, query: q, values: [year] });
    resSend(res, true, 200, Message.DATA_FETCH_SUCCESSFULL, result, null);
  } catch (error) {
    console.error("getHolidays error", error.message, error);
    resSend(res, false, 500, Message.SOMTHING_WENT_WRONG, null, null);
  } finally {
    if (client) client.release();
  }
}

// HR: add/update a single holiday
async function addHoliday(req, res) {
  let client;
  try {
    const tokenData = req.tokenData;
    if (!isHrUser(tokenData)) {
      return resSend(res, false, 200, "Only HR can maintain the holiday calendar.", null, null);
    }
    const { holiday_date, description } = req.body;
    if (!holiday_date || !DATE_REGEX.test(holiday_date)) {
      return resSend(res, false, 200, "Please send holiday_date as YYYY-MM-DD.", null, null);
    }
    client = await poolClient();
    await saveHoliday(client, holiday_date, description, tokenData);
    resSend(res, true, 200, "Holiday saved successfully.", null, null);
  } catch (error) {
    console.error("addHoliday error", error.message, error);
    resSend(res, false, 500, Message.SOMTHING_WENT_WRONG, null, null);
  } finally {
    if (client) client.release();
  }
}

// HR: bulk upload. Excel columns: holiday_date | description
async function uploadHolidays(req, res) {
  let client;
  let excelFilePath = "";
  try {
    const tokenData = req.tokenData;
    if (!req.file) {
      return resSend(res, false, 400, "Please upload an excel file!", null, null);
    }
    excelFilePath = path.join(__dirname, "..", req.file.path);
    if (!isHrUser(tokenData)) {
      return resSend(res, false, 200, "Only HR can maintain the holiday calendar.", null, null);
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(excelFilePath);
    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      return resSend(res, false, 400, "Invalid file", null, null);
    }

    const header = worksheet
      .getRow(1)
      .values.slice(1)
      .map((h) => String(h).trim().toLowerCase());
    const dateCol = header.indexOf("holiday_date") + 1;
    const descCol = header.indexOf("description") + 1;
    if (!dateCol) {
      return resSend(res, false, 200, "Excel must have columns: holiday_date, description", null, null);
    }

    const rows = [];
    const invalidRows = [];
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const holiday_date = parseExcelDate(row.getCell(dateCol).value);
      if (!holiday_date) {
        invalidRows.push(rowNumber);
        return;
      }
      rows.push({ holiday_date, description: descCol ? String(row.getCell(descCol).value ?? "").trim() : "" });
    });

    if (invalidRows.length) {
      return resSend(res, false, 200, `Invalid holiday_date in row(s): ${invalidRows.join(", ")}`, null, null);
    }

    client = await poolClient();
    await client.query("BEGIN");
    for (const r of rows) {
      await saveHoliday(client, r.holiday_date, r.description, tokenData);
    }
    await client.query("COMMIT");
    resSend(res, true, 200, `${rows.length} holiday(s) uploaded successfully.`, null, null);
  } catch (error) {
    console.error("uploadHolidays error", error.message, error);
    if (client) await client.query("ROLLBACK");
    resSend(res, false, 500, Message.SOMTHING_WENT_WRONG, null, null);
  } finally {
    if (client) client.release();
    if (excelFilePath) deleteFileByPath(excelFilePath);
  }
}

// HR: remove a holiday
async function deleteHoliday(req, res) {
  let client;
  try {
    if (!isHrUser(req.tokenData)) {
      return resSend(res, false, 200, "Only HR can maintain the holiday calendar.", null, null);
    }
    client = await poolClient();
    await poolQuery({
      client,
      query: `UPDATE ${HOLIDAY_CALENDAR} SET is_active = false, last_changed_at = $2 WHERE id = $1`,
      values: [req.params.id, getEpochTime()],
    });
    resSend(res, true, 200, "Holiday removed.", null, null);
  } catch (error) {
    console.error("deleteHoliday error", error.message, error);
    resSend(res, false, 500, Message.SOMTHING_WENT_WRONG, null, null);
  } finally {
    if (client) client.release();
  }
}

module.exports = { getHolidays, addHoliday, uploadHolidays, deleteHoliday };
