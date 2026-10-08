const { poolQuery } = require("../config/pgDbConfig");
const { USER_TYPE_VENDOR, LAN_SERVER, NIC_SERVER } = require("../lib/constant");
const { SENDMAIL, SENDMAILFROMNIC } = require("../lib/mailSend");
const { EMAIL_TEMPLAE } = require("../templates/mail-template");
const Message = require("../utils/messages");
// eslint-disable-next-line no-undef
const SERVER_ENV = process.env.SERVER_ENV;
// eslint-disable-next-line no-undef
const MAIL_SEND_MAIL_ID = process.env.MAIL_SEND_MAIL_ID
// eslint-disable-next-line no-undef
const OTP_MAX_VALIDITY = process.env.OTP_MAX_VALIDITY

// --- OTP HELPER FUNCTIONS ---
const verifyOtpFromDb = async (client, userCode, otpInput) => {
  // 1. Fetch the latest PENDING OTP for this user
  // We check for LOGIN type specifically
  const query = `
        SELECT * FROM registration_otp 
        WHERE user_code = $1 AND status = 'PENDING' AND action_type = 'LOGIN'
        ORDER BY created_at DESC LIMIT 1
    `;

  const rows = await poolQuery({ client, query, values: [userCode] });

  if (!rows.length) {
    return { valid: false, message: "No active OTP found. Please request a new one." };
  }

  const record = rows[0];

  // 2. Check Matching Code
  if (record.otp !== otpInput) {
    return { valid: false, message: "Invalid OTP" };
  }

  // 3. Check Expiry (e.g., 5 Minutes = 300,000 ms)
  const timeDiff = parseInt(BigInt(Date.now()) - BigInt(record.created_at)); // Convert DB bigint to number if needed
  if (timeDiff > 300000) {
    // Update status to EXPIRED so it can't be checked again
    await poolQuery({
      client,
      query: "UPDATE registration_otp SET status = 'EXPIRED' WHERE id = $1",
      values: [record.id]
    });
    return { valid: false, message: "OTP has expired." };
  }

  // 4. Mark as USED
  await poolQuery({
    client,
    query: "UPDATE registration_otp SET status = 'USED' WHERE id = $1",
    values: [record.id]
  });

  return { valid: true };
};

const fetchUserEmail = async (client, vendor_code, user_type) => {
  let email = null;
  if (user_type === USER_TYPE_VENDOR) { // Replace with your constant USER_TYPE_VENDOR
    const vendorQ = `SELECT EMAIL FROM lfa1 WHERE LIFNR = $1`;
    const vRows = await poolQuery({ client, query: vendorQ, values: [vendor_code] });
    if (vRows.length) email = vRows[0].email;
  } else {
    const empQ = `SELECT EMAIL FROM pa0002 WHERE PERNR = $1`;
    const empRows = await poolQuery({ client, query: empQ, values: [vendor_code] });
    if (empRows.length) email = empRows[0].email;
  }
  return email;
};

const MAX_ATTEMPTS = 5;

// ✅ Function to handle a wrong password
const handleFailedAttempt = async (client, vendor_code) => {
  try {
    // 1. Check if a record exists for this user
    const checkQuery = `SELECT attempt_count, is_locked FROM auth_login_attempts WHERE vendor_code = $1`;
    const rows = await poolQuery({ client, query: checkQuery, values: [vendor_code] });

    let newCount = 1;
    let shouldLock = false;

    if (rows.length === 0) {
      // 2. No record exists: Create one with count = 1
      const insertQ = `INSERT INTO auth_login_attempts (vendor_code, attempt_count, last_attempt_at, is_locked) 
                       VALUES ($1, 1, NOW(), 0)`;
      await poolQuery({ client, query: insertQ, values: [vendor_code] });

    } else {
      // 3. Record exists: Increment count
      const currentCount = parseInt(rows[0].attempt_count);
      newCount = currentCount + 1;

      // Check if we hit the limit
      if (newCount >= MAX_ATTEMPTS) {
        shouldLock = true;
      }

      // 4. Update the database
      if (shouldLock) {
        // Lock the account (set is_locked = 1 and set lock_time)
        const lockQ = `UPDATE auth_login_attempts 
                       SET attempt_count = $1, last_attempt_at = NOW(), is_locked = 1, lock_time = NOW() 
                       WHERE vendor_code = $2`;
        await poolQuery({ client, query: lockQ, values: [newCount, vendor_code] });
      } else {
        // Just increment the counter
        const updateQ = `UPDATE auth_login_attempts 
                         SET attempt_count = $1, last_attempt_at = NOW() 
                         WHERE vendor_code = $2`;
        await poolQuery({ client, query: updateQ, values: [newCount, vendor_code] });
      }
    }

    // Return true if the account is NOW locked, so the controller can send the right message
    return shouldLock;

  } catch (error) {
    console.error("Error in handleFailedAttempt:", error);
    // Even if tracking fails, we generally don't want to stop the login flow error, 
    // but here we throw so the main try/catch handles it.
    throw error;
  }
};

// ✅ Function to reset attempts after a SUCCESSFUL login
const resetAttempts = async (client, vendor_code) => {
  try {
    // We can either delete the row or reset count to 0. 
    // Deleting is usually cleaner if you don't need historical logs of every login.
    const deleteQ = `DELETE FROM auth_login_attempts WHERE vendor_code = $1`;
    await poolQuery({ client, query: deleteQ, values: [vendor_code] });

  } catch (error) {
    console.error("Error in resetAttempts:", error);
  }
};

/**
 * Utility: check if account is locked
 * Returns true if the account is currently within the 30-minute lock window.
 */
async function isAccountLocked(client, vendorCode) {
  const checkAccountLock = await poolQuery({
    client,
    query: `SELECT lock_time FROM auth_login_attempts WHERE vendor_code = $1`,
    values: [vendorCode],
  });

  // If no record exists or lock_time is null, the account isn't locked
  if (!checkAccountLock.length || !checkAccountLock[0].lock_time) {
    return false;
  }

  const lockTime = new Date(checkAccountLock[0].lock_time).getTime();
  const now = new Date().getTime();
  
  const THIRTY_MINUTES_MS = 30 * 60 * 1000;
  const lockExpiry = lockTime + THIRTY_MINUTES_MS;

  // If current time is LESS than expiry, it is still locked (true)
  return now < lockExpiry;
}

// --- OTP SERVICE / HELPER FUNCTIONS ---

const generateOtpCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const saveOtpToDb = async (client, userCode, userType, otp, actionType = 'LOGIN') => {
  const currentTime = Date.now();
  const status = 'PENDING';

  const query = `
        INSERT INTO registration_otp 
        (user_type, user_code, otp, created_at, status, action_type) 
        VALUES ($1, $2, $3, $4, $5, $6)
    `;

  await poolQuery({
    client,
    query,
    values: [userType, userCode, otp, currentTime, status, actionType]
  });
};

const sendOtpEmail = async (email, otp) => {
  let mailOptions = {
    to: email,
    from: MAIL_SEND_MAIL_ID,
    subject: Message.LOGIN_OTP_EMAIL_SUBJECT,
    html: EMAIL_TEMPLAE(`Your One Time Password(OTP) to login in OBPS is : ${otp}. Valid for ${OTP_MAX_VALIDITY} seconds, Do not share it with anyone.`),
  };

  if (SERVER_ENV === LAN_SERVER) {
    // eslint-disable-next-line no-unused-vars
    const mail_response = await SENDMAIL(mailOptions);

  } else if (SERVER_ENV === NIC_SERVER) {
    // eslint-disable-next-line no-unused-vars
    const mail_response = await SENDMAILFROMNIC(MAIL_SEND_MAIL_ID, mailOptions.to, mailOptions.subject, mailOptions.html);

  }

};

// ✅ THE NEW COMMON FUNCTION
const processAndSendOtp = async (client, vendor_code, user_type, email, action_type = 'LOGIN') => {
  // 1. Generate
  const otp = generateOtpCode();
  console.log("masked-number -> ", "10"+otp);

  // 2. Save
  await saveOtpToDb(client, vendor_code, user_type, otp, action_type);

  sendOtpEmail(email, otp).catch(error => {
    console.error(`[sendOtpEmail ERROR] Failed to send OTP to ${email}:`, error.message);
  });

  return otp; // Return it just in case the controller needs it for logging
};

module.exports = { generateOtpCode, verifyOtpFromDb, fetchUserEmail, handleFailedAttempt, resetAttempts, isAccountLocked, processAndSendOtp };
