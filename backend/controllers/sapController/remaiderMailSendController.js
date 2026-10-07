/* eslint-disable no-undef */
const { getQuery, poolClient, poolQuery } = require("../../config/pgDbConfig");
const { INSERT, LAN_SERVER, MID_DRAWING, YES, TRUE } = require("../../lib/constant");
const { SEVEN_DAYS_PRIOR_CON_MILESTONE_DATE, BG_EXPIRY_REMINDER } = require("../../lib/event");
const { SUBMITTED, ACKNOWLEDGED, REJECTED } = require("../../lib/status");
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

  // resSend(res, true, 200, "success", timeLineData, null);
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

  //   GROUP  BY t.ebeln,
  //   t.mid;
  // const q = `SELECT * FROM zpo_milestone WHERE PLAN_DATE BETWEEN '${dueDate} 00:00:00' AND '${dueDate} 23:59:59';`;
  const firstTime = `${dueDate} 00:00:00`;
  const lastTime = `${dueDate} 23:59:59`;
  const result = await getQuery({ query: q, values: [firstTime, lastTime] });
  return result;
}

// Per To-Be doc 6.2.3: staged alerts at 45/30/15 days before BG expiry,
// sent to Dealing Officer, Finance Officer and Vendor.
const BG_REMINDER_DAYS = [45, 30, 15];

const sendBGReminderMail = async () => {
  for (const days of BG_REMINDER_DAYS) {
    const bgData = await getBGExpireData(days);
    const bgTimelineData = getMaxExpireDate(bgData);

    for (const data of bgTimelineData) {
      const users = [];
      if (data?.do_email) users.push({ u_email: data.do_email, u_id: data.do_id, u_type: "do" });
      if (data?.vendor_email) users.push({ u_email: data.vendor_email, u_id: data.vendor_id, u_type: "vendor" });
      if (!users.length) continue;

      await sendMail(BG_EXPIRY_REMINDER, { ...data, days_left: days }, { users }, BG_EXPIRY_REMINDER);
    }
  }
};

async function getBGExpireData(days) {
  const REMINDE_BEFORE_DAYS = days * 24 * 60 * 60 * 1000;
  const currentDate = new Date();
  const dueDateObj = new Date(currentDate.getTime() + REMINDE_BEFORE_DAYS);
  const dueDate = dueDateObj.toISOString().split("T")[0];

  let q = `SELECT    sap_bg.file_no,
        sap_bg.ref_no,
        sap_bg.po_number AS purchasing_doc_no,
        sap_bg.validity_date,
        sap_bg.extention_date1,
        sap_bg.extention_date2,
        sap_bg.extention_date3,
        sap_bg.extention_date4,
        sap_bg.extention_date5,
        sap_bg.extention_date6,
        do_user.cname AS do_name,
        do_user.email AS do_email,
        po.ernam      AS do_id,
        po.lifnr      AS vendor_id,
        vendor.name1  AS vendor_name,
        vendor.email  AS vendor_email
FROM      zfi_bgm_1   AS sap_bg
LEFT JOIN ekko        AS po
ON       (
                  sap_bg.po_number = po.ebeln)
LEFT JOIN pa0002 AS do_user
ON       (
                  do_user.pernr:: character VARYING = po.ernam)
LEFT JOIN lfa1 AS vendor
ON       (
                  vendor.lifnr = po.lifnr)
WHERE     (
                  sap_bg.validity_date = $1
        OR        sap_bg.extention_date1 = $1
        OR        sap_bg.extention_date2 = $1
        OR        sap_bg.extention_date3 = $1
        OR        sap_bg.extention_date4 = $1
        OR        sap_bg.extention_date5 = $1
        OR        sap_bg.extention_date6 = $1 )`;

  const result = await getQuery({ query: q, values: [dueDate] });
  return result;
}

function getMaxExpireDate(data) {
  data.forEach((item) => {
    const dates = [
      item.validity_date,
      item.extention_date1,
      item.extention_date2,
      item.extention_date3,
      item.extention_date4,
      item.extention_date5,
      item.extention_date6,
    ].filter((date) => date !== null);

    const maxDate = new Date(Math.max(...dates.map((date) => date.getTime())));

    item.expire_date = maxDate;
  });
  return data;
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
    // } else if (day === 6) {
    //   // Saturday – check if it's 2nd or 4th
    //   const date = checkDate.getDate();
    //   const month = checkDate.getMonth();
    //   const year = checkDate.getFullYear();

    //   const firstDay = new Date(year, month, 1);
    //   let saturdayCount = 0;

    //   for (let d = 1; d <= date; d++) {
    //     const temp = new Date(year, month, d);
    //     if (temp.getDay() === 6) {
    //       saturdayCount++;
    //     }
    //   }

    //   if (saturdayCount === 2 || saturdayCount === 4) {
    //     count++;
    //   }
    // }
    else {
      // Monday to Friday –> count
      count++;
    }

    checkDate.setDate(checkDate.getDate() + 1);
  }
  return count >= 3;
}

// inputDate = '2025-07-02'
// currentDate = '2025-07-07';

// const r = isOver3WorkingDaysOld(new Date(inputDate), new Date(currentDate));

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

          // promiseArr.push(poolQuery({ client, query: q, values: val }));
          await poolQuery({ client, query: q, values: val });
          // promiseArr.push(setActualSubmissionDate(payload, MID_DRAWING, { vendor_code: dw.vendor_code }, SUBMITTED, client));
          await setActualSubmissionDate(payload, MID_DRAWING, { vendor_code: dw.vendor_code }, SUBMITTED, client);
        }
      }

      // const re = await Promise.all(promiseArr);
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
