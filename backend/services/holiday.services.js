const { poolQuery } = require("../config/pgDbConfig");
const { HOLIDAY_CALENDAR } = require("../lib/tableName");

const toYyyyMmDd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

async function getHolidaySet(client, fromDate, toDate) {
  const q = `SELECT holiday_date FROM ${HOLIDAY_CALENDAR} WHERE is_active = true AND holiday_date BETWEEN $1 AND $2`;
  const rows = await poolQuery({ client, query: q, values: [toYyyyMmDd(fromDate), toYyyyMmDd(toDate)] });
  return new Set(rows.map((r) => String(r.holiday_date).slice(0, 10)));
}

const isWorkingDay = (date, holidays) => {
  const day = date.getDay(); // 0 = Sunday, 6 = Saturday
  return day !== 0 && day !== 6 && !holidays.has(toYyyyMmDd(date));
};

/**
 * Date that is `workingDays` working days after `fromDate` (weekends and holiday_calendar skipped).
 */
async function addWorkingDays(client, fromDate, workingDays) {
  const start = new Date(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate());
  // Generous window: 2x calendar days + 60 covers weekends and any realistic holiday density
  const windowEnd = new Date(start);
  windowEnd.setDate(windowEnd.getDate() + workingDays * 2 + 60);
  const holidays = await getHolidaySet(client, start, windowEnd);

  const result = new Date(start);
  let counted = 0;
  while (counted < workingDays) {
    result.setDate(result.getDate() + 1);
    if (isWorkingDay(result, holidays)) counted++;
  }
  return result;
}

/**
 * Working days in (fromDate, toDate] — fromDate itself not counted.
 */
function countWorkingDays(fromDate, toDate, holidays) {
  const cur = new Date(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate());
  const end = new Date(toDate.getFullYear(), toDate.getMonth(), toDate.getDate());
  let count = 0;
  while (cur < end) {
    cur.setDate(cur.getDate() + 1);
    if (isWorkingDay(cur, holidays)) count++;
  }
  return count;
}

module.exports = { addWorkingDays, isWorkingDay, countWorkingDays, getHolidaySet, toYyyyMmDd };
