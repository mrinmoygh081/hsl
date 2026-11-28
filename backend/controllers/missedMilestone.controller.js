
const { poolClient, poolQuery } =
    require("../config/pgDbConfig");


// Get logged-in user's identity
const getRecipientInfo = (req) => {
    const tokenData = req.tokenData;

    if (!tokenData) {
        throw new Error("Invalid user information");
    }

    const roles = (tokenData.roles || []).map(role =>
        String(role).toLowerCase()
    );

    const isVendor =
        Number(tokenData.user_type) === 1 ||
        roles.includes("vendor");

    const recipientType = isVendor ? "VENDOR" : "OFFICER";

    const recipientKey = String(
        isVendor
            ? (
                tokenData.vendor_code ||
                tokenData.username ||
                tokenData.sub ||
                ""
            )
            : (
                tokenData.username ||
                tokenData.sub ||
                ""
            )
    ).trim();

    if (!recipientKey) {
        throw new Error("Invalid user information");
    }

    return {
        recipientType,
        recipientKey
    };
};


// Common error handler
const handleError = (res, error, functionName) => {
    console.error(`${functionName}:`, error);

    const isAuthError =
        error.message === "Invalid user information";

    return res.status(isAuthError ? 401 : 500).json({
        success: false,
        message: isAuthError
            ? error.message
            : "Something went wrong"
    });
};


// 1. Get Active Notifications
const getNotifications = async (req, res) => {
    let client;

    try {
        const { recipientType, recipientKey } =
            getRecipientInfo(req);

        client = await poolClient();

        const unreadOnly = req.query.unread_only === "true";

        const limit = Math.min(
            Math.max(parseInt(req.query.limit, 10) || 20, 1),
            100
        );

        const page = Math.max(
            parseInt(req.query.page, 10) || 1,
            1
        );

        const offset = (page - 1) * limit;

        // Only active notifications
        const query = `
            SELECT
                id,
                purchasing_doc_no,
                module_name,
                milestone_name,
                recipient_type,
                recipient_key,
                contractual_date,
                actual_submission_date,
                title,
                message,
                is_read,
                is_active,
                resolved_at,
                created_at,
                updated_at
            FROM po_missed_milestone_notifications
            WHERE recipient_type = $1
              AND recipient_key = $2
              AND is_active = TRUE
              AND ($3::boolean = FALSE OR is_read = FALSE)
            ORDER BY created_at DESC
            LIMIT $4 OFFSET $5
        `;

        const notifications = await poolQuery({
            client,
            query,
            values: [
                recipientType,
                recipientKey,
                unreadOnly,
                limit,
                offset
            ]
        });

        // Count only active notifications
        const countQuery = `
            SELECT
                COUNT(*)::int AS total,
                COUNT(*) FILTER (
                    WHERE is_read = FALSE
                )::int AS unread_count,
                COUNT(*) FILTER (
                    WHERE is_active = TRUE
                )::int AS active_count
            FROM po_missed_milestone_notifications
            WHERE recipient_type = $1
              AND recipient_key = $2
              AND is_active = TRUE
        `;

        const countResult = await poolQuery({
            client,
            query: countQuery,
            values: [
                recipientType,
                recipientKey
            ]
        });

        return res.status(200).json({
            success: true,
            message: "Notifications fetched successfully",
            details: {
                notifications,
                pagination: {
                    page,
                    limit,
                    total: countResult[0].total
                },
                unread_count: countResult[0].unread_count,
                active_count: countResult[0].active_count
            }
        });

    } catch (error) {
        return handleError(res, error, "getNotifications");

    } finally {
        if (client) client.release();
    }
};


// 2. Get Active Unread Count
const getUnreadCount = async (req, res) => {
    let client;

    try {
        const { recipientType, recipientKey } =
            getRecipientInfo(req);

        client = await poolClient();

        const query = `
            SELECT
                COUNT(*)::int AS unread_count
            FROM po_missed_milestone_notifications
            WHERE recipient_type = $1
              AND recipient_key = $2
              AND is_active = TRUE
              AND is_read = FALSE
        `;

        const result = await poolQuery({
            client,
            query,
            values: [
                recipientType,
                recipientKey
            ]
        });

        return res.status(200).json({
            success: true,
            message: "Unread count fetched successfully",
            unread_count: result[0].unread_count
        });

    } catch (error) {
        return handleError(res, error, "getUnreadCount");

    } finally {
        if (client) client.release();
    }
};


// 3. Mark Single Notification as Read
const markAsRead = async (req, res) => {
    let client;

    try {
        const { recipientType, recipientKey } =
            getRecipientInfo(req);

        const notificationId = parseInt(req.params.id, 10);

        if (!Number.isInteger(notificationId) || notificationId <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid notification ID"
            });
        }

        client = await poolClient();

        const query = `
            UPDATE po_missed_milestone_notifications
            SET
                is_read = TRUE,
                updated_at = NOW()
            WHERE id = $1
              AND recipient_type = $2
              AND recipient_key = $3
              AND is_active = TRUE
            RETURNING id, is_read, is_active, updated_at
        `;

        const result = await poolQuery({
            client,
            query,
            values: [
                notificationId,
                recipientType,
                recipientKey
            ]
        });

        if (!result.length) {
            return res.status(404).json({
                success: false,
                message: "Active notification not found"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Notification marked as read",
            details: result[0]
        });

    } catch (error) {
        return handleError(res, error, "markAsRead");

    } finally {
        if (client) client.release();
    }
};


// 4. Mark All Active Notifications as Read
const markAllAsRead = async (req, res) => {
    let client;

    try {
        const { recipientType, recipientKey } =
            getRecipientInfo(req);

        client = await poolClient();

        const query = `
            UPDATE po_missed_milestone_notifications
            SET
                is_read = TRUE,
                updated_at = NOW()
            WHERE recipient_type = $1
              AND recipient_key = $2
              AND is_active = TRUE
              AND is_read = FALSE
            RETURNING id
        `;

        const result = await poolQuery({
            client,
            query,
            values: [
                recipientType,
                recipientKey
            ]
        });

        return res.status(200).json({
            success: true,
            message: "All active notifications marked as read",
            updated_count: result.length
        });

    } catch (error) {
        return handleError(res, error, "markAllAsRead");

    } finally {
        if (client) client.release();
    }
};


module.exports = {
    getNotifications,
    getUnreadCount,
    markAsRead,
    markAllAsRead
};
