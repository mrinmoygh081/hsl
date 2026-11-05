
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
    Number(officer.department_id) === Number(USER_TYPE_HSL_PURCHASE);

const isFinanceOfficer = (officer) =>
    !!officer &&
    Number(officer.user_type) === Number(USER_TYPE_HSL_PURCHASE);

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

        if (!isVendor(tokenData)) {
            return sendError(res, "Only Vendor can submit Non-PO bills.", 403);
        }

        if (body.status !== STATUS.SUBMITTED) {
            return sendError(res, "Invalid status. Only SUBMITTED is allowed.");
        }

        if (!req.file) {
            return sendError(res, "Bill file is required.");
        }

        const assignTo = body.assign_to;
        const remarks = body.remarks || "";

        if (!assignTo || !remarks.trim()) {
            return sendError(
                res,
                "Commercial Officer and remarks are required."
            );
        }

        client = await poolClient();

        // Validate selected Commercial Officer
        const officer = await getOfficer(client, assignTo);

        if (!officer || !isCommercialOfficer(officer)) {
            return sendError(res, "Please select a valid Commercial Officer.");
        }

        const actionOn = getEpochTime();

        const referenceNo = create_reference_no(
            "NONPO",
            tokenData.vendor_code
        );

        const supportingDoc = body.supporting_doc
            ? (
                typeof body.supporting_doc === "string"
                    ? body.supporting_doc
                    : JSON.stringify(body.supporting_doc)
            )
            : null;

        await client.query("BEGIN");
        transactionStarted = true;

        const insertResult = await client.query(
            `INSERT INTO ${TABLE}
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
                action_to
            )
            VALUES
            (
                $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,
                $11,$12,$13,$14,$15,$16,$17,$18,$19
            )
            RETURNING *`,
            [
                referenceNo,
                req.file.filename || "",
                tokenData.vendor_code,
                null,
                null,
                0,
                req.file.path || "",
                ACTION.SUBMITTED,
                remarks,
                STATUS.SUBMITTED,
                "VENDOR",
                actionOn,
                tokenData.name || "",
                tokenData.id || null,
                supportingDoc,
                0,
                tokenData.vendor_code,
                actionOn,
                assignTo
            ]
        );

        await client.query("COMMIT");
        transactionStarted = false;

        return resSend(
            res,
            true,
            200,
            "Non-PO bill submitted successfully.",
            insertResult.rows[0],
            null
        );

    } catch (error) {
        if (client && transactionStarted) {
            await rollback(client);
        }

        console.error("submitNonPoBill:", error);

        return resSend(
            res, false, 500, Message.SERVER_ERROR, null, null
        );
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
                    NULLIF(TRIM(v_action_by.name1), '')
                ) AS action_by_name,

                COALESCE(
                    NULLIF(TRIM(action_to_user.cname), ''),
                    NULLIF(TRIM(v_action_to.name1), '')
                ) AS action_to_name

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

            WHERE
                b.vendor_code = $1
                OR b.action_by = $1
                OR b.action_to = $1
                OR b.assigned_from = $1
                OR b.assigned_to = $1

            ORDER BY b.id DESC
        `;

        const result = await client.query(query, [userCode]);

        return resSend(
            res,
            true,
            200,
            "Non-PO Bill list fetched successfully.",
            result.rows,
            null
        );

    } catch (error) {
        console.error("getNonPoBillList:", error);

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

// --------------------------------------------------
// 3. Officer Task List
// GET /bill/task-list
// --------------------------------------------------

const getNonPoBillTaskList = async (req, res) => {
    let client;

    try {
        const tokenData = req.tokenData;

        if (isVendor(tokenData)) {
            return sendError(res, "Unauthorized access.", 403);
        }

        const userCode = getUserCode(tokenData);

        if (!userCode) {
            return sendError(res, "Officer code not found.", 401);
        }

        const pageNo = Math.max(parseInt(req.query.pageNo) || 1, 1);
        const pageSize = Math.min(parseInt(req.query.pageSize) || 20, 100);
        const offset = (pageNo - 1) * pageSize;

        client = await poolClient();

        const officer = await getOfficer(client, userCode);

        if (!officer) {
            return sendError(res, "Unauthorized officer.", 403);
        }

        const isFinanceMain =
            isFinanceOfficer(officer) && isMainOfficer(officer);

        const values = [userCode, isFinanceMain ? 1 : 0];

        let condition = `
            WHERE (
                b.action_to = $1
                OR b.assigned_to = $1
                OR (
                    b.assigned_from = $1
                    AND b.status = '${STATUS.ASSIGNED_TO_FINANCE}'
                    AND $2 = 1
                )
            )
            AND b.status NOT IN ('${STATUS.APPROVED}', '${STATUS.REJECTED}')
        `;

        if (req.query.status) {
            values.push(req.query.status);
            condition += ` AND b.status = $${values.length}`;
        }

        if (req.query.search) {
            values.push(`%${req.query.search}%`);
            condition += ` AND (
                b.reference_no ILIKE $${values.length}
                OR b.vendor_code ILIKE $${values.length}
                OR b.file_name ILIKE $${values.length}
            )`;
        }

        const countResult = await client.query(
            `SELECT COUNT(*)::int AS total
             FROM ${TABLE} b
             ${condition}`,
            values
        );

        const listValues = [...values, pageSize, offset];

        const result = await client.query(
            `SELECT
                b.*,
                b.status AS current_status
             FROM ${TABLE} b
             ${condition}
             ORDER BY b.id DESC
             LIMIT $${listValues.length - 1}
             OFFSET $${listValues.length}`,
            listValues
        );

        return res.status(200).json({
            status: true,
            statusCode: 200,
            message: "Task list fetched successfully.",
            data: result.rows,
            count: countResult.rows[0].total,
            pageNo,
            token: ""
        });

    } catch (error) {
        console.error("getNonPoBillTaskList:", error);

        return resSend(
            res, false, 500, Message.SERVER_ERROR, null, null
        );
    } finally {
        if (client) client.release();
    }
};

// --------------------------------------------------
// 4. Bill Details
// GET /bill/:id
// --------------------------------------------------

const getNonPoBillDetails = async (req, res) => {
    let client;

    try {
        const tokenData = req.tokenData;
        const userCode = getUserCode(tokenData);

        client = await poolClient();

        const result = await client.query(
            `SELECT * FROM ${TABLE} WHERE id = $1`,
            [req.params.id]
        );

        if (!result.rows.length) {
            return sendError(res, "Bill not found.", 404);
        }

        const bill = result.rows[0];

        if (isVendor(tokenData)) {
            if (bill.vendor_code !== userCode) {
                return sendError(res, "Unauthorized access.", 403);
            }
        } else {
            const officer = await getOfficer(client, userCode);

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

            if (
                !isCommercialAccess &&
                !isFinanceMainAccess &&
                !isLowerFinanceAccess
            ) {
                return sendError(res, "Unauthorized access.", 403);
            }
        }

        return resSend(
            res, true, 200, "Bill details fetched successfully.", bill, null
        );

    } catch (error) {
        console.error("getNonPoBillDetails:", error);

        return resSend(
            res, false, 500, Message.SERVER_ERROR, null, null
        );
    } finally {
        if (client) client.release();
    }
};

// --------------------------------------------------
// 5. Commercial Officer Forward to Finance
// POST /bill/:id/forward
// Body: { assign_to, remarks }
// --------------------------------------------------

const forwardNonPoBill = async (req, res) => {
    let client;

    try {
        const tokenData = req.tokenData;
        const userCode = getUserCode(tokenData);
        const { assign_to, remarks } = req.body || {};

        if (!assign_to || !remarks?.trim()) {
            return sendError(
                res, "Finance Main Officer and remarks are required."
            );
        }

        client = await poolClient();
        await client.query("BEGIN");

        const currentOfficer = await getOfficer(client, userCode);

        if (!isCommercialOfficer(currentOfficer)) {
            await rollback(client);
            return sendError(res, "Only Commercial Officer can forward.", 403);
        }

        const targetOfficer = await getOfficer(client, assign_to);

        if (
            !targetOfficer ||
            !isFinanceOfficer(targetOfficer) ||
            !isMainOfficer(targetOfficer)
        ) {
            await rollback(client);
            return sendError(res, "Please select a valid Finance Main Officer.");
        }

        const bill = await getBillForUpdate(client, req.params.id);

        if (!bill) {
            await rollback(client);
            return sendError(res, "Bill not found.", 404);
        }

        if (
            bill.status !== STATUS.SUBMITTED ||
            bill.action_to !== userCode
        ) {
            await rollback(client);
            return sendError(res, "This bill is not assigned to you.", 403);
        }

        const actionOn = getEpochTime();

        await client.query(
            `UPDATE ${TABLE}
             SET status = $1,
                 action_type = $2,
                 assigned_from = NULL,
                 assigned_to = NULL,
                 is_assign = FALSE,
                 remarks = $3,
                 updated_by = 'HSL',
                 action_by = $4,
                 action_on = $5,
                 action_to = $6
             WHERE id = $7`,
            [
                STATUS.FORWARDED_TO_FINANCE,
                ACTION.FORWARDED,
                remarks,
                userCode,
                actionOn,
                assign_to,
                bill.id
            ]
        );

        await client.query("COMMIT");

        return resSend(
            res, true, 200, "Bill forwarded to Finance successfully.", null, null
        );

    } catch (error) {
        await rollback(client);
        console.error("forwardNonPoBill:", error);

        return resSend(
            res, false, 500, Message.SERVER_ERROR, null, null
        );
    } finally {
        if (client) client.release();
    }
};

// --------------------------------------------------
// 6. Finance Main Officer Assign to Lower Officer
// POST /bill/:id/assign
// Body: { assigned_to, remarks }
// --------------------------------------------------

const assignNonPoBill = async (req, res) => {
    let client;

    try {
        const tokenData = req.tokenData;
        const userCode = getUserCode(tokenData);
        const { assigned_to, remarks } = req.body || {};

        if (!assigned_to || !remarks?.trim()) {
            return sendError(res, "Finance Officer and remarks are required.");
        }

        client = await poolClient();
        await client.query("BEGIN");

        const currentOfficer = await getOfficer(client, userCode);

        if (
            !isFinanceOfficer(currentOfficer) ||
            !isMainOfficer(currentOfficer)
        ) {
            await rollback(client);
            return sendError(
                res, "Only Finance Main Officer can assign.", 403
            );
        }

        const targetOfficer = await getOfficer(client, assigned_to);

        if (
            !targetOfficer ||
            !isFinanceOfficer(targetOfficer) ||
            isMainOfficer(targetOfficer)
        ) {
            await rollback(client);
            return sendError(
                res, "Please select a valid Lower Finance Officer."
            );
        }

        const bill = await getBillForUpdate(client, req.params.id);

        if (!bill) {
            await rollback(client);
            return sendError(res, "Bill not found.", 404);
        }

        if (
            bill.status !== STATUS.FORWARDED_TO_FINANCE ||
            bill.action_to !== userCode
        ) {
            await rollback(client);
            return sendError(res, "Bill is not assigned to you.", 403);
        }

        const actionOn = getEpochTime();

        await client.query(
            `UPDATE ${TABLE}
             SET status = $1,
                 action_type = $2,
                 assigned_from = $3,
                 assigned_to = $4,
                 is_assign = TRUE,
                 remarks = $5,
                 updated_by = 'HSL',
                 action_by = $3,
                 action_on = $6,
                 action_to = $4
             WHERE id = $7`,
            [
                STATUS.ASSIGNED_TO_FINANCE,
                ACTION.ASSIGNED,
                userCode,
                assigned_to,
                remarks,
                actionOn,
                bill.id
            ]
        );

        await client.query("COMMIT");

        return resSend(
            res, true, 200, "Bill assigned successfully.", null, null
        );

    } catch (error) {
        await rollback(client);
        console.error("assignNonPoBill:", error);

        return resSend(
            res, false, 500, Message.SERVER_ERROR, null, null
        );
    } finally {
        if (client) client.release();
    }
};

// --------------------------------------------------
// 7. Approve Bill
// POST /bill/:id/approve
// Finance Main OR Assigned Lower Finance Officer
// --------------------------------------------------

const approveNonPoBill = async (req, res) => {
    let client;

    try {
        const tokenData = req.tokenData;
        const userCode = getUserCode(tokenData);
        const remarks = req.body?.remarks || "";

        client = await poolClient();
        await client.query("BEGIN");

        const officer = await getOfficer(client, userCode);

        if (!isFinanceOfficer(officer)) {
            await rollback(client);
            return sendError(res, "Only Finance Officer can approve.", 403);
        }

        const bill = await getBillForUpdate(client, req.params.id);

        if (!bill) {
            await rollback(client);
            return sendError(res, "Bill not found.", 404);
        }

        const isMain = isMainOfficer(officer);

        const isMainFinance =
            isMain &&
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

        const isAssignedLower =
            !isMain &&
            bill.status === STATUS.ASSIGNED_TO_FINANCE &&
            bill.assigned_to === userCode;

        if (!isMainFinance && !isAssignedLower) {
            await rollback(client);
            return sendError(
                res, "You are not authorized to approve this bill.", 403
            );
        }

        const actionOn = getEpochTime();

        await client.query(
            `UPDATE ${TABLE}
             SET status = $1,
                 action_type = $2,
                 assigned_from = NULL,
                 assigned_to = NULL,
                 is_assign = 0,
                 remarks = $3,
                 updated_by = 'HSL',
                 action_by = $4,
                 action_on = $5,
                 action_to = NULL
             WHERE id = $6`,
            [
                STATUS.APPROVED,
                ACTION.APPROVED,
                remarks,
                userCode,
                actionOn,
                bill.id
            ]
        );

        await client.query("COMMIT");

        return resSend(
            res, true, 200, "Bill approved successfully.", null, null
        );

    } catch (error) {
        await rollback(client);
        console.error("approveNonPoBill:", error);

        return resSend(
            res, false, 500, Message.SERVER_ERROR, null, null
        );
    } finally {
        if (client) client.release();
    }
};

// --------------------------------------------------
// 8. Reject Bill
// POST /bill/:id/reject
// Commercial / Finance Main / Assigned Lower Finance
// Body: { remarks }
// --------------------------------------------------

const rejectNonPoBill = async (req, res) => {
    let client;

    try {
        const tokenData = req.tokenData;
        const userCode = getUserCode(tokenData);
        const { remarks } = req.body || {};

        if (!remarks?.trim()) {
            return sendError(res, "Rejection remarks are required.");
        }

        client = await poolClient();
        await client.query("BEGIN");

        const officer = await getOfficer(client, userCode);

        if (!officer) {
            await rollback(client);
            return sendError(res, "Unauthorized access.", 403);
        }

        const bill = await getBillForUpdate(client, req.params.id);

        if (!bill) {
            await rollback(client);
            return sendError(res, "Bill not found.", 404);
        }

        const isCommercial =
            isCommercialOfficer(officer) &&
            bill.status === STATUS.SUBMITTED &&
            bill.action_to === userCode;

        const isFinanceMain =
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

        const isAssignedFinance =
            isFinanceOfficer(officer) &&
            !isMainOfficer(officer) &&
            bill.status === STATUS.ASSIGNED_TO_FINANCE &&
            bill.assigned_to === userCode;

        if (!isCommercial && !isFinanceMain && !isAssignedFinance) {
            await rollback(client);
            return sendError(
                res, "You are not authorized to reject this bill.", 403
            );
        }

        const actionOn = getEpochTime();

        await client.query(
            `UPDATE ${TABLE}
             SET status = $1,
                 action_type = $2,
                 assigned_from = NULL,
                 assigned_to = NULL,
                 is_assign = FALSE,
                 remarks = $3,
                 updated_by = 'HSL',
                 action_by = $4,
                 action_on = $5,
                 action_to = NULL
             WHERE id = $6`,
            [
                STATUS.REJECTED,
                ACTION.REJECTED,
                remarks,
                userCode,
                actionOn,
                bill.id
            ]
        );

        await client.query("COMMIT");

        return resSend(
            res, true, 200, "Bill rejected successfully.", null, null
        );

    } catch (error) {
        await rollback(client);
        console.error("rejectNonPoBill:", error);

        return resSend(
            res, false, 500, Message.SERVER_ERROR, null, null
        );
    } finally {
        if (client) client.release();
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
                name
             FROM auth
             WHERE user_type = 2
               AND department_id = $1
               AND is_active = 1
             ORDER BY name ASC`,
            [USER_TYPE_HSL_PURCHASE]
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
            res, false, 500, Message.SERVER_ERROR, null, null
        );
    } finally {
        if (client) client.release();
    }
};



const nonPoBillAction = async (req, res) => {
    let client;

    try {
        const tokenData = req.tokenData;
        const userCode = getUserCode(tokenData);
        const { reference_no, status, remarks } = req.body || {};

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

        // Get logged-in officer
        const officer = await getOfficer(client, userCode);

        if (!officer) {
            await rollback(client);
            return sendError(res, "Unauthorized user.", 403);
        }

        // Get latest bill record using reference_no
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
            return sendError(res, "Bill not found.", 404);
        }

        const bill = billResult.rows[0];

        let newStatus;
        let newAction;
        let actionTo = null;

        // --------------------------------
        // 1. FORWARD: Commercial to Finance Main
        // --------------------------------
        if (actionStatus === "FORWARD") {

            if (
                !isCommercialOfficer(officer) ||
                bill.status !== STATUS.SUBMITTED ||
                bill.action_to !== userCode
            ) {
                await rollback(client);
                return sendError(
                    res,
                    "Only assigned Commercial Officer can forward this bill.",
                    403
                );
            }

            // Find active Finance Main Officer
            const financeResult = await client.query(
                `SELECT vendor_code, name
                 FROM auth
                 WHERE user_type = 2
                   AND department_id = $1
                   AND internal_role_id = 1
                   AND is_active = 1
                 LIMIT 1`,
                [USER_TYPE_HSL_FINANCE]
            );

            if (!financeResult.rows.length) {
                await rollback(client);
                return sendError(
                    res,
                    "Active Finance Main Officer not found.",
                    404
                );
            }

            actionTo = financeResult.rows[0].vendor_code;

            newStatus = STATUS.FORWARDED_TO_FINANCE;
            newAction = ACTION.FORWARDED;
        }

        // --------------------------------
        // 2. APPROVE: Finance Main / Lower Finance
        // --------------------------------
        else if (actionStatus === "APPROVE") {

            if (!isFinanceOfficer(officer)) {
                await rollback(client);
                return sendError(
                    res,
                    "Only Finance Officer can approve.",
                    403
                );
            }

            const isMain = isMainOfficer(officer);

            const isMainFinance =
                isMain &&
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

            const isAssignedLower =
                !isMain &&
                bill.status === STATUS.ASSIGNED_TO_FINANCE &&
                bill.assigned_to === userCode;

            if (!isMainFinance && !isAssignedLower) {
                await rollback(client);
                return sendError(
                    res,
                    "You are not authorized to approve this bill.",
                    403
                );
            }

            newStatus = STATUS.APPROVED;
            newAction = ACTION.APPROVED;
        }

        // --------------------------------
        // 3. REJECT: Commercial / Finance
        // --------------------------------
        else if (actionStatus === "REJECT") {

            const isCommercial =
                isCommercialOfficer(officer) &&
                bill.status === STATUS.SUBMITTED &&
                bill.action_to === userCode;

            const isFinanceMain =
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

            const isAssignedFinance =
                isFinanceOfficer(officer) &&
                !isMainOfficer(officer) &&
                bill.status === STATUS.ASSIGNED_TO_FINANCE &&
                bill.assigned_to === userCode;

            if (
                !isCommercial &&
                !isFinanceMain &&
                !isAssignedFinance
            ) {
                await rollback(client);
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

        // Copy previous bill details
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
            is_assign: false
        };

        // Remove old primary key
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

        // Commit transaction
        await client.query("COMMIT");

        const successMessage = {
            FORWARD: "Bill forwarded to Finance Main successfully.",
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

        await rollback(client);

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



// --------------------------------------------------
// Exports
// --------------------------------------------------

module.exports = {
    submitNonPoBill,
    getNonPoBillList,
    getNonPoBillTaskList,
    getNonPoBillDetails,
    forwardNonPoBill,
    assignNonPoBill,
    approveNonPoBill,
    rejectNonPoBill,
    getCommercialOfficerList,
    nonPoBillAction,
    getNonPoBillDetailsByReference
};
