/* eslint-disable no-unused-vars */
/* eslint-disable no-undef */
const nodemailer = require("nodemailer");
const { gmailApiInstance } = require("../config/configEmail/GmailApiSender");

let transporter = nodemailer.createTransport({
  service: process.env.MAIL_SERVICE_NAME,
  host: process.env.MAIL_HOST_URL,
  port: process.env.MAIL_SEND_PORT,
  secure: false,
  ignoreTLS: true,
  auth: {
    user: process.env.MAIL_SEND_MAIL_ID,
    pass: process.env.MAIL_SEND_MAIL_PASSWORD,
  },
});

const SENDMAIL = async (mailOptions) => {
  try {
    const info = await transporter.sendMail(mailOptions);
    return info;
  } catch (error) {
    console.error("[ERROR] SENDMAIL", error.message, error);
    throw error;
  }

}

const SENDMAILFROMNIC = async (from, to, subject, body, isHtml = true, replyTo = null) => {
  try {

    const res = await  gmailApiInstance.sendEmail(from, to, subject, body, isHtml = true, replyTo = null);
    return res;
  } catch (error) {
    console.error("[ERROR] SENDMAILFROMNIC", error.message, error);
    throw error;
  }
};

module.exports = { SENDMAIL, SENDMAILFROMNIC };
