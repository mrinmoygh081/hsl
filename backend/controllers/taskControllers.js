/* eslint-disable no-useless-catch */
const { poolClient, poolQuery } = require("../config/pgDbConfig");
const { STAFF } = require("../lib/constant");
const { resSend } = require("../lib/resSend");
const { SUBMITTED, ASSIGNED, RETURN_TO_DO, FORWARD_TO_FINANCE, ACCEPTED, STATUS_DELEGATED, NOT_RECOMMEND, STATUS_RECOMMEND, REJECTED, BTN_STATUS_BANK, STATUS_RECEIVED, BTN_STATUS_DRETURN, BTN_STATUS_PROCESS, SUBMITTED_BY_DO, SUBMITTED_BY_CAUTHORITY, SUBMITTED_BY_VENDOR, STATUS_CANCEL_REQUESTED, STATUS_CANCELED } = require("../lib/status");
const Message = require("../utils/messages");
// const localDataJsonFile = require("../utils/localData.json");
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

    result = result.concat(btnTaskList);
    result = result.concat(drawingTaskList);
    result = result.concat(ilmsTaskList);
    result = result.concat(sdbgTaskList);
    result = result.concat(wdcTaskList);
    result = result.concat(qapTaskList);

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

    // let check = localDataJsonFile.registrationApprovedAuthority.map((el) => el.manNo) || [];

    // if (tokenData.department_id !== FINANCE && !check.includes(tokenData.vendor_code)) return [];

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

    // let check = localDataJsonFile.registrationApprovedAuthority.map((el) => el.manNo) || [];
    // if (tokenData.department_id !== DRAWING && !check.includes(tokenData.vendor_code)) return [];

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

    // let check = localDataJsonFile.registrationApprovedAuthority.map((el) => el.manNo) || [];

    // if (tokenData.department_id !== QAP && !check.includes(tokenData.vendor_code)) return [];

    const result = await poolQuery({ client, query: baseQuery, values: value });
    return result;
  } catch (error) {
    throw error;
  }
}
const getIlmsTaskData = async (client, tokenData) => {
  try {
    let values = [];
    let paramIndex = 1;
    const statusList = [SUBMITTED];
    let conditionQuery = ' WHERE 1 = 1 '

    let baseQuery = `
      WITH LastRows AS (
        SELECT DISTINCT ON (reference_no)
          reference_no,
          reference_no AS doc_no,
          status,
          created_at,
          action_on,
          action_by,
          purchasing_doc_no,
          'ilms' AS doc_type
        FROM ilms
        ORDER BY reference_no, created_at DESC
      )
      SELECT * FROM LastRows as LastRows`;


    conditionQuery += ` AND status IN (${statusList.map(() => `$${paramIndex++}`).join(", ")})`;
    values = [...values, ...statusList];
    conditionQuery += ` AND action_on = $${paramIndex++}`;
    values.push(tokenData.vendor_code);

    // let check = localDataJsonFile.registrationApprovedAuthority.map((el) => el.manNo) || [];
    // if (!check.includes(tokenData.vendor_code)) {
    //   conditionQuery += ` AND action_on = $${paramIndex++}`;
    //   values.push(tokenData.vendor_code);
    // }

    baseQuery += conditionQuery;

    const result = await poolQuery({ client, query: baseQuery, values });
    return result;
  } catch (error) {
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

    // let check = localDataJsonFile.registrationApprovedAuthority.map((el) => el.manNo) || [];
    // if (!check.includes(tokenData.vendor_code)) {
    //   conditionQuery += ` AND action_on = $${paramIndex++}`;
    //   values.push(tokenData.vendor_code);
    // }

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

    // let check = localDataJsonFile.registrationApprovedAuthority.map((el) => el.manNo) || [];
    // if (!check.includes(tokenData.vendor_code)) {
    //   conditionQuery += ` AND assign_to = $${paramIndex++}`;
    //   values.push(tokenData.vendor_code);
    // }

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




module.exports = { taskController }