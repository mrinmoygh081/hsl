/* eslint-disable no-undef */
const { getQuery, poolClient, poolQuery } = require("../../config/pgDbConfig");
const { INSERT, LAN_SERVER, MID_DRAWING, YES, TRUE, BG_EXPIRY_ALERT_WORKING_DAYS } = require("../../lib/constant");
const { SEVEN_DAYS_PRIOR_CON_MILESTONE_DATE, BG_EXPIRY_REMINDER } = require("../../lib/event");
const { SUBMITTED, ACKNOWLEDGED, REJECTED, APPROVED } = require("../../lib/status");
const { getHolidaySet, isWorkingDay, countWorkingDays } = require("../../services/holiday.services");
const { generateQuery, getEpochTime } = require("../../lib/utils");
const { sendMail } = require("../../services/mail.services");
const cron = require("node-cron");
const { setActualSubmissionDate } = require("../../services/po.services");
const { mailSentCornJob } = require("../mailSentCron");

const sendPOMilestoneEXPReminderMail = async () => {
  const timeLineData = await getTimeLineData();

  if (timeLineData && timeLineData.length) {
    for (const data of timeLineData) {
      const obj = { users: [{ u_email: data?.u_email, u_id: data?.u_id, u_type: data?.u_type }] };
      await sendMail(SEVEN_DAYS_PRIOR_CON_MILESTONE_DATE, data, obj, SEVEN_DAYS_PRIOR_CON_MILESTONE_DATE);
    }
  }

};

async function getTimeLineData() {
  const REMINDE_BEFORE_DAYS = 7 * 24 * 60 * 60 * 1000;
  const currentDate = new Date();
  const sevenDaysBefore = new Date(currentDate.getTime() + REMINDE_BEFORE_DAYS);
  const dueDate = sevenDaysBefore.toISOString().split("T")[0];

  let q = `
            SELECT v_name.email  AS u_email,
                   v_name.lifnr AS vendor_code,
                   t.EBELN      AS purchasing_doc_no,
                   v_name.NAME1 AS vendor_name,
                   t.PLAN_DATE  AS plan_date,
                   t.MID        AS mile_stone_id,
                   p.table_name AS item,
                   v_name.lifnr AS  u_id
                   'vendor' AS u_type,
            FROM   zpo_milestone AS t
                   JOIN ((SELECT purchasing_doc_no,
                                 vendor_code,
                                 '02'      AS flag,
                                 'drawing' AS table_name
                        FROM   drawing)
                        UNION ALL
                        SELECT purchasing_doc_no,
                                vendor_code,
                                '01'    AS flag,
                                'sdbg' AS table_name
                        FROM   sdbg
                        UNION ALL
                        SELECT purchasing_doc_no,
                                vendor_code,
                                '03'   AS flag,
                                'qap' AS table_name
                        FROM   qap_submission) AS p
                     ON ( t.EBELN = p.purchasing_doc_no AND t.MID = p.flag )
                   JOIN lfa1 AS v_name
                     ON p.vendor_code = v_name.LIFNR
            WHERE t.PLAN_DATE BETWEEN $1 AND $2`;
  q = `
        SELECT v_name.email  AS u_email,
                   v_name.lifnr AS vendor_code,
                   t.EBELN      AS purchasing_doc_no,
                   v_name.NAME1 AS vendor_name,
                   t.PLAN_DATE  AS plan_date,
                   t.MID        AS mile_stone_id,
                   p.table_name AS item,
                   v_name.lifnr AS  u_id,
                   'vendor' AS u_type
            FROM   zpo_milestone AS t
                   JOIN ((SELECT purchasing_doc_no,
                                 vendor_code,
                                 '02'      AS flag,
                                 'drawing' AS table_name
                        FROM   drawing)
                        UNION ALL
                        (SELECT purchasing_doc_no,
                                vendor_code,
                                '01'    AS flag,
                                'sdbg' AS table_name
                        FROM   sdbg)
                        UNION ALL
                        (SELECT purchasing_doc_no,
                                vendor_code,
                                '03'   AS flag,
                                'qap' AS table_name
                        FROM   qap_submission)
						UNION ALL 
						 
						 (SELECT purchasing_doc_no,
                                vendor_code,
                                '04'    AS flag,
                                'ilms' AS table_name
                        FROM   sdbg)
						) AS p
                     ON ( t.EBELN = p.purchasing_doc_no AND t.MID = p.flag )
                   JOIN lfa1 AS v_name
                     ON p.vendor_code = v_name.LIFNR
            WHERE (t.PLAN_DATE BETWEEN $1 AND $2)
			 GROUP  BY t.ebeln, t.mid, v_name.email,  v_name.lifnr, p.table_name`;

  const firstTime = `${dueDate} 00:00:00`;
  const lastTime = `${dueDate} 23:59:59`;
  const result = await getQuery({ query: q, values: [firstTime, lastTime] });
  return result;
}

// Per To-Be doc 6.2.4: staged alerts at 45/30/15 working days before BG expiry,
// sent to Dealing Officer, Finance Officer and Vendor. Source: OVMS sdbg_entry.
const sendBGReminderMail = async () => {
  let client;
  try {
    client = await poolClient();
    const today = new Date();
    const maxAlert = Math.max(...BG_EXPIRY_ALERT_WORKING_DAYS);
    const windowEnd = new Date(today);
    windowEnd.setDate(windowEnd.getDate() + maxAlert * 2 + 60);
    const holidays = await getHolidaySet(client, today, windowEnd);

    // Run on working days only, so each BG crosses each threshold exactly once
    if (!isWorkingDay(today, holidays)) return;

    const bgData = await getActiveBgExpiryData(client, today, windowEnd);
    for (const data of bgData) {
      const expireDate = new Date(Number(data.expire_epoch) * 1000);
      const workingDaysLeft = countWorkingDays(today, expireDate, holidays);
      if (!BG_EXPIRY_ALERT_WORKING_DAYS.includes(workingDaysLeft)) continue;

      const users = [];
      if (data?.do_email) users.push({ u_email: data.do_email, u_id: data.do_id, u_type: "do" });
      if (data?.vendor_email) users.push({ u_email: data.vendor_email, u_id: data.vendor_id, u_type: "vendor" });
      if (data?.fi_email) users.push({ u_email: data.fi_email, u_id: data.fi_id, u_type: "finance_officer" });
      if (!users.length) continue;

      await sendMail(
        BG_EXPIRY_REMINDER,
        { ...data, expire_date: toDdMmYyyy(expireDate), days_left: `${workingDaysLeft} working` },
        { users },
        BG_EXPIRY_REMINDER,
      );
    }
  } catch (error) {
    console.error("sendBGReminderMail error", error.message, error);
  } finally {
    if (client) client.release();
  }
};

const toDdMmYyyy = (d) => `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;

/**
 * Accepted, unreleased BGs whose current expiry (validity or latest extension; epoch seconds) is in the window.
 */
async function getActiveBgExpiryData(client, fromDate, toDate) {
  const q = `SELECT * FROM (
      SELECT  bg.reference_no AS ref_no,
              bg.bg_file_no   AS file_no,
              bg.bg_no,
              bg.purchasing_doc_no,
              GREATEST(bg.validity_date,
                       COALESCE(bg.extension_date1, 0), COALESCE(bg.extension_date2, 0), COALESCE(bg.extension_date3, 0),
                       COALESCE(bg.extension_date4, 0), COALESCE(bg.extension_date5, 0), COALESCE(bg.extension_date6, 0)) AS expire_epoch,
              po.ernam       AS do_id,
              do_user.email  AS do_email,
              po.lifnr       AS vendor_id,
              vendor.name1   AS vendor_name,
              vendor.email   AS vendor_email,
              fi.created_by_id AS fi_id,
              fi_user.email  AS fi_email
      FROM      sdbg_entry  AS bg
      LEFT JOIN ekko        AS po       ON (bg.purchasing_doc_no = po.ebeln)
      LEFT JOIN pa0002      AS do_user  ON (do_user.pernr::character varying = po.ernam)
      LEFT JOIN lfa1        AS vendor   ON (vendor.lifnr = po.lifnr)
      -- Finance Officer who accepted the BG
      LEFT JOIN LATERAL (SELECT created_by_id FROM sdbg
                         WHERE sdbg.reference_no = bg.reference_no AND sdbg.status = 'APPROVED'
                         ORDER BY created_at DESC LIMIT 1) AS fi ON true
      LEFT JOIN pa0002      AS fi_user  ON (fi_user.pernr::character varying = fi.created_by_id)
      WHERE bg.status = ANY($1) AND COALESCE(bg.release_date, 0) = 0
    ) AS t
    WHERE t.expire_epoch BETWEEN $2 AND $3`;

  return poolQuery({
    client,
    query: q,
    // EXTENTION: status written when SAP pushes an extension (update_in_all_obps_sdbgs_table)
    values: [[APPROVED, "EXTENTION"], Math.floor(fromDate.getTime() / 1000), Math.floor(toDate.getTime() / 1000)],
  });
}

const vendorReminderMail = async () => {
  if (process.env.SERVER_ENV != LAN_SERVER) return;
  cron.schedule(
    "10 22 * * *",
    () => {
      sendBGReminderMail();
      sendPOMilestoneEXPReminderMail();
    },
    {
      scheduled: true,
    },
  );
};
const drawingAutoAcknowledgeCorn = () => {
  if (process.env.SERVER_ENV != LAN_SERVER) return;
  // "0 22 * * *",
  cron.schedule(
    "0 20 * * *",
    async () => {
      try {
        await getDrawingData();
      } catch (error) {
        console.error("drawingAutoAcknowledgeCorn", error, error.message);
      }
    },
    {
      scheduled: true,
    },
  );
};

function isOver3WorkingDaysOld(inputDate, currentDate) {
  const now = new Date(currentDate);
  const fromDate = new Date(inputDate);
  let count = 0;
  const checkDate = new Date(fromDate);

  while (checkDate < now) {
    const day = checkDate.getDay(); // 0=Sunday, 6=Saturday
    if (day === 0 || day == 6) {
      // Saturday, Sunday – skip
    }

    else {
      // Monday to Friday –> count
      count++;
    }

    checkDate.setDate(checkDate.getDate() + 1);
  }
  return count >= 3;
}

async function getDrawingData() {
  let client;
  try {
    client = await poolClient();
    const getDrawingDataQuery = `
    SELECT *
      FROM drawing as d1
      WHERE d1.status = $1
        AND NOT EXISTS (
          SELECT 1
          FROM drawing d2
          WHERE d2.reference_no = d1.reference_no AND( d2.status = $2 OR  d2.status = $3 )
        )`;

    const result = await poolQuery({ client, query: getDrawingDataQuery, values: [SUBMITTED, ACKNOWLEDGED, REJECTED] });

    if (result.length) {
      for await (let dw of result) {
        if (isOver3WorkingDaysOld(new Date(parseInt(dw.created_at)), new Date())) {
          delete dw.id;
          delete dw.sync;
          delete dw.sync_updated_at;
          delete dw.sync_id;
          const payload = {
            ...dw,
            created_at: getEpochTime(),
            remarks: "AUTO-ACKNOWLEDGE FORM SYSTEM",
            updated_by: "HSL",
            created_by_id: "SYSTEM-AUTO",
            action_by: "SYSTEM-AUTO",
            action_on: "--",
            status: ACKNOWLEDGED,
          };

          const { q, val } = generateQuery(INSERT, "drawing", payload);

          await poolQuery({ client, query: q, values: val });
          await setActualSubmissionDate(payload, MID_DRAWING, { vendor_code: dw.vendor_code }, SUBMITTED, client);
        }
      }

      return true;
    }

    return true;
  } catch (error) {
    console.error("error", error);
    throw error;
  } finally {
    if (client) client.release();
  }
}

async function mailSendCornFn() {
  try {
    let isCompletedTask = false;

    cron.schedule(
      "30 * * * *",
      async () => {
        if (isCompletedTask === TRUE) return;

        isCompletedTask = true;

        try {
          await mailSentCornJob();
        } catch (error) {
          console.error("Mail Cron Failed:", error.message, error.stack);
        } finally {
          isCompletedTask = false;
        }
      },
      { scheduled: process.env.MAIL_TURN_ON === YES },
    );
  } catch (error) {
    console.error("mailSendCornFn error", error);
  }
}

module.exports = { vendorReminderMail, drawingAutoAcknowledgeCorn, mailSendCornFn };
