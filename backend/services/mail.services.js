
const { INSERT,MAIL_SEND_DEFAULT_RETRY_COUNT } = require("../lib/constant");
const { EMAILS, ARCHIVE_EMAILS } = require("../lib/tableName");
const {
  generateQuery,
  getDateTime,
  generateQueryForMultipleData,
} = require("../lib/utils");
const { poolQuery, poolClient } = require("../config/pgDbConfig");

/**
 * SEND MAIL FUNCTION USE TO INSERT A MAIL TO MAIL TABLE(t_email_send)
 * @param {String} eventName 
 * @param {Object} data 
 * @param {Array} userInfo 
 * @param {String} activity_name 
 * @returns Promise
 */
const sendMail = async (eventName, data, userInfo, activity_name) => {

  // eslint-disable-next-line no-useless-catch
  try {

    const client = await poolClient();
    try {
      if (!data || !eventName) {
        throw new Error("recipent, email_subject and event required");
      }

      const email_info = await getEmailInfo(client, eventName);

      const mailjsonConfig = {};
      mailjsonConfig.data = data;
      const m_user = userInfo.users || [];
      /**
       * REPLACE USERS MAIL TO ACTUAL EMAIL
       */
      mailjsonConfig.users = replaceUserValues(email_info, m_user);
      if (!mailjsonConfig.users.length) return;

      await mailInsert(client, mailjsonConfig, eventName, eventName, activity_name);
    } catch (error) {
      console.error("sendMail", error.toString(), error.stack);
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    throw error;
  }
};

/**
 * GET MAIL SEND USERS LIST BY THE EVENT NAME
 * @param {DB poolClient} client 
 * @param {String} event_name 
 * @returns Array of Objects
 */
const getEmailInfo = async (client, event_name) => {
  const q = `SELECT e_info.event_name,
                e_info.u_id,
                e_info.u_name,
                e_info.u_type,
                e_info.u_email,
                e_body.email_body,
                e_body.email_subject
         FROM   email_send_info AS e_info
                LEFT JOIN email_body AS e_body
                       ON( e_body.email_body_name = e_info.email_body_name )
         WHERE  e_info.event_name = $1`;
  return await poolQuery({ client, query: q, values: [event_name] });
};

/**
 * REPLACE MAIL VARIABLE TO ACTUAL MAIL ADDRESS
 * Eg. email_info = [{ event_name: 'GATE_ENTRY_DOC_CREATE', u_email: '{{vendor}}'}
 *  m_user = [{u_id: '0050007545', u_name: 'DCG DATA -CORE SYSTEMS (INDIA) PRIV', u_email: 'kamal.ruidas@datacoresystems.co.in', u_type: 'vendor'}]
 * final result is [{ event_name: 'GATE_ENTRY_DOC_CREATE', u_email: 'kamal.ruidas@datacoresystems.co.in'} 
 * {{vendor}} variabele replace with actual value
 * @param {Array} email_info 
 * @param {Array} m_user 
 * @returns 
 */
function replaceUserValues(email_info, m_user) {
  let result = [];

  const usersDetails = {};
  for (const usr of m_user) {
    usersDetails[usr.u_type] = usr.u_email;
  }

  for (const mInfo of email_info) {
    const curr_email = mInfo.u_email || "";
    const u_email = replaceStringVariableToValueByObject(curr_email, usersDetails);
    result.push({ ...mInfo, u_email })
  }
  return result;
}

/**
 * MAIL INSERT INTO t_email_send TABLE
 * @param {DB poolClient} client 
 * @param {Object} data 
 * @param {String} event 
 * @param {String} activity_name 
 * @param {String} heading 
 */

// eslint-disable-next-line no-unused-vars
const mailInsert = async (client, data, event, activity_name, heading = "") => {
  try {
    const dd = data.created_at ? new Date(data.created_at) : new Date();
    const now = getDateTime(dd);

    const mailPayload = {
      event_name: event,
      email_to: "",
      email_subject: data.email_subject || "",
      email_cc: "",
      email_bcc: "",
      email_body: "",
      email_send_on: now.dateTime,
      created_on: now.date,
      created_by: data.created_by_id || data.created_by || "",
      modified_by: data.modified_by || "",
      modified_on: data.modified_on || null,
      attachment_path: data.attachment_path || "",
      activity_name: activity_name || "",
      retry_count: MAIL_SEND_DEFAULT_RETRY_COUNT,
    };

    const mailArr = data.users.map((el) => ({
      ...mailPayload,
      email_to: el.u_email,
      email_cc: el.cc_users,
      email_bcc: el.bcc_users,
      email_subject: replaceStringVariableToValueByObject(el?.email_subject, data.data),
      email_body: replaceStringVariableToValueByObject(el?.email_body, data.data)
    }));

    const { q, val } = await generateQueryForMultipleData(mailArr, EMAILS, ["id"]);
    await poolQuery({ client, query: q, values: val });
  } catch (error) {
    console.error("ERROR", error.message);
    throw error;
  }
};

/**
 * MAIL SEND TO ARCHIVE TABLE 
 * IF ANY OF MAIL SEND SUCCESSFULLY OR MAIL SEND FAIL THEN THOSE MAIL SEND INTO ARCHIVED IN TO t_mail_send_archive TABLE
 * @param {*} client 
 * @param {Object} data 
 * @returns Promise
 */

const archiveEmails = async (client, data) => {
  // eslint-disable-next-line no-useless-catch
  try {
    const archiveEmailPayload = { ...data };
    delete archiveEmailPayload.email_send_on;
    delete archiveEmailPayload.sync_id;
    delete archiveEmailPayload.sync;
    delete archiveEmailPayload.sync_updated_at;
    const { q, val } = generateQuery(
      INSERT,
      ARCHIVE_EMAILS,
      archiveEmailPayload
    );
    const response = await poolQuery({ client, query: q, values: val });
    return response;
  } catch (error) {
    throw error;
  }
};

/**
 * REPLACE VALUE FROM STRING WITH MATCHING VARIABLE NAME WITH IN {{}} BRACKET
 * Ex. str = "My name is {{name}} and DOB {{dob}}" AND dataObject = {name: "John", dob: "2000-12-12"}
 * The final string "My name is John and DOB 2000-12-12"
 * @param {String} str 
 * @param {Object} dataObject 
 * @returns String
 */
function replaceStringVariableToValueByObject(str, dataObject = {}) {
  const copyStr = String(str);
  return copyStr?.replace(/{{(.*?)}}/g,
    (match, p1) => dataObject[p1.trim()] || match);
}

module.exports = { mailInsert, archiveEmails, sendMail };
