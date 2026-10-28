const { getQuery } = require("../config/pgDbConfig");
const { resSend } = require("../lib/resSend");
const Messages = require("../utils/messages");

const getMyNotifications = async (req, res) => {
  try {
    const tokenData = req.tokenData;
    const recipientId = tokenData?.vendor_code;

    if (!recipientId) {
      return resSend(res, false, 401, "Unauthorized user", null, null);
    }

    const limit = Math.min(
      Math.max(parseInt(req.query.limit, 10) || 20, 1),
      100
    );
    const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);

    const query = `
      SELECT
        id,
        recipient_id,
        module_name,
        notification_type,
        purchasing_doc_no,
        reference_no,
        title,
        message,
        is_read,
        read_at,
        created_at
      FROM notifications
      WHERE recipient_id = $1
      ORDER BY created_at DESC, id DESC
      LIMIT $2 OFFSET $3
    `;

    const notifications = await getQuery({
      query,
      values: [String(recipientId), limit, offset],
    });

    const unreadQuery = `
      SELECT COUNT(*) AS unread_count
      FROM notifications
      WHERE recipient_id = $1
        AND is_read = FALSE
    `;

    const unreadResult = await getQuery({
      query: unreadQuery,
      values: [String(recipientId)],
    });

    return resSend(res, true, 200, "Notifications fetched successfully", {
      notifications,
      unread_count: Number(unreadResult?.[0]?.unread_count || 0),
      limit,
      offset,
    }, null);
  } catch (error) {
    console.error("getMyNotifications error:", error);
    return resSend(
      res,
      false,
      500,
      Messages.SOMTHING_WENT_WRONG,
      null,
      null
    );
  }
};

module.exports = {
  getMyNotifications,
};