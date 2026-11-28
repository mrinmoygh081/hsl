
const { getQuery, poolClient, poolQuery } =
    require("../config/pgDbConfig");
const { MISSED_MILESTONE_MODULES } = require("../config/missedMilestone");

// IMPORTANT: Change this path to the actual location of your sendMail helper.
const { sendMail } = require("./mail.services");

// --------------------------------------------------
// 1. GET OVERDUE MILESTONES
// --------------------------------------------------

const getMissedMilestones = async (client) => {
    const results = [];

    for (const module of MISSED_MILESTONE_MODULES) {
        const query = `
            WITH latest_activity AS (
                SELECT DISTINCT ON (purchasing_doc_no)
                    purchasing_doc_no,
                    vendor_code,
                    ${module.assignmentColumn} AS officer_id
                FROM ${module.activityTable}
                WHERE ${module.assignmentColumn} IS NOT NULL
                   OR vendor_code IS NOT NULL
                ORDER BY purchasing_doc_no, created_at DESC
            )
            SELECT
                zm.ebeln AS purchasing_doc_no,
                zm.${module.contractualColumn}::date AS contractual_date,
                la.vendor_code,
                la.officer_id
            FROM zpo_milestone zm
            LEFT JOIN actualsubmissiondate am
                ON am.purchasing_doc_no = zm.ebeln
                AND am.milestoneid = $1
            LEFT JOIN latest_activity la
                ON la.purchasing_doc_no = zm.ebeln
            WHERE zm.${module.contractualColumn} IS NOT NULL
              AND zm.${module.contractualColumn}::date < CURRENT_DATE
              AND am.id IS NULL
        `;

        const rows = await poolQuery({
            client,
            query,
            values: [module.milestoneId]
        });

        rows.forEach((row) => {
            results.push({
                ...row,
                module_name: module.moduleName,
                milestone_name: module.milestoneName,
                milestone_id: module.milestoneId
            });
        });
    }

    return results;
};

// --------------------------------------------------
// 2. GET VENDOR DETAILS
// --------------------------------------------------

const getVendorDetails = async (client, vendorCode) => {
    if (!vendorCode) return null;

    const query = `
        SELECT
            lifnr AS vendor_code,
            name AS name,
            email AS email
        FROM lfa1
        WHERE lifnr = $1
        LIMIT 1
    `;

    const rows = await poolQuery({
        client,
        query,
        values: [vendorCode]
    });

    return rows[0] || null;
};

// --------------------------------------------------
// 3. GET OFFICER DETAILS
// --------------------------------------------------

const getOfficerDetails = async (client, officerId) => {
    if (!officerId) return null;

    const query = `
        SELECT
            pernr AS id,
            cname AS name,
            email AS email
        FROM pa0002
        WHERE pernr = $1
        LIMIT 1
    `;

    const rows = await poolQuery({
        client,
        query,
        values: [officerId]
    });

    return rows[0] || null;
};

// --------------------------------------------------
// 4. UPSERT NOTIFICATION
// --------------------------------------------------

const upsertNotification = async (client, data) => {
    const query = `
        INSERT INTO po_missed_milestone_notifications (
            purchasing_doc_no,
            module_name,
            milestone_name,
            recipient_type,
            recipient_key,
            contractual_date,
            title,
            message
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
        ON CONFLICT (
            purchasing_doc_no,
            module_name,
            recipient_type,
            recipient_key
        )
        DO UPDATE SET
            contractual_date = EXCLUDED.contractual_date,
            title = EXCLUDED.title,
            message = EXCLUDED.message,
            is_active = TRUE,
            actual_submission_date = NULL,
            resolved_at = NULL,
            updated_at = CURRENT_TIMESTAMP
        RETURNING *;
    `;

    const values = [
        data.purchasing_doc_no,
        data.module_name,
        data.milestone_name,
        data.recipient_type,
        String(data.recipient_key),
        data.contractual_date,
        data.title,
        data.message
    ];

    const rows = await poolQuery({ client, query, values });

    return rows[0];
};

// --------------------------------------------------
// 5. CREATE VENDOR AND OFFICER NOTIFICATIONS
// --------------------------------------------------

const createMissedNotifications = async (client, milestone) => {
    const {
        purchasing_doc_no,
        module_name,
        milestone_name,
        contractual_date,
        vendor_code,
        officer_id
    } = milestone;

    const vendor = await getVendorDetails(client, vendor_code);

    const officer = officer_id
        ? await getOfficerDetails(client, officer_id)
        : null;

    const message =
        `${milestone_name} submission is overdue for PO ${purchasing_doc_no}. ` +
        `Contractual date: ${contractual_date}.`;

    const notifications = [];

    if (vendor?.vendor_code) {
        const notification = await upsertNotification(client, {
            purchasing_doc_no,
            module_name,
            milestone_name,
            recipient_type: "VENDOR",
            recipient_key: vendor.vendor_code,
            contractual_date,
            title: `${milestone_name} Missed`,
            message
        });

        notifications.push({
            notification,
            recipient: vendor,
            userType: "vendor"
        });
    }

    if (officer?.id) {
        const notification = await upsertNotification(client, {
            purchasing_doc_no,
            module_name,
            milestone_name,
            recipient_type: "OFFICER",
            recipient_key: officer.id,
            contractual_date,
            title: `${milestone_name} Missed`,
            message
        });

        notifications.push({
            notification,
            recipient: officer,
            userType: "do"
        });
    }

    return notifications;
};

// --------------------------------------------------
// 6. SEND DAILY EMAIL
// --------------------------------------------------

const sendDailyMissedEmail = async (
    client,
    notification,
    recipient,
    userType
) => {
    if (!recipient?.email) return;

    // Claim today's email. A failed attempt can be retried.
    const claimQuery = `
        INSERT INTO po_missed_milestone_email_logs (
            notification_id,
            email_date,
            recipient_email,
            status
        )
        VALUES ($1, CURRENT_DATE, $2, 'PENDING')
        ON CONFLICT (notification_id, email_date)
        DO UPDATE SET
            recipient_email = EXCLUDED.recipient_email,
            status = 'PENDING',
            error_message = NULL
        WHERE po_missed_milestone_email_logs.status = 'FAILED'
        RETURNING id;
    `;

    const claimed = await poolQuery({
        client,
        query: claimQuery,
        values: [notification.id, recipient.email]
    });

    if (!claimed.length) return;

    try {
        const data = {
            purchasing_doc_no: notification.purchasing_doc_no,
            module_name: notification.module_name,
            milestone_name: notification.milestone_name,
            contractual_date: notification.contractual_date,
            title: notification.title,
            message: notification.message,
            recipient_name: recipient.name || ""
        };

        await sendMail(
            "MISSED_MILESTONE",
            data,
            {
                users: [
                    {
                        u_type: userType,
                        u_email: recipient.email
                    }
                ]
            },
            "MISSED_MILESTONE"
        );

        await poolQuery({
            client,
            query: `
                UPDATE po_missed_milestone_email_logs
                SET
                    status = 'SENT',
                    sent_at = CURRENT_TIMESTAMP
                WHERE id = $1
            `,
            values: [claimed[0].id]
        });

    } catch (error) {
        await poolQuery({
            client,
            query: `
                UPDATE po_missed_milestone_email_logs
                SET
                    status = 'FAILED',
                    error_message = $2
                WHERE id = $1
            `,
            values: [claimed[0].id, error.message]
        });

        console.error("Missed milestone email error:", error);
    }
};

// --------------------------------------------------
// 7. RESOLVE SUBMITTED MILESTONES
// --------------------------------------------------

const resolveSubmittedMilestones = async (client) => {
    for (const module of MISSED_MILESTONE_MODULES) {
        const query = `
            UPDATE po_missed_milestone_notifications n
            SET
                is_active = FALSE,
                actual_submission_date =
                    TO_TIMESTAMP(a.actualsubmissiondate / 1000.0)::date,
                resolved_at = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP
            FROM actualsubmissiondate a
            WHERE a.purchasing_doc_no = n.purchasing_doc_no
              AND a.milestoneid = $1
              AND n.module_name = $2
              AND n.is_active = TRUE
        `;

        await poolQuery({
            client,
            query,
            values: [module.milestoneId, module.moduleName]
        });
    }
};

// --------------------------------------------------
// 8. MAIN JOB
// --------------------------------------------------

const runMissedMilestoneJob = async () => {
    let client;

    try {
        client = await poolClient();

        // First resolve already submitted milestones.
        await resolveSubmittedMilestones(client);

        // Find all overdue milestones.
        const milestones = await getMissedMilestones(client);

        let notificationCount = 0;
        let emailCount = 0;

        for (const milestone of milestones) {
            const notifications = await createMissedNotifications(
                client,
                milestone
            );

            notificationCount += notifications.length;

            for (const item of notifications) {
                await sendDailyMissedEmail(
                    client,
                    item.notification,
                    item.recipient,
                    item.userType
                );

                emailCount++;
            }
        }

        console.log(
            `Missed Milestone Job Completed. ` +
            `Milestones: ${milestones.length}, ` +
            `Notifications: ${notificationCount}, ` +
            `Email attempts: ${emailCount}`
        );

    } catch (error) {
        console.error("Missed Milestone Job Error:", error);
        throw error;

    } finally {
        if (client) client.release();
    }
};

module.exports = {
    runMissedMilestoneJob,
    getMissedMilestones,
    resolveSubmittedMilestones,
    createMissedNotifications
};
