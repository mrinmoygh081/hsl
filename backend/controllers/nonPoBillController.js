
const { create_reference_no } = require("../services/po.services");
const { resSend } = require("../lib/resSend");
const { getQuery, poolClient, poolQuery } = require("../config/pgDbConfig");
const { generateQuery, getEpochTime } = require("../lib/utils");

const Message = require("../utils/messages");
const {
    USER_TYPE_VENDOR,
    USER_TYPE_HSL,
    USER_TYPE_HSL_PURCHASE,
    USER_TYPE_HSL_FINANCE
} = require("../lib/constant");


const TABLE = "non_po_bills";

const STATUS = {
    SUBMITTED: "SUBMITTED",
    FORWARDED_TO_FINANCE: "FORWARDED_TO_FINANCE",
    ASSIGNED_TO_FINANCE: "ASSIGNED_TO_FINANCE",
    APPROVED: "APPROVED",
    REJECTED: "REJECTED"
};

const ACTION = {
    SUBMITTED: "SUBMITTED",
    FORWARDED: "FORWARDED",
    ASSIGNED: "ASSIGNED",
    APPROVED: "APPROVED",
    REJECTED: "REJECTED"
};

// --------------------------------------------------
// Common Helpers
// --------------------------------------------------

const isVendor = (tokenData) =>
    Number(tokenData?.user_type) === Number(USER_TYPE_VENDOR);

const getUserCode = (tokenData) => tokenData?.vendor_code || null;

const sendError = (res, message, code = 400) =>
    resSend(res, false, code, message, null, null);

const getOfficer = async (client, vendorCode) => {
    const result = await client.query(
        `SELECT
            id,
            username,
            name,
            vendor_code,
            user_type,
            department_id,
            internal_role_id,
            is_active
         FROM auth
         WHERE vendor_code = $1
           AND user_type = 2
           AND is_active = 1
         LIMIT 1`,
        [vendorCode]
    );

    return result.rows[0] || null;
};

const isCommercialOfficer = (officer) =>
    !!officer &&
    Number(officer.user_type) === Number(USER_TYPE_HSL) &&
    Number(officer.department_id) !== Number(USER_TYPE_HSL_FINANCE);

const isFinanceOfficer = (officer) =>
    !!officer &&
    Number(officer.user_type) === Number(USER_TYPE_HSL) &&
    Number(officer.department_id) === Number(USER_TYPE_HSL_FINANCE);

const isMainOfficer = (officer) =>
    Number(officer?.internal_role_id) === 1;

const getBillForUpdate = async (client, billId) => {
    const result = await client.query(
        `SELECT * FROM ${TABLE} WHERE id = $1 FOR UPDATE`,
        [billId]
    );

    return result.rows[0] || null;
};

const rollback = async (client) => {
    if (client) {
        try {
            await client.query("ROLLBACK");
        } catch (error) {
            console.error("Rollback error:", error);
        }
    }
};

// --------------------------------------------------
// 1. Vendor Submit Non-PO Bill
// POST /bill/submit
// --------------------------------------------------

const submitNonPoBill = async (req, res) => {
  let client;
  let transactionStarted = false;

  try {
    const tokenData = req.tokenData;
    const body = req.body || {};

    const vendorSubmit = isVendor(tokenData);

    const officerSubmit = Number(tokenData.user_type) === Number(USER_TYPE_HSL);

    // Only Vendor or HSL Officer can submit
    if (!vendorSubmit && !officerSubmit) {
      return sendError(
        res,
        "Only Vendor or HSL Officer can submit Non-PO bills.",
        403,
      );
    }

    if (body.status !== STATUS.SUBMITTED) {
      return sendError(res, "Invalid status. Only SUBMITTED is allowed.");
    }

    if (!req.file) {
      return sendError(res, "Bill file is required.");
    }

    // Vendor code
    const vendorCode = vendorSubmit ? tokenData.vendor_code : body.vendor_code;

    if (!vendorCode) {
      return sendError(res, "Vendor Code is required.");
    }

    const assignTo = body.assign_to;
    const remarks = body.remarks || "";

    if (!assignTo || !remarks.trim()) {
      return sendError(res, "Commercial Officer and remarks are required.");
    }

    client = await poolClient();

    // Validate Vendor
    const vendorResult = await client.query(
      `SELECT lifnr, name
             FROM lfa1
             WHERE TRIM(lifnr::text) = TRIM($1::text)`,
      [vendorCode],
    );

    if (!vendorResult.rows.length) {
      return sendError(res, "Invalid Vendor Code.");
    }

    // Validate Commercial Officer
    const officer = await getOfficer(client, assignTo);

    if (!officer || !isCommercialOfficer(officer)) {
      return sendError(res, "Please select a valid Commercial Officer.");
    }

    const actionOn = getEpochTime();

    const referenceNo = create_reference_no("NONPO", vendorCode);

    const supportingDoc = body.supporting_doc
      ? typeof body.supporting_doc === "string"
        ? body.supporting_doc
        : JSON.stringify(body.supporting_doc)
      : null;

    // HSL Officer code only when officer submits
    const submittedBy = officerSubmit ? getUserCode(tokenData) : null;

    await client.query("BEGIN");
    transactionStarted = true;

    const insertResult = await client.query(
      `INSERT INTO non_po_bills
            (
                reference_no,
                file_name,
                vendor_code,
                assigned_from,
                assigned_to,
                is_assign,
                file_path,
                action_type,
                remarks,
                status,
                updated_by,
                created_at,
                created_by_name,
                created_by_id,
                supporting_doc,
                sync,
                action_by,
                action_on,
                action_to,
                submitted_by
            )
            VALUES
            (
                $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,
                $11,$12,$13,$14,$15,$16,$17,$18,$19,$20
            )
            RETURNING *`,
      [
        referenceNo,
        req.file.filename || "",
        vendorCode,
        null,
        null,
        0,
        req.file.path || "",
        ACTION.SUBMITTED,
        remarks,
        STATUS.SUBMITTED,
        vendorSubmit ? "VENDOR" : "HSL",
        actionOn,
        tokenData.name || "",
        tokenData.id || null,
        supportingDoc,
        0,
        vendorCode,
        actionOn,
        assignTo,
        submittedBy,
      ],
    );

    await client.query("COMMIT");
    transactionStarted = false;

    return resSend(
      res,
      true,
      200,
      "Non-PO bill submitted successfully.",
      insertResult.rows[0],
      null,
    );
  } catch (error) {
    if (client && transactionStarted) {
      await rollback(client);
    }

    console.error("submitNonPoBill:", error);

    return resSend(res, false, 500, Message.SERVER_ERROR, null, null);
  } finally {
    if (client) client.release();
  }
};

// --------------------------------------------------
// 2. Vendor My Bill List
// GET /bill/my-list
// --------------------------------------------------

const getNonPoBillList = async (req, res) => {
  let client;

  try {
    const tokenData = req.tokenData;
    const userCode = getUserCode(tokenData);

    if (!userCode) {
      return resSend(res, false, 401, "User code not found.", null, null);
    }

    client = await poolClient();

    const query = `
            SELECT
                b.*,

                COALESCE(
                    NULLIF(TRIM(action_by_user.cname), ''),
                    NULLIF(TRIM(v_action_by.name), '')
                ) AS action_by_name,

                COALESCE(
                    NULLIF(TRIM(action_to_user.cname), ''),
                    NULLIF(TRIM(v_action_to.name), '')
                ) AS action_to_name,

                NULLIF(
                    TRIM(submitted_by_user.cname),
                    ''
                ) AS submitted_by_name

            FROM non_po_bills b

            LEFT JOIN pa0002 action_by_user
                ON TRIM(action_by_user.pernr::text) =
                   TRIM(b.action_by::text)

            LEFT JOIN lfa1 v_action_by
                ON TRIM(v_action_by.lifnr::text) =
                   TRIM(b.action_by::text)

            LEFT JOIN pa0002 action_to_user
                ON TRIM(action_to_user.pernr::text) =
                   TRIM(b.action_to::text)

            LEFT JOIN lfa1 v_action_to
                ON TRIM(v_action_to.lifnr::text) =
                   TRIM(b.action_to::text)

            LEFT JOIN pa0002 submitted_by_user
                ON TRIM(submitted_by_user.pernr::text) =
                   TRIM(b.submitted_by::text)

            WHERE b.reference_no IN (
                SELECT DISTINCT reference_no
                FROM non_po_bills
                WHERE
                    vendor_code = $1
                    OR action_by = $1
                    OR action_to = $1
                    OR assigned_from = $1
                    OR assigned_to = $1
                    OR submitted_by = $1
            )

            ORDER BY b.id DESC
        `;

    const result = await client.query(query, [userCode]);

    return resSend(
      res,
      true,
      200,
      "Non-PO Bill list fetched successfully.",
      result.rows,
      null,
    );
  } catch (error) {
    console.error("getNonPoBillList:", error);

    return resSend(res, false, 500, Message.SERVER_ERROR, null, null);
  } finally {
    if (client) {
      client.release();
    }
  }
};




// --------------------------------------------------
// 9. Commercial Officer Dropdown
// GET /commercial-officer-list
// --------------------------------------------------

const getCommercialOfficerList = async (req, res) => {
    let client;

    try {
        client = await poolClient();

        const result = await client.query(
            `SELECT
                vendor_code,
                username,
                name,
                department_id,
                internal_role_id
             FROM auth
             WHERE user_type = $1
               AND department_id <> $2
               AND is_active = 1
             ORDER BY name ASC`,
            [USER_TYPE_HSL, USER_TYPE_HSL_FINANCE]
        );

        return resSend(
            res,
            true,
            200,
            "Commercial Officer list fetched successfully.",
            result.rows,
            null
        );

    } catch (error) {
        console.error("getCommercialOfficerList:", error);

        return resSend(
            res,
            false,
            500,
            Message.SERVER_ERROR,
            null,
            null
        );
    } finally {
        if (client) client.release();
    }
};


const nonPoBillAction = async (req, res) => {
    let client;
    let transactionStarted = false;

    try {
        const tokenData = req.tokenData;
        const userCode = getUserCode(tokenData);

        const {
            reference_no,
            status,
            remarks,
            assign_to
        } = req.body || {};

        if (!userCode) {
            return sendError(res, "User code not found.", 401);
        }

        if (
            !reference_no ||
            !status ||
            typeof remarks !== "string" ||
            !remarks.trim()
        ) {
            return sendError(
                res,
                "Reference number, status and remarks are required."
            );
        }

        const actionStatus = String(status).trim().toUpperCase();

        if (!["FORWARD", "APPROVE", "REJECT"].includes(actionStatus)) {
            return sendError(
                res,
                "Invalid status. Allowed: FORWARD, APPROVE, REJECT."
            );
        }

        client = await poolClient();

        await client.query("BEGIN");
        transactionStarted = true;

        // Get logged-in officer
        const officer = await getOfficer(client, userCode);

        if (!officer) {
            await rollback(client);
            transactionStarted = false;

            return sendError(res, "Unauthorized user.", 403);
        }

        const isHslOfficer =
            Number(officer.user_type) === Number(USER_TYPE_HSL);

        const isFinance =
            isHslOfficer &&
            Number(officer.department_id) === Number(USER_TYPE_HSL_FINANCE);

        const isCommercial =
            isHslOfficer &&
            Number(officer.department_id) !== Number(USER_TYPE_HSL_FINANCE);

        // Get latest bill record
        const billResult = await client.query(
            `SELECT *
             FROM ${TABLE}
             WHERE reference_no = $1
             ORDER BY id DESC
             LIMIT 1
             FOR UPDATE`,
            [reference_no]
        );

        if (!billResult.rows.length) {
            await rollback(client);
            transactionStarted = false;

            return sendError(res, "Bill not found.", 404);
        }

        const bill = billResult.rows[0];

        let newStatus;
        let newAction;
        let actionTo = null;

        // --------------------------------
        // 1. FORWARD: Commercial to ANY Finance Officer
        // --------------------------------
        if (actionStatus === "FORWARD") {

            if (
                !isCommercial ||
                bill.status !== STATUS.SUBMITTED ||
                bill.action_to !== userCode
            ) {
                await rollback(client);
                transactionStarted = false;

                return sendError(
                    res,
                    "Only assigned Commercial Officer can forward this bill.",
                    403
                );
            }

            if (!assign_to) {
                await rollback(client);
                transactionStarted = false;

                return sendError(
                    res,
                    "Finance Officer is required."
                );
            }

            // Validate selected Finance Officer
            const financeResult = await client.query(
                `SELECT vendor_code, name
                 FROM auth
                 WHERE vendor_code = $1
                   AND user_type = $2
                   AND department_id = $3
                   AND is_active = 1
                 LIMIT 1`,
                [
                    assign_to,
                    USER_TYPE_HSL,
                    USER_TYPE_HSL_FINANCE
                ]
            );

            if (!financeResult.rows.length) {
                await rollback(client);
                transactionStarted = false;

                return sendError(
                    res,
                    "Please select a valid active Finance Officer."
                );
            }

            actionTo = financeResult.rows[0].vendor_code;

            newStatus = STATUS.FORWARDED_TO_FINANCE;
            newAction = ACTION.FORWARDED;
        }

        // --------------------------------
        // 2. APPROVE: Forwarded Finance Officer only
        // --------------------------------
        // --------------------------------
        else if (actionStatus === "APPROVE") {

            const isForwardedFinance =
                isFinance &&
                bill.status === STATUS.FORWARDED_TO_FINANCE &&
                String(bill.action_to || "").trim() === String(userCode).trim();

            const isAssignedFinance =
                isFinance &&
                bill.status === STATUS.ASSIGNED_TO_FINANCE &&
                String(bill.assigned_to || "").trim() === String(userCode).trim();

            if (!isForwardedFinance && !isAssignedFinance) {
                await rollback(client);
                transactionStarted = false;

                return sendError(
                    res,
                    "Only the responsible Finance Officer can approve this bill.",
                    403
                );
            }

            newStatus = STATUS.APPROVED;
            newAction = ACTION.APPROVED;
        }

        // --------------------------------
        // 3. REJECT: Assigned Commercial / Forwarded Finance
        // --------------------------------
        else if (actionStatus === "REJECT") {

        const isCommercialReject =
            isCommercial &&
            bill.status === STATUS.SUBMITTED &&
            String(bill.action_to || "").trim() === String(userCode).trim();

        const isForwardedFinanceReject =
            isFinance &&
            bill.status === STATUS.FORWARDED_TO_FINANCE &&
            String(bill.action_to || "").trim() === String(userCode).trim();

        const isAssignedFinanceReject =
            isFinance &&
            bill.status === STATUS.ASSIGNED_TO_FINANCE &&
            String(bill.assigned_to || "").trim() === String(userCode).trim();

        if (
            !isCommercialReject &&
            !isForwardedFinanceReject &&
            !isAssignedFinanceReject
        ) {
            await rollback(client);
            transactionStarted = false;

            return sendError(
                res,
                "You are not authorized to reject this bill.",
                403
            );
        }

        newStatus = STATUS.REJECTED;
        newAction = ACTION.REJECTED;
        }

        // --------------------------------
        // 4. INSERT NEW ACTION RECORD
        // --------------------------------

        const actionOn = getEpochTime();

        const newBillData = {
            ...bill,
            status: newStatus,
            action_type: newAction,
            remarks: remarks.trim(),
            updated_by: "HSL",
            action_by: userCode,
            action_on: actionOn,
            action_to: actionTo,
            assigned_from: null,
            assigned_to: null,
            is_assign: false,
            submitted_by: null
        };

        // Remove old primary key and supporting document
        delete newBillData.id;
        delete newBillData.supporting_doc;

        const columns = Object.keys(newBillData);
        const values = Object.values(newBillData);

        const columnNames = columns
            .map(column => `"${column}"`)
            .join(", ");

        const placeholders = values
            .map((_, index) => `$${index + 1}`)
            .join(", ");

        const insertQuery = `
            INSERT INTO ${TABLE} (${columnNames})
            VALUES (${placeholders})
            RETURNING id
        `;

        const insertResult = await client.query(
            insertQuery,
            values
        );

        const newBillId = insertResult.rows[0].id;

        await client.query("COMMIT");
        transactionStarted = false;

        const successMessage = {
            FORWARD: "Bill forwarded to Finance Officer successfully.",
            APPROVE: "Bill approved successfully.",
            REJECT: "Bill rejected successfully."
        };

        return resSend(
            res,
            true,
            200,
            successMessage[actionStatus],
            {
                id: newBillId,
                reference_no,
                status: newStatus,
                action_type: newAction,
                action_by: userCode,
                action_to: actionTo
            },
            null
        );

    } catch (error) {

        if (client && transactionStarted) {
            await rollback(client);
        }

        console.error("nonPoBillAction:", error);

        return resSend(
            res,
            false,
            500,
            Message.SERVER_ERROR,
            null,
            null
        );

    } finally {

        if (client) {
            client.release();
        }
    }
};


const getNonPoBillDetailsByReference = async (req, res) => {
    let client;

    try {
        const tokenData = req.tokenData;
        const userCode = getUserCode(tokenData);
        const referenceNo = req.params.reference_no;

        if (!userCode) {
            return sendError(res, "User code not found.", 401);
        }

        if (!referenceNo) {
            return sendError(res, "Reference number is required.");
        }

        client = await poolClient();

        // Get latest bill record
        const latestResult = await client.query(
            `SELECT *
             FROM ${TABLE}
             WHERE reference_no = $1
             ORDER BY id DESC
             LIMIT 1`,
            [referenceNo]
        );

        if (!latestResult.rows.length) {
            return sendError(res, "Non-PO Bill not found.", 404);
        }

        const bill = latestResult.rows[0];

        // Vendor access
        if (isVendor(tokenData)) {
            if (bill.vendor_code !== userCode) {
                return sendError(res, "Unauthorized access.", 403);
            }
        } else {

            const officer = await getOfficer(client, userCode);

            if (!officer) {
                return sendError(res, "Unauthorized officer.", 403);
            }

            const isCommercialAccess =
                isCommercialOfficer(officer) &&
                bill.status === STATUS.SUBMITTED &&
                bill.action_to === userCode;

            const isFinanceMainAccess =
                isFinanceOfficer(officer) &&
                isMainOfficer(officer) &&
                (
                    (
                        bill.status === STATUS.FORWARDED_TO_FINANCE &&
                        bill.action_to === userCode
                    ) ||
                    (
                        bill.status === STATUS.ASSIGNED_TO_FINANCE &&
                        bill.assigned_from === userCode
                    )
                );

            const isLowerFinanceAccess =
                isFinanceOfficer(officer) &&
                !isMainOfficer(officer) &&
                bill.status === STATUS.ASSIGNED_TO_FINANCE &&
                bill.assigned_to === userCode;

            
        }

        // Get complete action history
        const historyResult = await client.query(
            `SELECT *
             FROM ${TABLE}
             WHERE reference_no = $1
             ORDER BY id ASC`,
            [referenceNo]
        );

        return resSend(
            res,
            true,
            200,
            "Non-PO Bill details fetched successfully.",
            {
                bill_details: bill,
                action_history: historyResult.rows
            },
            null
        );

    } catch (error) {
        console.error("getNonPoBillDetailsByReference:", error);

        return resSend(
            res,
            false,
            500,
            Message.SERVER_ERROR,
            null,
            null
        );

    } finally {
        if (client) {
            client.release();
        }
    }
};

const getFinanceOfficerList = async (req, res) => {
    let client;

    try {
        const tokenData = req.tokenData;
        const userCode = getUserCode(tokenData);

        if (!userCode) {
            return sendError(res, "User code not found.", 401);
        }

        client = await poolClient();

        // Check whether logged-in user is Finance Officer
        const loggedInOfficer = await getOfficer(client, userCode);

        const isFinanceLogin = isFinanceOfficer(loggedInOfficer);

        const result = await client.query(
            `SELECT
                vendor_code,
                username,
                name,
                department_id,
                internal_role_id
             FROM auth
             WHERE user_type = $1
               AND department_id = $2
               AND is_active = 1
               AND (
                    $3 = FALSE
                    OR vendor_code <> $4
               )
             ORDER BY name ASC`,
            [
                USER_TYPE_HSL,
                USER_TYPE_HSL_FINANCE,
                isFinanceLogin,
                userCode
            ]
        );

        return resSend(
            res,
            true,
            200,
            "Finance Officer list fetched successfully.",
            result.rows,
            null
        );

    } catch (error) {
        console.error("getFinanceOfficerList:", error);

        return resSend(
            res,
            false,
            500,
            Message.SERVER_ERROR,
            null,
            null
        );
    } finally {
        if (client) client.release();
    }
};

const assignNonPoBill = async (req, res) => {
    let client;
    let transactionStarted = false;

    try {
        const tokenData = req.tokenData;
        const userCode = getUserCode(tokenData);

        const {
            reference_no,
            assign_to,
            remarks
        } = req.body || {};

        if (!userCode) {
            return sendError(res, "User code not found.", 401);
        }

        if (
            !reference_no ||
            !assign_to ||
            typeof remarks !== "string" ||
            !remarks.trim()
        ) {
            return sendError(
                res,
                "Reference number, Finance Officer and remarks are required."
            );
        }

        if (String(assign_to) === String(userCode)) {
            return sendError(
                res,
                "You cannot assign the bill to yourself."
            );
        }

        client = await poolClient();

        await client.query("BEGIN");
        transactionStarted = true;

        // Validate logged-in Finance Officer
        const currentOfficer = await getOfficer(client, userCode);

        if (!currentOfficer || !isFinanceOfficer(currentOfficer)) {
            await rollback(client);
            transactionStarted = false;

            return sendError(
                res,
                "Only Finance Officer can assign this bill.",
                403
            );
        }

        // Validate selected Finance Officer
        const targetResult = await client.query(
            `SELECT vendor_code, name
             FROM auth
             WHERE vendor_code = $1
               AND user_type = $2
               AND department_id = $3
               AND is_active = 1
             LIMIT 1`,
            [
                assign_to,
                USER_TYPE_HSL,
                USER_TYPE_HSL_FINANCE
            ]
        );

        if (!targetResult.rows.length) {
            await rollback(client);
            transactionStarted = false;

            return sendError(
                res,
                "Please select a valid active Finance Officer."
            );
        }

        // Get latest Bill record
        const billResult = await client.query(
            `SELECT *
             FROM ${TABLE}
             WHERE reference_no = $1
             ORDER BY id DESC
             LIMIT 1
             FOR UPDATE`,
            [reference_no]
        );

        if (!billResult.rows.length) {
            await rollback(client);
            transactionStarted = false;

            return sendError(res, "Bill not found.", 404);
        }

        const bill = billResult.rows[0];

        // Only the currently responsible Finance Officer can assign
        const isCurrentFinanceOfficer =
            (
                bill.status === STATUS.FORWARDED_TO_FINANCE &&
                bill.action_to === userCode
            ) ||
            (
                bill.status === STATUS.ASSIGNED_TO_FINANCE &&
                bill.assigned_to === userCode
            );

        if (!isCurrentFinanceOfficer) {
            await rollback(client);
            transactionStarted = false;

            return sendError(
                res,
                "You are not authorized to assign this bill.",
                403
            );
        }

        const actionOn = getEpochTime();

        // Create new assignment record
        const newBillData = {
            ...bill,
            status: STATUS.ASSIGNED_TO_FINANCE,
            action_type: ACTION.ASSIGNED,
            remarks: remarks.trim(),
            updated_by: "HSL",
            action_by: userCode,
            action_on: actionOn,
            action_to: null,
            assigned_from: userCode,
            assigned_to: targetResult.rows[0].vendor_code,
            is_assign: true,
            submitted_by: null
        };

        delete newBillData.id;
        delete newBillData.supporting_doc;

        const columns = Object.keys(newBillData);
        const values = Object.values(newBillData);

        const columnNames = columns
            .map(column => `"${column}"`)
            .join(", ");

        const placeholders = values
            .map((_, index) => `$${index + 1}`)
            .join(", ");

        const insertQuery = `
            INSERT INTO ${TABLE} (${columnNames})
            VALUES (${placeholders})
            RETURNING id
        `;

        const insertResult = await client.query(
            insertQuery,
            values
        );

        await client.query("COMMIT");
        transactionStarted = false;

        return resSend(
            res,
            true,
            200,
            "Bill assigned to Finance Officer successfully.",
            {
                id: insertResult.rows[0].id,
                reference_no,
                status: STATUS.ASSIGNED_TO_FINANCE,
                action_type: ACTION.ASSIGNED,
                assigned_from: userCode,
                assigned_to: targetResult.rows[0].vendor_code,
                assigned_to_name: targetResult.rows[0].name
            },
            null
        );

    } catch (error) {

        if (client && transactionStarted) {
            await rollback(client);
        }

        console.error("assignNonPoBill:", error);

        return resSend(
            res,
            false,
            500,
            Message.SERVER_ERROR,
            null,
            null
        );

    } finally {
        if (client) {
            client.release();
        }
    }
};

// --------------------------------------------------
// Exports
// --------------------------------------------------

module.exports = {
    submitNonPoBill,
    getNonPoBillList,
    getCommercialOfficerList,
    nonPoBillAction,
    getNonPoBillDetailsByReference,
    getFinanceOfficerList,
    assignNonPoBill
};
