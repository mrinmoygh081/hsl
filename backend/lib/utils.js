const { UPDATE, INSERT } = require("./constant");
const { query } = require("../config/pgDbConfig");
const Message = require("../utils/messages");


/**
 * CREATE INSERT UPDATE QUERY FOR
 * @param {string} action
 * @param {string} tableName
 * @param {Object} dataObject
 * @param {Object} whereConditionObj
 * @returns {Object} { q:string, val: [] }
 */
const generateQuery = (action, tableName, dataObject, conditonDataObj = {}) => {
  if (!action || !tableName || !dataObject || !Object.keys(dataObject).length) {
    throw new Error(`${Message.VALID_PARAMETER} to -> ${action} of table ${tableName}`);
  }

  dataObject = { ...dataObject, sync: false }

  const setVauesVariables = [];
  let updateValues = Object.values(dataObject);
  let q = "";

  if (action === UPDATE) {
    const updateFields = Object.keys(dataObject).map(
      (key, i) => `${key} = $${i + 1}`
    );
    let condQuery = "";
    if (Object.keys(conditonDataObj).length > 0) {
      condQuery += " WHERE 1 = 1";
      const conditions = Object.keys(conditonDataObj).map((key, index) => {
        return ` AND ${key} = $${index + 1 + Object.keys(dataObject).length}`;
      });
      condQuery += conditions.join(" ");
    }

    updateValues = [...updateValues, ...Object.values(conditonDataObj)];
    q = `UPDATE  ${tableName} SET ${updateFields.join(", ")} ${condQuery}`;
  } else if (action === INSERT) {
    const insertFields = Object.keys(dataObject).map((key, i) => {
      setVauesVariables.push(`$${i + 1}`);
      return `${key}`;
    });
    q = `INSERT INTO ${tableName} (${insertFields.join(
      ", "
    )}) VALUES (${setVauesVariables.join(", ")}) RETURNING *`;
  }
  return { q, val: [...updateValues] };
};

/**
 * SIMPLE GET QUERY FUNCTION WITH ORDER BY
 * ONLY SUPORT AND CONDITIN 
 * NO OTER COND SUPPORT, LIKE OR, BETWEEN, ETC
 * @param {String} tableName 
 * @param {String} selectColumns 
 * @param {Object} conditonDataObj 
 * @param {String} orderBy 
 * @returns  Object { q: string, val: [any]}
 */

const generateSimpleSingleGetQuery = (tableName, selectColumns = "*", conditonDataObj = {}, orderBy = "") => {

  if ((!tableName || typeof tableName != 'string') ||
    (!selectColumns || typeof selectColumns != 'string') ||
    (typeof conditonDataObj != 'object') ||
    (typeof orderBy != 'string')

  ) {
    throw new Error("ddd");
  }
  let basicQuery = `SELECT ${selectColumns} FROM ${tableName}`
  let condQuery = " WHERE 1 = 1 ";
  let val = []
  if (Object.keys(conditonDataObj).length) {
    const conditions = Object.keys(conditonDataObj).map((key, index) => {
      return ` AND ${key} = $${index + 1}`;
    });
    condQuery += conditions.join(" ");
    val = Object.values(conditonDataObj);
  }

  if (orderBy) {
    orderBy = " ORDER BY " + orderBy;
  }


  const q = basicQuery + condQuery + orderBy;

  return { q, val }

}



async function generateQueryArray(action, tableName, payloadObj, whereCondition) {
  if (!action || !tableName || !payloadObj)
    throw Error("please send valid parameters !!!");
  if (action === UPDATE && !whereCondition)
    throw Error("please send whereCondition !!!");

  // query constract of insert field
  let setQ = "( ";
  const updateFields = Object.keys(payloadObj[0]).map((key) => ` ${key}`);
  setQ = setQ.concat(updateFields).concat(" )");

  let q = `INSERT INTO ${tableName} ${setQ} VALUES ?`;

  // value constract
  const val = payloadObj.map((obj) => Object.values(obj));
  return { q, val };
}


/**
 * GET CURRENT EPOCH TIME
 * @returns new Date().getTime()
 */
const getEpochTime = () => new Date().getTime();

const sapToGetEpochTime = (text) => {
  text = text.toString();

  if (text.length === 8 && text != "00000000") {
    let year = text.slice(0, 4);
    let month = text.slice(4, 6);
    let date = text.slice(6, 8);
    return new Date(year + "-" + month + "-" + date).getTime() / 1000;
  } else {
    return 0;
  }
};

function pad(number) {
  return number.toString().padStart(2, "0");
}

function getDateString(dateString) {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      throw new Error("Invalid date format");
    }
    const year = date.getFullYear();
    const month = date.getMonth() + 1; // Months are zero-indexed, so add 1
    const day = date.getDate();

    const paddedMonth = pad(month);
    const paddedDay = pad(day);

    return `${year}${paddedMonth}${paddedDay}`;
  } catch (error) {
    console.error("Error:", error.message);
    return null;
  }
}

const getYyyyMmDd = (dateTime) => {
  try {
    let v1 = dateTime.toString();
    const val = v1.length == 10 ? parseInt(v1) * 1000 : parseInt(v1);
    const date = new Date(val);
    // const date = new Date(dateTime); // dateTime/1000; //
    const year = date.getFullYear();
    const month = `0${date.getMonth() + 1}`.slice(-2);
    const day = `0${date.getDate()}`.slice(-2);

    const formattedDate = `${year}${month}${day}`;
    return formattedDate;
  } catch (err) {
    console.error(err.message);
    return "00000000";
  }
};
function formatDate(inputDate) {
  if (!inputDate || typeof inputDate !== "string" || inputDate.length < 8) {
    return null; // Return null if the input date is not provided or has less than 8 characters
  }

  // Convert the input date string to a Date object
  const year = inputDate.slice(0, 4);
  const month = inputDate.slice(4, 6);
  const day = inputDate.slice(6, 8);

  const dateObject = new Date(`${year}-${month}-${day}`);

  if (isNaN(dateObject.getTime())) {
    return null; // Return null for an invalid date
  }

  const formattedDate = dateObject.toISOString().split("T")[0];

  return formattedDate;
}

function formatTime(inputTime) {
  if (!inputTime || typeof inputTime !== "string" || inputTime.length < 6) {
    return null;
  }

  // Extract hours, minutes, and seconds components
  const hours = inputTime.slice(0, 2);
  const minutes = inputTime.slice(2, 4);
  const seconds = inputTime.slice(4, 6);

  if (isNaN(hours) || isNaN(minutes) || isNaN(seconds)) {
    return null; // Return null for an invalid time
  }

  // Convert to hh:mm:ss format
  const formattedTime = `${hours}:${minutes}:${seconds}`;

  return formattedTime;
}

/**
 * GENERATE QUERY FOR MULTIPLE DATA 
 * SPECIALLY USE FOR SAP DATA
 * @param {*} array 
 * @param {*} tableName 
 * @param {*} multiplePKs 
 * @returns 
 */
async function generateQueryForMultipleData(array, tableName, multiplePKs) {

  if (!array || !Array.isArray(array) || !array.length || !multiplePKs) {
    throw new Error("Invalid payload or parameter, please check the function for table insert query", tableName);
  }

  const columnArr = Object.keys({ ...array[0], sync: false });
  let valuesArray = array.map((item) => Object.values({ ...item, sync: false }));
  const allValues = valuesArray.flat();

  const column = valuesArray
    .map(
      (row, i) =>
        `(${row.map((_, j) => `$${i * row.length + j + 1}`).join(", ")})`
    )
    .join(", ");

  let queryText = `INSERT INTO ${tableName} (${columnArr.join(", ")})
    VALUES ${column}`;

  queryText += ` ON CONFLICT `;
  const conflictKeys = multiplePKs.join(", ");
  queryText += `( ${conflictKeys} )`;
  const columnArrWithOutPK = columnArr.filter(
    (col) => !multiplePKs.includes(col)
  );
  const columnArrWithOutPKLen = columnArrWithOutPK.length - 1;
  queryText += ` DO UPDATE SET `;
  let updateKeys = "";
  columnArrWithOutPK.forEach((u_key, j) => {
    updateKeys += ` ${u_key} = EXCLUDED.${u_key}`;
    if (j != columnArrWithOutPKLen) {
      updateKeys += ",";
    }
  });
  queryText += updateKeys;

  return { q: queryText, val: allValues };
}

async function generateInsertUpdateQuery(paylaodObject, tableName, multiplePKs) {
  if (!paylaodObject || typeof paylaodObject !== "object" || !Object.keys(paylaodObject)?.length) {
    throw new Error("Invalid payload or parameter, please check the function for table insert query", tableName)
  }
  const obj = { ...paylaodObject, sync: false };
  const columnArr = Object.keys(obj);
  let valuesArray = Object.values(obj);
  const allValues = valuesArray;
  const column = valuesArray.map((key, i) => `$${i + 1}`).join(", ");
  let queryText = `INSERT INTO ${tableName} (${columnArr.join(", ")})
  VALUES ( ${column} )`;

  queryText += ` ON CONFLICT `;
  const conflictKeys = multiplePKs.join(", ");
  queryText += `( ${conflictKeys} )`;
  const columnArrWithOutPK = columnArr.filter(
    (col) => !multiplePKs.includes(col)
  );
  const columnArrWithOutPKLen = columnArrWithOutPK.length - 1;
  queryText += " DO UPDATE SET ";
  let updateKeys = "";
  columnArrWithOutPK.forEach((u_key, j) => {
    updateKeys += ` ${u_key} = EXCLUDED.${u_key}`;
    if (j != columnArrWithOutPKLen) {
      updateKeys += ",";
    }
  });
  queryText += updateKeys;

  return { q: queryText, val: allValues };
}

async function generalErrorLog(error, source_name) {
  try {
    const paylaod = {
      error_stack: error.stack,
      source: source_name,
      error_message: error.message,
    };

    const { q, val } = generateQuery(INSERT, "error_log", paylaod);

    await query({ query: q, values: val });
  } catch (error) {
    console.error(error.message);
  }
}

/**
 * getDateTime
 * return { dateTime, data} Object
 * date time format : YYYY-MM-DD HH:MM:SS
 * date format : YYYY-MM-DD
 * @returns { dateTime, date}
 */
function getDateTime(currentData) {
  let now = currentData || new Date();
  let year = now.getFullYear();
  let month = now.getMonth() + 1;
  let day = now.getDate();
  let hour = now.getHours();
  let minute = now.getMinutes();
  let second = now.getSeconds();
  if (month.toString().length == 1) {
    month = "0" + month;
  }
  if (day.toString().length == 1) {
    day = "0" + day;
  }
  if (hour.toString().length == 1) {
    hour = "0" + hour;
  }
  if (minute.toString().length == 1) {
    minute = "0" + minute;
  }
  if (second.toString().length == 1) {
    second = "0" + second;
  }
  var dateTime =
    year + "-" + month + "-" + day + " " + hour + ":" + minute + ":" + second;
  const date = year + "-" + month + "-" + day;

  return { dateTime, date };
}


/**
 * Remove 0 from string
 * if function got any value then it remove the string
 * eg. '0012121233' -->  '12121233' (because of this is like number, but actual value is string type)
 * eg. '0012121233.' -->  '012121233.' dont remove 0
 * @param {* | string } data 
 * @returns 
 */
function removeZeroFn(data) {
  try {
    const isNotNumber = /\D/.test(data); // Check if the data contains any non-digit characters
    if (!isNotNumber) {
      const parsedData = parseInt(data, 10); // Convert to number
      if (isNaN(parsedData)) {
        return data;
      }
      return parsedData.toString();
    }

    return data;
  } catch (error) {
    console.error('Error in removeZeroFn:', error.message);
    return data;
  }
}


function maskEmailAddress(email) {
  if (!email || typeof email !== 'string') {
    return "Invalid Email";
  }

  const parts = email.split('@');
  if (parts.length !== 2) {
    return "Invalid Email Format";
  }

  let username = parts[0];
  let domain = parts[1];

  // Masking the username: first char, then ***, then last 2 chars
  let maskedUsername;
  if (username.length <= 3) {
    maskedUsername = username[0] + '*'.repeat(username.length - 1);
  } else {
    maskedUsername = username[0] + '***' + username.substring(username.length - 2);
  }

  // Masking the domain: first char, then ***, then rest of the domain (excluding TLD)
  let maskedDomain;
  const domainParts = domain.split('.');
  if (domainParts.length >= 2) {
    const domainName = domainParts[0];
    const tld = domainParts.slice(1).join('.');
    maskedDomain = domainName[0] + '***' + (domainName.length > 1 ? domainName.substring(domainName.length - 1) : '') + '.' + tld;
  } else {
    // If no TLD, just mask the entire domain after the first char
    maskedDomain = domain[0] + '***';
  }

  return maskedUsername + '@' + maskedDomain;
}

/**
 * dynamicSepartedStringToStringArray
 * convert string to string array with comma/any seperated
 * @param {string} data 
 * @returns 
 */
function dynamicSepartedStringToStringArray(stringValue, seperator = ",") {
  if (stringValue && typeof stringValue == "string") {
    return stringValue
      .split(seperator)
      .map(item => item.trim())
  }
  return [];
}


// /**
//  * Dynamically generates a single query to UPSERT hundreds of rows at once.
//  */
const generateBulkUpsertQuery = (items, tableName, conflictColumns = ["sync_id"]) => {
  if (!items || items.length === 0) return null;

  // Use the first item to determine the columns
  const keys = Object.keys(items[0]);
  const columnsStr = keys.join(", ");

  const values = [];
  const placeholders = [];
  let paramIndex = 1;

  // Build the massive VALUES list: ($1, $2, $3), ($4, $5, $6)
  for (const item of items) {
    const rowPlaceholders = [];
    for (const key of keys) {
      // Handle missing keys safely
      values.push(item[key] !== undefined ? item[key] : null);
      rowPlaceholders.push(`$${paramIndex}`);
      paramIndex++;
    }
    placeholders.push(`(${rowPlaceholders.join(", ")})`);
  }

  const conflictStr = conflictColumns.join(", ");

  // Build the DO UPDATE SET part
  const updateSetStr = keys
    .filter((key) => !conflictColumns.includes(key))
    .map((key) => `${key} = EXCLUDED.${key}`)
    .join(", ");

  const query = `
    INSERT INTO ${tableName} (${columnsStr}) 
    VALUES ${placeholders.join(",\n")}
    ON CONFLICT (${conflictStr}) 
    DO UPDATE SET ${updateSetStr};
  `;

  return { q: query, val: values };
};

/**
 * CUSTOM SLEEP FUNCTION
 * @param {} ms 
 * @returns 
 */
function sleepFn(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}


/**
 * Generates a query that updates existing rows and inserts new ones
 * WITHOUT bleeding the Primary Key sequence on updates.
 */
/**
 * Generates a query that updates existing rows and inserts new ones
 * with explicit type casting to prevent UUID vs Text errors.
 */
// const generateBulkUpsertQuery = (items, tableName, conflictColumns = ["sync_id"]) => {
//   if (!items || !items.length) return null;

//   const keys = Object.keys(items[0]);
  
//   const values = [];
//   const rows = [];
//   let paramIndex = 1;

//   items.forEach((item) => {
//     const rowPlaceholders = [];
//     keys.forEach((key) => {
//       values.push(item[key] !== undefined ? item[key] : null);
      
//       // Check if this specific key is one of the conflict columns (UUIDs)
//       if (conflictColumns.includes(key)) {
//         rowPlaceholders.push(`$${paramIndex++}::uuid`); // Explicit cast
//       } else {
//         rowPlaceholders.push(`$${paramIndex++}`);
//       }
//     });
//     rows.push(`(${rowPlaceholders.join(", ")})`);
//   });

//   const columnsStr = keys.join(", ");
//   const updateColumns = keys.filter(key => !conflictColumns.includes(key));
//   const updateSetSql = updateColumns.map(key => `${key} = data.${key}`).join(", ");
//   const joinCondition = conflictColumns.map(col => `t.${col} = data.${col}`).join(" AND ");

//   const query = `
//     WITH data_source (${columnsStr}) AS (
//       VALUES ${rows.join(", ")}
//     ),
//     updated AS (
//       UPDATE ${tableName} t
//       SET ${updateSetSql}
//       FROM data_source data
//       WHERE ${joinCondition}
//       RETURNING t.${conflictColumns[0]}
//     )
//     INSERT INTO ${tableName} (${columnsStr})
//     SELECT ${columnsStr}
//     FROM data_source
//     WHERE ${conflictColumns[0]} NOT IN (SELECT ${conflictColumns[0]} FROM updated)
//     ON CONFLICT (${conflictColumns.join(", ")}) DO NOTHING;
//   `;

//   return { q: query, val: values };
// };

module.exports = {
  formatDate,
  formatTime,
  generateQuery,
  generateQueryArray,
  getEpochTime,
  getYyyyMmDd,
  generateQueryForMultipleData,
  generateInsertUpdateQuery,
  generalErrorLog,
  getDateString,
  getDateTime,
  sapToGetEpochTime,
  removeZeroFn,
  maskEmailAddress,
  generateSimpleSingleGetQuery,
  dynamicSepartedStringToStringArray,
  generateBulkUpsertQuery,
  sleepFn
};