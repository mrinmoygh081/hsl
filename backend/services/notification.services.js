
const { poolQuery } = require("../config/pgDbConfig");
const { getEpochTime } = require("../lib/utils");

const createNotification = async (client, data) => {
  const {
    recipient_id,
    module_name,
    notification_type,
    purchasing_doc_no,
    reference_no,
    title,
    message
  } = data;

  const now = getEpochTime();

  const query = `
    INSERT INTO notifications (
      recipient_id,
      module_name,
      notification_type,
      purchasing_doc_no,
      reference_no,
      title,
      message,
      is_read,
      created_at,
      updated_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, FALSE, $8, $8)
    RETURNING *
  `;

  const result = await poolQuery({
    client,
    query,
    values: [
      recipient_id,
      module_name,
      notification_type,
      purchasing_doc_no,
      reference_no,
      title,
      message,
      now
    ]
  });

  return result[0] || null;
};


const createQAPSubmissionNotification = async (client, payload) => {
  // Get the assigned officer from assigned_to
  const assignedOfficer = await poolQuery({
    client,
    query: `
      SELECT assigned_to
      FROM qap_submission
      WHERE purchasing_doc_no = $1
        AND assigned_to IS NOT NULL
        AND TRIM(assigned_to) <> ''
      ORDER BY id DESC
      LIMIT 1
    `,
    values: [payload.purchasing_doc_no]
  });

  if (!assignedOfficer.length) {
    console.warn(
      "No assigned QAP officer found for PO:",
      payload.purchasing_doc_no
    );
    return null;
  }

  const recipientId = assignedOfficer[0].assigned_to;

  return createNotification(client, {
    recipient_id: recipientId,
    module_name: "QAP",
    notification_type:
      payload.status === "RE_SUBMITTED"
        ? "QAP_RESUBMITTED"
        : "QAP_SUBMITTED",
    purchasing_doc_no: payload.purchasing_doc_no,
    reference_no: payload.reference_no || null,
    title:
      payload.status === "RE_SUBMITTED"
        ? "QAP Resubmitted"
        : "New QAP Submitted",
    message:
      `Vendor submitted QAP ${payload.reference_no} ` +
      `for PO ${payload.purchasing_doc_no}.`
  });
};


module.exports = {
  createNotification,
  createQAPSubmissionNotification
};
