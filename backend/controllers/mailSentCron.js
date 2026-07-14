/* eslint-disable no-undef */
const { FAILED, STATUS_SUCCESS } = require("../lib/status");
const { SENDMAIL, SENDMAILFROMNIC } = require("../lib/mailSend");
const { EMAIL_TEMPLAE } = require("../templates/mail-template");
const { archiveEmails } = require("../services/mail.services");
const { UPDATE, MAIL_SEND_MAX_RETRY_COUNT, LAN_SERVER } = require("../lib/constant");
const { poolQuery, poolClient } = require("../config/pgDbConfig");
const { EMAILS } = require("../lib/tableName");
const { generateQuery, sleepFn } = require("../lib/utils");

// ---------------- Helper: Send Email ----------------
async function sendEmail(mail) {
  const { email_to, email_subject, email_body } = mail;

  const html = EMAIL_TEMPLAE(email_body);
  const fromMail = process.env.MAIL_SEND_MAIL_ID;

  const mailDetails = {
    to: email_to,
    from: fromMail,
    subject: email_subject,
    html,
  };

  // return SENDMAIL(mailDetails);
  if (process.env.SERVER_ENV === LAN_SERVER) {
    return SENDMAIL(mailDetails);
  }
  return SENDMAILFROMNIC(fromMail, email_to, email_subject, html, true);
}

// ---------------- Helper: Delete Email ----------------
function deleteEmail(client, id) {
  return poolQuery({
    client,
    query: `DELETE FROM ${EMAILS} WHERE id = $1`,
    values: [id],
  });
}

// ---------------- Helper: Increase Retry Count ----------------
async function incrementRetry(client, mail) {
  const newRetry = mail.retry_count + 1;
  const { q, val } = generateQuery(
    UPDATE,
    EMAILS,
    { retry_count: newRetry },
    { id: mail.id }
  );
  return poolQuery({ client, query: q, values: val });
}

/**
 * Removes placeholders formatted as {{vendor}} and returns a 
 * clean, comma-separated string of emails.
 */
function extractEmails(str) {
  return str
    .split(',')                         // Split into an array
    .map(item => item.trim())           // Remove surrounding whitespace
    .filter(item => !item.includes('{{')) // Remove items containing {{
    .filter(item => item.length > 0)    // Remove any empty strings
    .join(', ');                        // Join back with a single comma and space
}

// ---------------- MAIN CRON JOB ----------------
const mailSentCornJob = async () => {
  let client;

  try {
    client = await poolClient();

    const mails = await poolQuery({
      client,
      query: `SELECT * FROM ${EMAILS} ORDER BY created_on ASC LIMIT 10`,
      values: [],
    });

   
    if (!mails.length) return;

    for (const mail of mails) {
      // Skip empty recipient
      const emailId = extractEmails(mail.email_to);
      if (!emailId) {
        await Promise.allSettled([
          archiveEmails(client, { ...mail, status: FAILED, remarks: "No recipients defined" }),
          deleteEmail(client, mail.id),
        ]);
        continue;
      }

      try {
        const emailResponse = await sendEmail({...mail, email_to: emailId});
        
        
        await Promise.allSettled([
          deleteEmail(client, mail.id),
          archiveEmails(client, {
            ...mail,
            status: STATUS_SUCCESS,
            remarks: JSON.stringify(emailResponse),
          }),
        ]);
        
        // CUSTOM SLEEP FUNCTION
        await sleepFn(5000);

      } catch (error) {
        const isMaxRetry = mail.retry_count >= MAIL_SEND_MAX_RETRY_COUNT;

        if (isMaxRetry) {
          await Promise.allSettled([
            archiveEmails(client, { ...mail, status: FAILED, remarks: error.message }),
            poolQuery({
              client,
              query: `DELETE FROM ${EMAILS} WHERE retry_count = $1`,
              values: [MAIL_SEND_MAX_RETRY_COUNT],
            }),
          ]);
        } else {
          await incrementRetry(client, mail);
          console.error("Mail sending error:", error.message);
        }
      }
    }

  } catch (err) {
    console.error("mailSentCornJob error:", err);
  } finally {
    if (client) client.release();
  }
};

module.exports = { mailSentCornJob };
