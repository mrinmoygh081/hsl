/* eslint-disable no-useless-catch */
const { poolClient, poolQuery } = require("../config/pgDbConfig");
const {
  STAFF,
  USER_TYPE_HSL_PURCHASE,
  USER_TYPE_HSL_FINANCE
} = require("../lib/constant");
const { resSend } = require("../lib/resSend");
const { SUBMITTED, ASSIGNED, RETURN_TO_DO, FORWARD_TO_FINANCE, ACCEPTED, STATUS_DELEGATED, NOT_RECOMMEND, STATUS_RECOMMEND, REJECTED, BTN_STATUS_BANK, STATUS_RECEIVED, BTN_STATUS_DRETURN, BTN_STATUS_PROCESS, SUBMITTED_BY_DO, SUBMITTED_BY_CAUTHORITY, SUBMITTED_BY_VENDOR, STATUS_CANCEL_REQUESTED, STATUS_CANCELED } = require("../lib/status");
const Message = require("../utils/messages");
const { DRAWING, FINANCE, QAP } = require("../lib/depertmentMaster");

const taskController = async (req, res) => {
  let client;
  try {
    client = await poolClient();
    const tokenData = { ...req.tokenData };
    let result = [];

    // call all task list functions
    const btnTaskList = await getBtnTaskData(client, tokenData);
    const drawingTaskList = await getDrawingTaskData(client, tokenData);
    const ilmsTaskList = await getIlmsTaskData(client, tokenData);
    const sdbgTaskList = await getSdbgTaskData(client, tokenData);
    const wdcTaskList = await getWdcTaskData(client, tokenData);
    const qapTaskList = await getQAPTaskData(client, tokenData);
    const nonPoBillTaskList = await getNonPoBillTaskData(client, tokenData);

    result = result.concat(btnTaskList);
    result = result.concat(drawingTaskList);
    result = result.concat(ilmsTaskList);
    result = result.concat(sdbgTaskList);
    result = result.concat(wdcTaskList);
    result = result.concat(qapTaskList);
    result = result.concat(nonPoBillTaskList);

    resSend(res, true, 200, Message.DATA_FETCH_SUCCESSFULL, result, null);
  } catch (error) {
    console.error("error", error.message, error.stack);
    resSend(res, false, 500, Message.SERVER_ERROR, null, null);
  } finally {
    if (client) {
      client.release();
    }
  }
};

const getSdbgTaskData = async (client, tokenData) => {
  try {
    let baseQuery = `WITH LastRows AS (
      SELECT 
        DISTINCT ON (reference_no) 
        reference_no, 
        reference_no as doc_no,
        status,
        assigned_to,
        assigned_to as action_on,
        created_by_id as action_by, 
        created_at, 
        purchasing_doc_no,
        'sdbg' as doc_type
      FROM sdbg
      ORDER BY reference_no, created_at DESC)
    SELECT LastRows.*, 
          ekko.ernam 
      FROM LastRows as LastRows
    LEFT JOIN ekko AS ekko ON(ekko.ebeln = LastRows.purchasing_doc_no)`;

    let conditionQuery = " WHERE 1 = 1 ";
    let values = [];
    let paramIndex = 1;

    const checkStatus = [ASSIGNED, SUBMITTED, FORWARD_TO_FINANCE, RETURN_TO_DO];
    const placeholders = checkStatus.map(() => `$${paramIndex++}`).join(", ");
    conditionQuery += ` AND status IN(${placeholders})`;
    values = [...values, ...checkStatus];

    if (tokenData.internal_role_id === STAFF || tokenData.department_id !== FINANCE) {
      conditionQuery += ` AND assigned_to = $${paramIndex++} `;
      values = [...values, tokenData.vendor_code];
    }

    baseQuery += conditionQuery;

    let result = await poolQuery({ client, query: baseQuery, values });

    if (result.length) {
      result = result.map((pos) => ({ ...pos, isDO: pos.ernam === tokenData?.vendor_code }))
    }
    return result;
  } catch (error) {
    throw error;
  }
}
const getDrawingTaskData = async (client, tokenData) => {
  try {
    let baseQuery = `WITH LastRows AS (
      SELECT 
        DISTINCT ON (reference_no) 
        reference_no, 
        reference_no as doc_no,
        status, 
        created_at,
        assign_to,
        created_by_id as action_by,
        purchasing_doc_no,
        'drawing' as doc_type
      FROM drawing
      ORDER BY reference_no, created_at DESC)
    SELECT LastRows.* FROM LastRows as LastRows`;

    let conditionQuery = " WHERE 1 = 1 ";
    let value = [];
    let variableCount = 1;
    const checkStatus = [ASSIGNED, SUBMITTED];
    const placeholders = checkStatus.map(() => `$${variableCount++}`).join(", ");
    conditionQuery += ` AND status IN(${placeholders})`;
    value = [...value, ...checkStatus];

    if (tokenData.internal_role_id === STAFF || tokenData.department_id !== DRAWING) {
      conditionQuery += ` AND assign_to = $${variableCount++} `;
      value = [...value, tokenData.vendor_code];
    }

    baseQuery += conditionQuery;

    const result = await poolQuery({ client, query: baseQuery, values: value });
    return result;
  } catch (error) {
    throw error;
  }
}
const getQAPTaskData = async (client, tokenData) => {
  try {
    let baseQuery = `WITH LastRows AS (
      SELECT 
        DISTINCT ON (reference_no) 
        reference_no, 
        reference_no as doc_no,
        status, 
        created_at,
        assigned_to,
        assigned_to as action_on,
        created_by_id as action_by,
        purchasing_doc_no,
        'qap' as doc_type
      FROM qap_submission
      ORDER BY reference_no, created_at DESC)
    SELECT LastRows.* FROM LastRows as LastRows`;

    let conditionQuery = " WHERE 1 = 1 ";
    let value = [];
    let variableCount = 1;

    const checkStatus = [ASSIGNED, SUBMITTED, ACCEPTED];
    const placeholders = checkStatus.map(() => `$${variableCount++}`).join(", ");
    conditionQuery += ` AND status IN(${placeholders})`;
    value = [...value, ...checkStatus];

    if (tokenData.internal_role_id === STAFF || tokenData.department_id !== QAP) {
      conditionQuery += ` AND assigned_to = $${variableCount++} `;
      value = [...value, tokenData.vendor_code];
    }

    baseQuery += conditionQuery;

    const result = await poolQuery({ client, query: baseQuery, values: value });
    return result;
  } catch (error) {
    throw error;
  }
}
const getIlmsTaskData = async (client, tokenData) => {
  try {
    const values = [SUBMITTED, tokenData.vendor_code];

    const query = `
      WITH LastRows AS (
        SELECT DISTINCT ON (purchasing_doc_no, reference_no)
          id,
          reference_no,
          reference_no AS doc_no,
          status,
          created_at,
          action_on,
          action_by,
          action_to,
          purchasing_doc_no,
          vendor_code,
          'ilms' AS doc_type
        FROM ilms
        ORDER BY
          purchasing_doc_no,
          reference_no,
          created_at DESC,
          id DESC
      )

      SELECT *
      FROM LastRows
      WHERE status = $1
        AND TRIM(action_to::text) = TRIM($2::text)
      ORDER BY created_at DESC
    `;

    const result = await poolQuery({
      client,
      query,
      values,
    });

    console.log("ILMS MY TASK:", result.length);
    console.log("DO CODE:", tokenData.vendor_code);

    return result;

  } catch (error) {
    console.error("getIlmsTaskData ERROR:", error);
    throw error;
  }
};

const getWdcTaskData = async (client, tokenData) => {
  try {
    let values = [];
    let paramIndex = 1;
    let conditionQuery = ' WHERE 1 = 1 ';

    const statusList = [
      SUBMITTED,
      STATUS_DELEGATED,
      NOT_RECOMMEND,
      STATUS_RECOMMEND, REJECTED,
      STATUS_CANCEL_REQUESTED,
      STATUS_CANCELED
    ];

    let baseQuery = `
      WITH LastRows AS (
        SELECT DISTINCT ON (reference_no)
          reference_no AS doc_no,
          reference_no,
          status,
          created_at,
          action_on,
          action_by,
          purchasing_doc_no,
          action_type AS doc_type
        FROM wdc
        ORDER BY reference_no, created_at DESC
      )
      SELECT * FROM LastRows as LastRows`;

    conditionQuery += ` AND status IN (${statusList.map(() => `$${paramIndex++}`).join(", ")})`;
    values = [...values, ...statusList];
    conditionQuery += ` AND action_on = $${paramIndex++}`;
    values.push(tokenData.vendor_code);

    baseQuery += conditionQuery;

    let result = await poolQuery({ client, query: baseQuery, values });
    if (result.length) {
      result = result.map((items) => ({
        ...items,
        doc_type: items.doc_type ? items.doc_type.toLowerCase() : items.doc_type
      }));
    }
    return result;
  } catch (error) {
    console.error("Error in getWdcTaskData:", error);
    throw error;
  }
};

const getBtnTaskData = async (client, tokenData) => {
  try {
    const statusList = [
      BTN_STATUS_BANK,
      STATUS_RECEIVED,
      BTN_STATUS_DRETURN,
      BTN_STATUS_PROCESS,
      FORWARD_TO_FINANCE,
      SUBMITTED_BY_DO,
      SUBMITTED_BY_CAUTHORITY,
      SUBMITTED_BY_VENDOR,
      STATUS_RECOMMEND,
      NOT_RECOMMEND,
      STATUS_DELEGATED
    ];
    let values = [];
    let paramIndex = 1;
    let conditionQuery = ' WHERE 1 = 1 ';

    let baseQuery = `WITH LastRows AS (
      SELECT DISTINCT ON (btn_num)
          btn_num,
          btn_num as doc_no, 
          purchasing_doc_no, 
          created_at, 
          status,
          'btn' as doc_type,
          assign_by,
          assign_to,
          assign_by as action_by
      FROM btn_list
      ORDER BY btn_num, created_at DESC
  )
  SELECT LastRows.*,
    ekko.ernam
  FROM LastRows as LastRows
    LEFT JOIN ekko AS ekko ON(ekko.ebeln = LastRows.purchasing_doc_no)`;

    values = [...values, ...statusList];
    conditionQuery += ` AND status IN (${statusList.map(() => `$${paramIndex++}`).join(", ")})`;
    conditionQuery += ` AND assign_to = $${paramIndex++}`;
    values.push(tokenData.vendor_code);

    baseQuery += conditionQuery;

    let result = await poolQuery({ client, query: baseQuery, values });

    if (result.length) {
      result = result.map((pos) => ({ ...pos, isDO: pos.ernam === tokenData?.vendor_code }))
    }
    return result;
  } catch (error) {
    throw error;
  }

}

const getNonPoBillTaskData = async (client, tokenData) => {
  try {
    const userCode = tokenData.vendor_code;
    const departmentId = Number(tokenData.department_id);
    const internalRoleId = Number(tokenData.internal_role_id);

    let condition = "";
    let values = [userCode];

    // Commercial Officer
    if (departmentId === Number(USER_TYPE_HSL_PURCHASE)) {

      condition = `
        AND status = 'SUBMITTED'
        AND action_to = $1
      `;

    }
    // Finance Officer
    else if (departmentId === Number(USER_TYPE_HSL_FINANCE)) {

      // Finance Main Officer
      if (internalRoleId === 1) {

        condition = `
          AND (
            (
              status = 'FORWARDED_TO_FINANCE'
              AND action_to = $1
            )
            OR
            (
              status = 'ASSIGNED_TO_FINANCE'
              AND assigned_from = $1
            )
          )
        `;

      }
      // Lower Finance Officer
      else {

        condition = `
          AND status = 'ASSIGNED_TO_FINANCE'
          AND assigned_to = $1
        `;

      }

    } else {
      return [];
    }

    const query = `
      WITH LastRows AS (
        SELECT DISTINCT ON (reference_no)
          id,
          reference_no,
          reference_no AS doc_no,
          vendor_code,
          file_name,
          file_path,
          status,
          action_type,
          action_by,
          action_to,
          action_on,
          assigned_from,
          assigned_to,
          is_assign,
          remarks,
          created_at,
          'nonpo' AS doc_type
        FROM non_po_bills
        ORDER BY reference_no, id DESC
      )

      SELECT *
      FROM LastRows
      WHERE 1 = 1
      ${condition}
      ORDER BY id DESC
    `;

    const result = await poolQuery({
      client,
      query,
      values
    });

    return result;

  } catch (error) {
    console.error("getNonPoBillTaskData ERROR:", error);
    throw error;
  }
};

module.exports = { taskController }