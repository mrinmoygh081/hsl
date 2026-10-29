/* eslint-disable no-unused-vars */
const { query, getQuery, poolQuery } = require("../config/pgDbConfig");
const {
  INSERT,
  MID_SDBG,
  MID_DRAWING,
  MID_QAP,
  MID_ILMS,
} = require("../lib/constant");
const { SUBMITTED, SUBMITTED_BY_VENDOR } = require("../lib/status");
const {
  ACTUAL_SUBMISSION_DATE,
  ILMS,
  QAP_SUBMISSION,
  DRAWING,
  SDBG,
  ACTUAL_SUBMISSION_DB,
  BTN_LIST,
} = require("../lib/tableName");
const { getEpochTime, generateQuery } = require("../lib/utils");
const {  getEpochFirstLastToday, formatDateYYYYMMDDHHMMSSMS } = require("../utils/dateTime");

/**
 * Modify SDBG Payload object to insert data
 * @param {Object} payload
 * @param {string} status
 * @returns Object
 */

const sdbgPayload = (payload, status) => {
  const payloadObj = {
    reference_no: payload.reference_no,
    purchasing_doc_no: payload.purchasing_doc_no,
    file_name: payload.fileName || null,
    file_path: payload.filePath || null,
    remarks: payload.remarks || null,
    status: payload.status || null,
    action_type: payload.action_type || null,
    updated_by: payload.updated_by,
    vendor_code: payload.vendor_code || null,
    assigned_from: payload.assigned_from || null,
    assigned_to: payload.assigned_to || null,
    created_at: payload.created_at || getEpochTime(),
    created_by_name: payload.action_by_name || null,
    created_by_id: payload.created_by_id,
    bg_no: payload.bg_no || null,
    action_by: payload.action_by,
    action_on: payload.action_on,
  };

  return payloadObj;
};

/**
 * Modify drawing payload object to insert data
 * @param {Object} payload
 * @param {string} status
 * @returns Object
 */
const drawingPayload = (payload, status) => {
  const payloadObj = {
    reference_no: payload.reference_no,
    purchasing_doc_no: payload.purchasing_doc_no,
    file_name: payload.fileName || payload.file_name || null,
    file_path: payload.filePath || payload.file_path || null,
    remarks: payload.remarks || null,
    status: status,
    actionType: payload.actionType || payload.actiontype || null,
    updated_by: payload.updated_by,
    vendor_code: payload.vendor_code || null,
    created_at: payload.created_at || getEpochTime(),
    created_by_id: payload.created_by_id,
    last_assigned: payload.last_assigned || null,
    assign_from: payload.assign_from || null,
    assign_to: payload.assign_to || null,
    action_by: payload.action_by,
    action_on: payload.action_on
  };

  return payloadObj;
};
/**
 * Modify qap payload object to insert data
 * @param {Object} payload
 * @param {string} status
 * @returns Object
 */
const qapPayload = (payload, status) => {
  const payloadObj = {
    reference_no: payload.reference_no,
    purchasing_doc_no: payload.purchasing_doc_no,
    file_name: payload.fileName ? payload.fileName : null,
    file_path: payload.filePath ? payload.filePath : null,
    supporting_doc: payload.supporting_doc ? payload.supporting_doc : null,
    remarks: payload.remarks ? payload.remarks : null,
    action_type: payload.action_type ? payload.action_type : null,
    assigned_to: payload.assigned_to ? payload.assigned_to : null,
    assigned_from: payload.assigned_from ? payload.assigned_from : null,
    is_assign: payload.is_assign ? payload.is_assign : 0,
    status: status,
    updated_by: payload.updated_by,
    vendor_code: payload.vendor_code ? payload.vendor_code : null,
    created_at: payload.created_at ? payload.created_at : getEpochTime(),
    created_by_name: payload.action_by_name ? payload.action_by_name : null,
    created_by_id: payload.action_by_id,
    action_by: payload.action_by,
    action_on: payload.action_on,
    action_to: payload.action_to,
  };

  return payloadObj;
};

const hrCompliancePayload = (payload) => {
  const payloadObj = {
    reference_no: payload.reference_no,
    purchasing_doc_no: payload.purchasing_doc_no,
    file_name: payload.fileName || null,
    file_path: payload.filePath || null,
    remarks: payload.remarks || null,
    status: payload.status,
    action_type: payload.action_type || null,
    updated_by: payload.updated_by,
    vendor_code: payload.vendor_code || null,
    created_at: payload.created_at || getEpochTime(),
    created_by_id: payload.created_by_id,
  };

  return payloadObj;
};
const wdcPayload = (payload, line_item_array) => {
  let line_item = JSON.parse(payload.line_item_array);
  let last_data_line_item_array = JSON.parse(line_item_array);

  let resData;
  if (line_item && Array.isArray(line_item)) {
    resData = line_item.map((el2) => {
      const resData = last_data_line_item_array.find(
        (elms) => elms.line_item_no == el2.line_item_no
      );
      return resData ? { ...resData, ...el2 } : el2;
    });
  }

  payload.line_item_array = JSON.stringify(resData);
  return payload;

};

const shippingDocumentsPayload = (payload, status) => {
  const payloadObj = {
    purchasing_doc_no: payload.purchasing_doc_no,
    file_name: payload.fileName ? payload.fileName : null,
    file_path: payload.filePath ? payload.filePath : null,
    file_type_name: payload.file_type_name ? payload.file_type_name : null,
    remarks: payload.remarks ? payload.remarks : null,
    updated_by: payload.updated_by,
    vendor_code: payload.vendor_code ? payload.vendor_code : null,
    created_at: payload.created_at,
    created_by_id: payload.created_by_id,
  };

  return payloadObj;
};
const inspectionCallLetterPayload = (payload) => {
  const payloadObj = {
    purchasing_doc_no: payload.purchasing_doc_no,
    file_name: payload.fileName ? payload.fileName : null,
    file_path: payload.filePath ? payload.filePath : null,
    action_type: payload.action_type ? payload.action_type : null,
    remarks: payload.remarks ? payload.remarks : null,
    updated_by: payload.updated_by,
    vendor_code: payload.vendor_code ? payload.vendor_code : null,
    created_at: payload.created_at,
    created_by_id: payload.created_by_id,
  };

  return payloadObj;
};

const inspectionReleaseNotePayload = (payload) => {
  const payloadObj = {
    purchasing_doc_no: payload.purchasing_doc_no,
    file_name: payload.fileName ? payload.fileName : null,
    file_path: payload.filePath ? payload.filePath : null,
    action_type: payload.action_type ? payload.action_type : null,
    remarks: payload.remarks ? payload.remarks : null,
    updated_by: payload.updated_by,
    vendor_code: payload.vendor_code ? payload.vendor_code : null,
    created_at: payload.created_at,
    created_by_id: payload.created_by_id,
  };

  return payloadObj;
};

const poModifyData = (queryResult) => {
  const resArr = [];
  if (!Array.isArray(queryResult) && !queryResult.result) return [];
  const result = queryResult.map((row) => {
    let po = {};
    let sdbg = {};
    let drawing = {};

    for (const key in row) {
      const [table, column] = key.split(".");

      switch (table) {
        case "ekko":
          po[column] = row[key];
          break;
        case "new_sdbg":
          sdbg[column] = row[key];
          break;
        case "add_drawing":
          drawing[column] = row[key];
          break;
      }

      resArr.push({ po, sdbg, drawing });
    }

    return { po, sdbg, drawing };
  });

  return result;
};

async function poDataModify(data) {
  if (!data || !Array.isArray(data) || !data.length) return [];
  let obj = {};
  data.forEach((element) => {
    let key = element.poNb;

    if (key in obj) {
      let val = obj[key];
      let newVal = {
        poType: element.poType,
        m_number: element.m_number,
        MTART: element.MTART,
        MATNR: element.MATNR,
        vendor_code: element.vendor_code,
        vendor_name: element.vendor_name,
        wbs_id: element.wbs_id,
        project_code: element.project_code,
      };

      obj[key] = [...val, newVal];
    } else {
      obj[key] = [
        {
          poType: element.poType,
          m_number: element.m_number,
          MTART: element.MTART,
          MATNR: element.MATNR,
          vendor_code: element.vendor_code,
          vendor_name: element.vendor_name,
          wbs_id: element.wbs_id,
          project_code: element.project_code,
        },
      ];
    }
  });

  return obj;
}

function poDataModify2(data) {

  if (!data || !Array.isArray(data) || !data.length) return [];
  let obj = new Map()
  data.forEach((element) => {
    let key = element.poNb;

    if (obj.has(key)) {
      let val = obj.get(key);
      let newVal = {
        poType: element.poType,
        m_number: element.m_number,
        MTART: element.MTART,
        MATNR: element.MATNR,
        vendor_code: element.vendor_code,
        vendor_name: element.vendor_name,
        vendor_type: element.vendor_type,
        createdAt: element.createdAt,
        po_creator: element.po_creator,
        po_creator_name: element.po_creator_name,

      };

      obj.set(key, [...val, newVal]);
    } else {
      obj.set(key, [
        {
          poType: element.poType,
          m_number: element.m_number,
          MTART: element.MTART,
          MATNR: element.MATNR,
          vendor_code: element.vendor_code,
          vendor_name: element.vendor_name,
          vendor_type: element.vendor_type,
          createdAt: element.createdAt,
          po_creator: element.po_creator,
          po_creator_name: element.po_creator_name,
        },
      ]);
    }
  });

  return obj;
}

/**
 * insertActualSubmission funton
 * @param {Object} data
 */
const insertActualSubmission = async (data) => {
  try {
    let payload = { ...data };
    const { q, val } = generateQuery(INSERT, ACTUAL_SUBMISSION_DATE, payload);
    const result = await query({ query: q, values: val });
  } catch (error) {
    console.error("ERROR", error.message);
  }
};

async function setActualSubmissionDate(payload, mid, tokenData, status, client = null) {
  try {
    const getTableName = (mid) => {
      switch (mid) {
        case MID_SDBG:
          return SDBG;
        case MID_DRAWING:
          return DRAWING;
        case MID_QAP:
          return QAP_SUBMISSION;
        case MID_ILMS:
          return ILMS;
        default:
          return null;
      }
    };

    const tableName = getTableName(mid);
    if (!tableName || !mid) return false;

    const st = status || SUBMITTED;

    const getlatestData = `SELECT created_at, reference_no FROM ${tableName} WHERE (reference_no = $1 AND status = $2 ) ORDER BY created_at DESC LIMIT 1`;
    let result = []
    if (!client) {
      result = await getQuery({ query: getlatestData, values: [payload.reference_no, st] });
    } else {
      result = await poolQuery({ client, query: getlatestData, values: [payload.reference_no, st] });
    }

    const mtext = {
      [MID_SDBG]: "ACTUAL SDBG SUBMISSION DATE",
      [MID_DRAWING]: "ACTUAL DRAWING SUBMISSION DATE",
      [MID_QAP]: "ACTUAL QAP SUBMISSION DATE",
      [MID_ILMS]: "ACTUAL ILMS SUBMISSION DATE",
    };

    if (result && result.length) {
      const payloadObj = {
        purchasing_doc_no: payload.purchasing_doc_no,
        milestoneId: mid,
        milestoneText: mtext[mid],
        actualSubmissionDate: result[0]?.created_at,
        reference_no: result[0]?.reference_no,
        created_at: payload.created_at,
        created_by_id: tokenData.vendor_code,
      };
      const { q, val } = generateQuery(INSERT, ACTUAL_SUBMISSION_DB, payloadObj);

      if (!client) {
        await query({ query: q, values: val });
      } else {
        await poolQuery({ client, query: q, values: val });
      }

      return true;
    }
    return false;

  } catch (error) {

    console.error("errorerrorerrorerrorerror", error);

    throw error;
  }
}

const setActualSubmissionDateSdbg = async (payload, tokenData) => {

  const select_bg_date_query = `SELECT created_at FROM ${SDBG} WHERE action_type = ? AND reference_no = ? AND purchasing_doc_no = ?`;

  const select_bg_date = await query({
    query: select_bg_date_query,
    values: [
      payload.action_type,
      payload.reference_no,
      payload.purchasing_doc_no,
    ],
  });
  if (!select_bg_date[0].created_at) {
    console.log("loop")
  } else {
    const payloadObj = {
      purchasing_doc_no: payload.purchasing_doc_no,
      milestoneId: 1,
      milestoneText: `ACTUAL SDBG SUBMISSION DATE`,
      actualSubmissionDate: select_bg_date[0].created_at, //parseInt(select_bg_date[0].bg_date)*1000,
      created_at: getEpochTime(),
      created_by_id: tokenData.vendor_code,
    };
    const { q, val } = generateQuery(INSERT, ACTUAL_SUBMISSION_DB, payloadObj);
    const response = await query({ query: q, values: val });
    if (response.affectedRows) {
      return true;
    } else {
      return false;
    }
  }
};

const create_reference_no = (type, vendor_code) => {
  try {
    const reference_no = `${type}${formatDateYYYYMMDDHHMMSSMS()}${vendor_code.slice(-4)}`;
    return reference_no;
  } catch (error) {
    console.error("error into create reference_no :"`${error.message}`);
  }
};

const create_btn_no = async (client) => {
  try {
    let date = new Date();
    let year = date.getFullYear();
    let month = String(date.getMonth() + 1).padStart(2, "0");
    let day = String(date.getDate()).padStart(2, "0");
    let dateNeed = `${year}${month}${day}`;
    let today = getEpochTime();
    let { firstEpochTime, lastEpochTime } = getEpochFirstLastToday();

    let btn_num_q = `SELECT COUNT(DISTINCT btn_num) as count FROM ${BTN_LIST} WHERE created_at BETWEEN $1 AND $2 AND status = $3`;
    let btn_res = [];
    if (client) {
      btn_res = await poolQuery({ client, query: btn_num_q, values: [firstEpochTime, lastEpochTime, SUBMITTED_BY_VENDOR] })
    } else {
      btn_res = await getQuery({ query: btn_num_q, values: [firstEpochTime, lastEpochTime, SUBMITTED_BY_VENDOR] });
    }
    let threeDigit = 999 - parseInt(btn_res[0]?.count);
    const reference_no = `${dateNeed}${threeDigit}`;
    return reference_no;
  } catch (error) {
    console.error(`ERROR_IN_BTN_CREATION: ${error.message}`);
    throw error;
  }
};

/**
 * GET LAST DATA FROM TABLE 
 * USE FOR --> DEMAND MANAGEMENT, WDC
 * @param {*} client 
 * @param {*} table_name 
 * @param {*} purchasing_doc_no 
 * @param {*} reference_no 
 * @returns 
 */

const get_latest_activity = async (client,
  table_name,
  purchasing_doc_no,
  reference_no
) => {
  try {

    const get_query = `SELECT * FROM ${table_name} WHERE reference_no = $1 AND purchasing_doc_no = $2 ORDER BY created_at DESC LIMIT 1`;
    let result = [];
    if (!client) {
      result = await getQuery({ query: get_query, values: [reference_no, purchasing_doc_no] });
    } else {
      result = await poolQuery({ client, query: get_query, values: [reference_no, purchasing_doc_no] });
    }
    return result[0] || {};
  } catch (error) {
    console.error("ERROR:"`${error.message}`);
  }
};

const getActualAndCurrentDetails = async (client, values) => {

  // eslint-disable-next-line no-useless-catch
  try {
    const placeholders = values.map((_, i) => `$${i + 1}`).join(", ");
    const getActualAndCurrentQuery =
      `SELECT * FROM ((SELECT DISTINCT ON (t_contractula_sub.ebeln)
		      t_contractula_sub.ebeln as purchasing_doc_no,
          t_activity.reference_no,
          t_activity.status,
          t_activity.created_at,
      	  t_act_sub.actualsubmissiondate,
      	  t_contractula_sub.plan_date,
      	  'sdbg' as flag
      FROM
        zpo_milestone as t_contractula_sub
 LEFT JOIN
         sdbg as t_activity
      	ON( t_contractula_sub.ebeln = t_activity.purchasing_doc_no )
      LEFT JOIN
      	actualsubmissiondate as t_act_sub
      	ON( t_act_sub.purchasing_doc_no = t_activity.purchasing_doc_no AND t_act_sub.milestoneid = ${parseInt(MID_SDBG)} )
      
      WHERE 
        t_contractula_sub.mid = '${MID_SDBG}'
      ORDER BY
		  t_contractula_sub.ebeln,
          t_activity.purchasing_doc_no, 
          t_activity.reference_no, 
          t_activity.created_at DESC)

      UNION ALL

      (SELECT DISTINCT ON (t_contractula_sub.ebeln)
          t_contractula_sub.ebeln as purchasing_doc_no,
          t_activity.reference_no,
          t_activity.status,
          t_activity.created_at,
      	  t_act_sub.actualsubmissiondate,
      	  t_contractula_sub.plan_date,
      	  'drawing' as flag
      FROM
        zpo_milestone as t_contractula_sub
 LEFT JOIN
         drawing as t_activity
      	ON( t_contractula_sub.ebeln = t_activity.purchasing_doc_no )
      LEFT JOIN
      	actualsubmissiondate as t_act_sub
      	ON( t_act_sub.purchasing_doc_no = t_activity.purchasing_doc_no AND t_act_sub.milestoneid = ${parseInt(MID_DRAWING)} )
      
      WHERE 
        t_contractula_sub.mid = '${MID_DRAWING}'
      ORDER BY
          t_contractula_sub.ebeln,
          t_activity.purchasing_doc_no, 
          t_activity.reference_no, 
          t_activity.created_at DESC)
      UNION ALL

      (SELECT DISTINCT ON (t_contractula_sub.ebeln)
          t_contractula_sub.ebeln as purchasing_doc_no,
          t_activity.reference_no,
          t_activity.status,
          t_activity.created_at,
      	  t_act_sub.actualsubmissiondate,
      	  t_contractula_sub.plan_date,
      	  'qap' as flag
      FROM
        zpo_milestone as t_contractula_sub
 	  LEFT JOIN
         qap_submission as t_activity
      	ON( t_contractula_sub.ebeln = t_activity.purchasing_doc_no )
      LEFT JOIN
      	actualsubmissiondate as t_act_sub
      	ON( t_act_sub.purchasing_doc_no = t_activity.purchasing_doc_no AND t_act_sub.milestoneid = ${parseInt(MID_QAP)} )
      
      WHERE 
        t_contractula_sub.mid = '${MID_QAP}'
      ORDER BY
          t_contractula_sub.ebeln,
          t_activity.purchasing_doc_no, 
          t_activity.reference_no, 
          t_activity.created_at DESC)
      UNION ALL

      (SELECT DISTINCT ON (t_contractula_sub.ebeln)
          t_contractula_sub.ebeln as purchasing_doc_no,
          t_activity.reference_no,
          t_activity.status,
          t_activity.created_at,
      	  t_act_sub.actualsubmissiondate,
      	  t_contractula_sub.plan_date,
      	  'ilms' as flag
      FROM
        zpo_milestone as t_contractula_sub
 LEFT JOIN
         ilms as t_activity
      	ON( t_contractula_sub.ebeln = t_activity.purchasing_doc_no )
      LEFT JOIN
      	actualsubmissiondate as t_act_sub
      	ON( t_act_sub.purchasing_doc_no = t_activity.purchasing_doc_no AND t_act_sub.milestoneid =  ${parseInt(MID_ILMS)} )
      
      WHERE 
        t_contractula_sub.mid = '${MID_ILMS}'
      ORDER BY
          t_contractula_sub.ebeln,
          t_activity.purchasing_doc_no, 
          t_activity.reference_no, 
          t_activity.created_at DESC)) AS result
        WHERE 
      	result.purchasing_doc_no IN(${placeholders})`;

    const result = await poolQuery({ client, query: getActualAndCurrentQuery, values });

    return result;

  } catch (error) {
    throw error;
  }

}
const getPoWithLineItems = async (client, values, limit, offSet, whereCondQuery) => {
  // eslint-disable-next-line no-useless-catch
  try {

    const placeholders = values.map((_, i) => `$${i + 1}`).join(", ");
    let getPoQuey =
      `SELECT ekko.lifnr AS "vendor_code",
              ekko.aedat AS "createdAt",
              lfa1.name1 AS "vendor_name",
              ekko.ebeln AS "poNb",
              ekko.bsart AS "poType",
              ekpo.matnr AS "m_number",
              mara.mtart AS "MTART",
              ekpo.MATNR AS "MATNR",
              ekko.ernam AS "po_creator",
              users.cname AS "po_creator_name"
        FROM ekko AS ekko
        LEFT JOIN ekpo AS ekpo ON (ekko.ebeln = ekpo.ebeln)
        LEFT JOIN mara AS mara ON (ekpo.matnr = mara.matnr)
        LEFT JOIN lfa1 AS lfa1 ON (ekko.lifnr = lfa1.lifnr)
        LEFT JOIN pa0002 AS users ON(users.pernr :: CHARACTER varying = ekko.ernam) 
    WHERE 
      	ekko.ebeln IN(${placeholders}) ORDER BY ekko.aedat, ekko.ebeln LIMIT ${limit} OFFSET ${offSet}`;

    getPoQuey = `
    WITH ekko_limited_result AS (
    SELECT * 
    FROM ekko 
    WHERE 
      	${whereCondQuery} AND ekko.ebeln IN(${placeholders}) 
    ORDER BY ekko.aedat, ekko.ebeln 
    LIMIT ${limit} OFFSET ${offSet}
)
SELECT 
    ekko_limited_result.lifnr AS "vendor_code",
    ekko_limited_result.aedat AS "createdAt",
    lfa1.name1 AS "vendor_name",
    ekko_limited_result.ebeln AS "poNb",
    ekko_limited_result.bsart AS "poType",
    ekpo.matnr AS "m_number",
    mara.mtart AS "MTART",
    ekpo.MATNR AS "MATNR",
    ekko_limited_result.ernam AS "po_creator",
    users.cname AS "po_creator_name"
FROM 
    ekko_limited_result
LEFT JOIN ekpo ON ekko_limited_result.ebeln = ekpo.ebeln
LEFT JOIN mara ON ekpo.matnr = mara.matnr
LEFT JOIN lfa1 ON ekko_limited_result.lifnr = lfa1.lifnr
LEFT JOIN pa0002 AS users ON users.pernr::CHARACTER VARYING = ekko_limited_result.ernam
ORDER BY 
    ekko_limited_result.aedat, ekko_limited_result.ebeln`;

    const result = poolQuery({ client, query: getPoQuey, values: values });

    return result;
  } catch (error) {
    throw error;
  }
}
const getCount = async (client, values, whereCondQuery) => {
  // eslint-disable-next-line no-useless-catch
  try {

    const placeholders = values.map((_, i) => `$${i + 1}`).join(", ");
    let getPoQuey = `
    SELECT count(*) 
      FROM ekko 
    WHERE 
      	${whereCondQuery} AND ekko.ebeln IN(${placeholders})`;

    const result = await poolQuery({ client, query: getPoQuey, values: values });

    return parseInt(result[0]?.count);
  } catch (error) {
    throw error;
  }
}

/**
 * GET PO DETAILS (with db client and with out send db client)
 * THE FUNCTION CAN CHECK DO, PO RATE, VENDOR CODE ETC
 * CAN BE FILTER WITH whereConditionObj DATA
 * CAN BE SET PARAMETERS WITH selectFields
 * @param {*} client 
 * @param {*} whereConditionObj 
 * @param {*} selectFields 
 * @returns 
 */
const getPoDetails = async (client, whereConditionObj = {}, selectFields = "*") => {
  // eslint-disable-next-line no-useless-catch
  try {
    let getPoQuery = `SELECT ${selectFields} FROM ekko`;
    let whereCondQuery = " WHERE 1 = 1 ";
    const values = [];

    Object.keys(whereConditionObj).forEach((key, i) => {
      values.push(whereConditionObj[key]);
      whereCondQuery += ` AND ${key} = $${i + 1}`;
    })
    getPoQuery += whereCondQuery;
    getPoQuery += " LIMIT 1 ";
    let result = [];
    if (client) {
      result = await poolQuery({ client, query: getPoQuery, values });
    } else {
      result = await getQuery({ query: getPoQuery, values });
    }
    return result[0] || {}
  } catch (error) {
    throw error;
  }
}

function setMileStoneActivity(purchasing_doc_no, contractualDates) {
  const flags = ["sdbg", "drawing", "qap", "ilms"];
  const finalResult = {};
  flags.forEach(flag => {
    const entry = contractualDates.find(
      el => el.purchasing_doc_no == purchasing_doc_no && el.flag === flag
    );
    finalResult[flag] = {
      ["contractualSubmissionDate"]: entry?.plan_date || null,
      ["actualSubmissionDate"]: entry?.actualsubmissiondate || null,
      ["lastStatus"]: entry?.status || null
    };
  });

  return finalResult;
}
module.exports = {
  sdbgPayload,
  drawingPayload,
  qapPayload,
  poModifyData,
  wdcPayload,
  shippingDocumentsPayload,
  poDataModify,
  inspectionCallLetterPayload,
  inspectionReleaseNotePayload,
  insertActualSubmission,
  setActualSubmissionDate,
  setActualSubmissionDateSdbg,
  create_reference_no,
  get_latest_activity,
  hrCompliancePayload,
  create_btn_no,
  getActualAndCurrentDetails,
  getPoWithLineItems,
  poDataModify2,
  setMileStoneActivity,
  getCount,
  getPoDetails
};
