exports.formatDateSync = (date = new Date()) => {
  let day = date.getDate();
  let month = date.getMonth() + 1;
  let year = date.getFullYear();

  if (day < 10) {
    day = "0" + day;
  }
  if (month < 10) {
    month = "0" + month;
  }

  return day + "-" + month + "-" + year;
};

exports.convertToEpoch = (date) => {
  if (date) {
    return Math.floor(date.getTime() / 1000);
  } else {
    return null;
  }
};

exports.getEpochFirstLastToday = () => {
  // Get current date
  const now = new Date();

  // Get the start of today (00:00:00)
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  // const firstEpochTime = Math.floor(startOfDay.getTime() / 1000);
  const firstEpochTime = startOfDay.getTime();

  // Get the end of today (23:59:59)
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  // const lastEpochTime = Math.floor(endOfDay.getTime() / 1000);
  const lastEpochTime = endOfDay.getTime();
  return {
    firstEpochTime,
    lastEpochTime,
  };
};

exports.formatDashedDate = (epochTime) => {
  const et = isNaN(epochTime) ? epochTime : parseInt(epochTime);
  let date = new Date(et);

  let day = date.getDate();
  let month = date.getMonth() + 1;
  let year = date.getFullYear();

  if (day < 10) {
    day = "0" + day;
  }
  if (month < 10) {
    month = "0" + month;
  }

  return year + "-" + month + "-" + day;
};

/**
 * take from date and to date as epoch time
 * and return date array like
 * ['04-09-2024', '05-09-2024']
 * @param {Number} start
 * @param {Number} end
 * @returns String Array
 */
exports.getDates = (start, end) => {
  const dates = [];
  const currentDate = new Date(start);
  while (currentDate <= end) {
    dates.push(formatDate(currentDate));
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return dates;
};

function formatDate(date) {
  const day = String(date.getDate()).padStart(2, "0"); // Ensures two-digit day
  const month = String(date.getMonth() + 1).padStart(2, "0"); // Ensures two-digit month
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
}

exports.getDatesFromEpoch = (epochTimeValue) => {
  const currentDate = new Date(epochTimeValue);
  const date = formatDateYYDDMM(currentDate);
  return date;
};

function formatDateYYDDMM(date) {
  const day = String(date.getDate()).padStart(2, "0"); // Ensures two-digit day
  const month = String(date.getMonth() + 1).padStart(2, "0"); // Ensures two-digit month
  const year = date.getFullYear();
  return `${year}${month}${day}`;
}


/**
 * FORMAT CURRENT DATE TIME
 * YYYYMMDDHHMMSSMS
 * @returns string
 */
exports.formatDateYYYYMMDDHHMMSSMS = () => {
  const now = new Date();
  const formattedTime = now.getFullYear().toString() +
    String(now.getMonth() + 1).padStart(2, '0') +
    String(now.getDate()).padStart(2, '0') +
    String(now.getHours()).padStart(2, '0') +
    String(now.getMinutes()).padStart(2, '0') +
    String(now.getSeconds()).padStart(2, '0') +
    String(now.getMilliseconds()).padStart(3, '0');

  return formattedTime
}


exports.formatDateYYDDMM = (date) => {
  const day = String(date.getDate()).padStart(2, "0"); // Ensures two-digit day
  const month = String(date.getMonth() + 1).padStart(2, "0"); // Ensures two-digit month
  const year = date.getFullYear();
  return `${year}${month}${day}`;
}
exports.formatDateYYYYMM = (date) => {
  // const day = String(date.getDate()).padStart(2, "0"); // Ensures two-digit day
  const month = String(date.getMonth() + 1).padStart(2, "0"); // Ensures two-digit month
  const year = date.getFullYear();
  return `${year}${month}`;
}
/*
 * Format date to DD
 */
exports.formatDateDD = (date) => {
  return String(date.getDate()).padStart(2, "0");
}


/**
 * CONVERT ISO TIME STAMP TO  TIEM STAMP WITH OUT TIMEZONE
 * '2025-11-24T10:41:17.149Z'  Output: '2025-11-24 10:41:17.149'
 * @param {*} isoTimestamp 
 * @returns timestamp without timezone
 */
exports.convertIsoTimestampToYYYYMMDDHHMMSSMs = (isoTimestamp = new Date()) => {
  const date = new Date(isoTimestamp);

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  const milliseconds = String(date.getMilliseconds()).padStart(3, '0');

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}.${milliseconds}`;
}