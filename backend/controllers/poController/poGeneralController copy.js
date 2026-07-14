/* eslint-disable no-undef */
const { resSend } = require("../../lib/resSend");
const { EKPO } = require("../../lib/tableName");
const {
  USER_TYPE_VENDOR,
  USER_TYPE_GRSE_QAP,
  ASSIGNER,
  STAFF,
  USER_TYPE_GRSE_FINANCE,
  USER_TYPE_GRSE_PURCHASE,
  USER_TYPE_PPNC_DEPARTMENT,
  USER_TYPE_GRSE_DRAWING,
  USER_TYPE_GRSE_CONTRACT_CELL,
  PO_LINE_ITEM_DELETE_FLAG,
} = require("../../lib/constant");

const fileDetails = require("../../lib/filePath");
const path = require("path");
const { getActualAndCurrentDetails, poDataModify2, setMileStoneActivity } = require("../../services/po.services");
const { currentStageHandleForAllActivity } = require("../../services/currentStage");
const { STORE, RIC } = require("../../lib/depertmentMaster");
const { getQuery, poolQuery, poolClient } = require("../../config/pgDbConfig");
const Message = require("../../utils/messages");
const { ACCEPTED, APPROVED } = require("../../lib/status");

/** APIS START ----->  */
const details = async (req, res) => {
  try {
    const client = await poolClient();
    try {
      const queryParams = req.query;
      const tokenData = { ...req.tokenData };

      if (!queryParams.id || queryParams.id === "0") {
        return resSend(res, false, 200, "Please provided PO NO.", [], null);
      }

      let q = `
    SELECT 
    t1.ebeln as "EBELN",
    t1.aedat as "AEDAT",
    t1.lifnr as "LIFNR", 
    t1.ernam as "ERNAM", 
    t3.EMAIL AS "USRID_LONG", t4.NAME1 as "NAME1", t4.ORT01 as "ORT01"
      FROM 
      ekko AS t1 
        LEFT JOIN 
      pa0002 AS t3 
        ON 
      (t3.PERNR :: character varying = t1.ERNAM) 
  LEFT JOIN 
      lfa1 AS t4 
  ON 
      t1.LIFNR = t4.LIFNR 
        WHERE 
            t1.EBELN = $1`;

      const result = await poolQuery({ client, query: q, values: [queryParams.id] });

      if (!result?.length) return resSend(res, false, 404, "No PO number found !!", [], null);

      // const timelingQ = `SELECT MTEXT, PLAN_DATE, MO FROM ${ZPO_MILESTONE} WHERE EBELN = ?`;

      // GROUP  BY purchasing_doc_no, status
      // const timelingQ = `
      //   (SELECT a.*,
      //           b.status,
      //           b.purchasing_doc_no,
      //           act.actualSubmissionDate
      //    FROM   zpo_milestone AS a
      //           LEFT JOIN actualsubmissiondate AS act
      //                  ON ( act.purchasing_doc_no = a.ebeln
      //                       AND act.milestoneid = '01' )
      //           INNER JOIN (SELECT Max(id) AS id,
      //                              purchasing_doc_no,
      //                              status
      //                       FROM   sdbg) AS b
      //                   ON ( b.purchasing_doc_no = a.ebeln )
      //    WHERE  a.mid = '01'
      //           AND a.ebeln = ?)
      //   UNION
      //   (SELECT a.*,
      //           b.status,
      //           b.purchasing_doc_no,
      //           act.actualSubmissionDate
      //    FROM   zpo_milestone AS a
      //           LEFT JOIN actualsubmissiondate AS act
      //                  ON ( act.purchasing_doc_no = a.ebeln
      //                       AND act.milestoneid = "02" )
      //           INNER JOIN (SELECT id,
      //                              purchasing_doc_no,
      //                              status
      //                       FROM   drawing AS x
      //                       WHERE  id = (SELECT Max(id) AS id
      //                                    FROM   drawing AS y
      //                                    WHERE  y.purchasing_doc_no =
      //                                           x.purchasing_doc_no)) AS b
      //                   ON ( b.purchasing_doc_no = a.ebeln )
      //    WHERE  a.mid = 2
      //           AND a.ebeln = ?)
      //   UNION
      //   (SELECT a.*,
      //           b.status,
      //           b.purchasing_doc_no,
      //           act.actualSubmissionDate
      //    FROM   zpo_milestone AS a
      //           LEFT JOIN actualsubmissiondate AS act
      //                  ON ( act.purchasing_doc_no = a.ebeln
      //                       AND act.milestoneid = 3 )
      //           INNER JOIN (SELECT id,
      //                              purchasing_doc_no,
      //                              status
      //                       FROM   qap_submission AS x
      //                       WHERE  id = (SELECT Max(id) AS id
      //                                    FROM   qap_submission AS y
      //                                    WHERE  y.purchasing_doc_no =
      //                                           x.purchasing_doc_no)) AS b
      //                   ON ( b.purchasing_doc_no = a.ebeln )
      //    WHERE  a.mid = 3
      //           AND a.ebeln = ?)
                
      //   UNION
      //   (SELECT a.*,
      //           b.status,
      //           b.purchasing_doc_no,
      //           act.actualSubmissionDate
      //    FROM   zpo_milestone AS a
      //           LEFT JOIN actualsubmissiondate AS act
      //                  ON ( act.purchasing_doc_no = a.ebeln
      //                       AND act.milestoneid = 4 )
      //           INNER JOIN (SELECT id,
      //                              purchasing_doc_no,
      //                              status
      //                       FROM   ilms AS x
      //                       WHERE  id = (SELECT Max(id) AS id
      //                                    FROM   ilms AS y
      //                                    WHERE  y.purchasing_doc_no =
      //                                           x.purchasing_doc_no)) AS b
      //                   ON ( b.purchasing_doc_no = a.ebeln )
      //    WHERE  a.mid = 4
      //           AND a.ebeln = ? );`;

      const timeLineQuery = `
        (SELECT a.*, sub.actualSubmissionDate, sub.milestoneText, sub.milestoneId FROM   zpo_milestone AS a 
            LEFT JOIN actualsubmissiondate AS sub ON 
                ( a.EBELN = sub.purchasing_doc_no and sub.milestoneId = '01')
            WHERE a.EBELN = $1 AND a.MID = '01')
            
            UNION
            (SELECT a.*, sub.actualSubmissionDate, sub.milestoneText, sub.milestoneId FROM   zpo_milestone AS a 
            LEFT JOIN actualsubmissiondate AS sub ON 
                ( a.EBELN = sub.purchasing_doc_no and sub.milestoneId = '02')
            WHERE a.EBELN = $2 AND a.MID = '02')
            
            UNION
            
            (SELECT a.*, sub.actualSubmissionDate, sub.milestoneText, sub.milestoneId FROM   zpo_milestone AS a 
            LEFT JOIN actualsubmissiondate AS sub ON 
                ( a.EBELN = sub.purchasing_doc_no and sub.milestoneId = '03')
            WHERE a.EBELN = $3 AND a.MID= '03')
            
            UNION
            
            (SELECT a.*, sub.actualSubmissionDate, sub.milestoneText, sub.milestoneId FROM   zpo_milestone AS a 
            LEFT JOIN actualsubmissiondate AS sub ON 
                ( a.EBELN = sub.purchasing_doc_no and sub.milestoneId = '04')
            WHERE a.EBELN = $4 AND a.MID = '04')
        `;
      const timeline = await poolQuery({
        client,
        query: timeLineQuery,
        values: [queryParams.id, queryParams.id, queryParams.id, queryParams.id],
      });

      const getLatest = `
        (SELECT purchasing_doc_no, status AS current_status, '01' as flag FROM sdbg WHERE purchasing_doc_no = $1 ORDER BY created_at DESC LIMIT 1)

        UNION

        (SELECT purchasing_doc_no, status  AS current_status, '02' as flag FROM drawing WHERE purchasing_doc_no = $2 ORDER BY created_at DESC LIMIT 1)

        UNION

        (SELECT purchasing_doc_no, status  AS current_status, '03' as flag FROM qap_submission WHERE purchasing_doc_no = $3 ORDER BY created_at DESC LIMIT 1)

        UNION

        (SELECT purchasing_doc_no, status  AS current_status, '04' as flag FROM ilms WHERE purchasing_doc_no = $4 ORDER BY created_at DESC LIMIT 1)`;

      const curret_data = await poolQuery({
        client,
        query: getLatest,
        values: [queryParams.id, queryParams.id, queryParams.id, queryParams.id],
      });

      const getAcknowledgementntQry = `
        (SELECT purchasing_doc_no, status, '01' as flag, created_at as acknowledgementnt_date FROM sdbg WHERE purchasing_doc_no = $1 AND status = '${APPROVED}' ORDER BY created_at DESC LIMIT 1)

        UNION

        (SELECT purchasing_doc_no, status, '02' as flag, created_at as acknowledgementnt_date FROM drawing WHERE purchasing_doc_no = $2 AND status = '${APPROVED}' ORDER BY created_at DESC LIMIT 1)

        UNION

        (SELECT purchasing_doc_no, status, '03' as flag, created_at as acknowledgementnt_date FROM qap_submission WHERE purchasing_doc_no = $3 AND status = '${APPROVED}' ORDER BY created_at DESC LIMIT 1)

        UNION

        (SELECT purchasing_doc_no, status, '04' as flag, created_at as acknowledgementnt_date FROM ilms WHERE purchasing_doc_no = $4 AND status = '${ACCEPTED}' ORDER BY created_at DESC LIMIT 1);`;

      const acknowledgementnt_date = await poolQuery({
        client,
        query: getAcknowledgementntQry,
        values: [queryParams.id, queryParams.id, queryParams.id, queryParams.id],
      });

      let timelineData = [];
      if (timeline.length) {
        let timeLineDatArr = mergeData(timeline, curret_data);
        timeLineDatArr = joinArrays(timeLineDatArr, acknowledgementnt_date);

        timelineData = timeLineDatArr.filter((v, i, a) => a.findIndex((el) => el?.mid === v?.mid) === i);

        // Sort the array by milestoneid
        timelineData.sort((a, b) => parseInt(a.mid) - parseInt(b.mid));
      }

      if (timelineData.length) {
        timelineData = timelineData.map((el2) => {
          const DOObj = acknowledgementnt_date.find((elms) => elms.flag == el2.mid);
          if (DOObj) {
            el2.acknowledgement_text = `ACKNOWLEDGEMENT DATE`;
            el2.acknowledgement_date = DOObj.acknowledgementnt_date;
          }

          return el2;
        });
      }
      // let tableName = (result[0].BSART === 'ZDM') ? EKPO : (result[0].BSART === 'ZGSR') ? EKBE : null;

      // let resDate;

      // TO DO
      /**
       * Contractual delivery date will come from eket table, field name EINDT
       * we have to update this api accrodingly
       */

      let materialQuery = `SELECT
            mat.EBELP AS material_item_number,
            mat.MENGE AS material_quantity, 
            mat.MATNR AS material_code,
            mat.MEINS AS material_unit,
            mat.EINDT AS contractual_delivery_date,
            mat.LOEKZ AS isdeleted, 
            materialMaster.MATNR as "MATNR", 
            materialMaster.MTART as "MTART", 
            materialMaster.MTART AS "materialType",
            mat.TXZ01 as mat_description
            FROM ${EKPO} AS  mat 
                LEFT JOIN mara AS materialMaster 
                    ON (materialMaster.MATNR = mat.MATNR)
            WHERE 1 = 1 AND mat.EBELN = $1`;

      let materialResult = await poolQuery({
        client,
        query: materialQuery,
        values: [queryParams.id],
      });

      // FILTER DELETED PO LINE ITEM
      if (materialResult && materialResult?.length) {
        materialResult = materialResult.filter((elem) => elem.isdeleted != PO_LINE_ITEM_DELETE_FLAG);
      }

      const materialTypeQuery = "SELECT * FROM material_type";
      const materialType = await poolQuery({
        client,
        query: materialTypeQuery,
        values: [],
      });

      const isMaterialTypePO = poTypeCheck(materialResult, materialType);

      const poType = isMaterialTypePO;

      // Get Current Stage
      let currentStage = {
        current: "",
      };

      // currentStage.current = await currentStageHandler(queryParams.id);
      // currentStage.current = await currentStageHandleForAllActivity(client, [queryParams.id]);
      const currStageData = await currentStageHandleForAllActivity(client, [queryParams.id]);
      currentStage.current = currStageData ? currStageData[queryParams.id] : "";

      const DO = await doDetails(queryParams.id);

      result[0]["currentStage"] = currentStage;
      result[0]["poType"] = poType;
      result[0]["materialResult"] = materialResult || [];
      result[0]["timeline"] = timelineData || [];
      result[0]["isDO"] = isDO(result[0], tokenData.vendor_code);
      result[0]["doInfo"] = DO.length > 0 ? DO[0] : null;
      resSend(res, true, 200, "data fetch scussfully.", result, null);
    } catch (error) {
      console.error("error.toString()", error.toString());
      resSend(res, false, 500, error.toString(), error, null);
    }
    finally {
      client.release();
    }
  } catch (error) {
    resSend(res, false, 502, error.toString(), error, null);
  }
};

function isDO(po, user_id) {
  return po.ERNAM == user_id;
}

// async function poTypeCheck(materialData) {
//   // const regex = /DIEN/; // USE FOR IDENTIFY SERVICE PO as discuss with Preetham
//   const regex = /ZDIN/;   // NOT USE FOR IDENTIFY SERVICE PO
//   // regex.test(materialType);
//   let isMatched = true;

//   const materialTypeQuery = "SELECT * FROM material_type";
//   const result = await query({query:  materialTypeQuery, values: []});

//   for (let i = 0; i < materialData.length; i++) {
//     isMatched = regex.test(materialData[i]?.MTART);
//     if (isMatched === false) break;
//   }

//   return isMatched;
// }

// eslint-disable-next-line no-unused-vars
function poTypeCheck(materialData, materialType) {
  // const types = materialData.map((mat) => mat.MTART);
  // const service = new Set(materialType.filter((el) => el.material_type === SERVICE_TYPE).map((e) => e.material_type_value));
  // const material = new Set(materialType.filter((el) => el.material_type === MATERIAL_TYPE).map((e) => e.material_type_value));

  let isService = false;
  let isMaterial = false;

  for (const mat of materialData) {
    const type = mat.MATNR;

    if (!type) {
      isService = true;
    }
    if (type && typeof type === "string" && type.includes("SER")) {
      isService = true;
    }
    if (type && typeof type === "string" && !type.includes("SER")) {
      isMaterial = true;
    }
  }

  // const isService = types.every(type => service.has(type));
  // const isMaterial = types.every(type => material.has(type));
  // let isService = false;
  // let isMaterial = false;

  // for (const type of types) {
  //   if (service.has(type)) {
  //     isService = true;
  //     break;
  //   }
  // }

  // for (const type of types) {
  //   if (type && !service.has(type)) {
  //     isMaterial = true;
  //     break;
  //   }
  // }
  // // types.every(type => material.includes(type));


  if (isService && !isMaterial) {
    return "service";
  } else if (isMaterial && !isService) {
    return "material";
  } else if (isService && isMaterial) {
    return "hybrid";
  } else {
    return "unknown";
  }
}

const download = async (req, res) => {
  // const queryParams = req.query;

  const typeArr = ["drawing", "sdbg", "qap"];

  const { id, type } = req.query;

  if (!typeArr.includes(type)) {
    return resSend(res, false, 400, "Please send valid type ! i.e. drawing, sdbg", null, null);
  }
  let fileFoundQuery = "";

  const tableName = fileDetails[type]["tableName"];
  const downaoadPath = fileDetails[type]["filePath"];

  switch (type) {
    case "drawing":
      fileFoundQuery = `SELECT * FROM ${tableName} WHERE id = $1`;
      break;
    case "sdbg":
      fileFoundQuery = `SELECT * FROM ${tableName} WHERE id = $1`;
      break;
    case "qap":
      break;

    default:
      break;
  }

  const response = await getQuery({ query: fileFoundQuery, values: [id] });

  if (!response?.length || !response[0]?.file_name) {
    return resSend(res, true, 200, `file not uploaded with this id ${id}`, null, null);
  }

  const selectedPath = `${downaoadPath}${response[0].file_name}`;

  res.download(path.join(__dirname, "..", selectedPath), (err) => {
    if (err) resSend(res, false, 404, "file not found", err, null);
  });
};

const doDetails = async (str) => {
  const doQry = `SELECT t1.PERNR as "PERNR",t1.CNAME as "CNAME", t2.ERNAM as "ERNAM", t2.EBELN as "EBELN"
        FROM 
        ekko AS t2 
        LEFT JOIN 
        pa0002 AS t1 
        ON 
            (t1.PERNR::character varying = t2.ERNAM)  WHERE t2.EBELN = $1`;

  const doArr = await getQuery({ query: doQry, values: [str] });

  return doArr;
};

function poListByEkko(tokenData, search, po, pageNo, limit) {
  let baseQuery = "WITH EKKO AS ( ";
  // select fields in main table(ekko)
  let selectedItem = `SELECT
    EKKO.LIFNR AS "vendor_code",
    EKKO.AEDAT AS "createdAt",
    EKKO.EBELN AS "poNb",
    EKKO.ERNAM AS "po_creator",
    EKKO.BSART AS "poType",
    EKKO.EBELN,
    EKKO.ERNAM,
    EKKO.LIFNR
  FROM EKKO `;

  let conditionQuery = " WHERE 1 = 1 ";
  if (tokenData.user_type == USER_TYPE_VENDOR) {
    conditionQuery += ` AND EKKO.LIFNR = '${tokenData.vendor_code}'`;
  }
  if (po) {
    conditionQuery += ` AND EKKO.EBELN < '${po}'`;
  }

  if (search) {
    conditionQuery += " AND (";
    conditionQuery += ` EKKO.EBELN LIKE '%${search}%'`;
    conditionQuery += ` OR EKKO.ERNAM LIKE '%${search}%'`;
    if (tokenData.user_type != USER_TYPE_VENDOR) {
      conditionQuery += ` OR EKKO.LIFNR LIKE '%${search}%'`;
    }
    conditionQuery += ")";
  }
  // adding all condition in main table (ekko) before joining all data
  selectedItem += conditionQuery;
  const orderBy = " ORDER BY EKKO.AEDAT, EKKO.EBELN DESC";
  selectedItem += orderBy;

  if (limit >= 0) {
    let offset = (pageNo - 1) * limit;
    limit = ` LIMIT ${limit} `;
    offset = ` OFFSET ${offset}`;
    selectedItem += offset;
    selectedItem += limit;
  }
  baseQuery += selectedItem;
  baseQuery += ")";

  const selectQueryAfterFilter = ` SELECT 
          EKKO.*,
          LFA1.NAME1 AS "vendor_name",
          EKPO.MATNR AS "m_number",
          MARA.MTART AS "MTART",
          EKPO.MATNR AS "MATNR",
          USERS.CNAME AS "po_creator_name"
          FROM 
              EKKO `;

  baseQuery += selectQueryAfterFilter;

  const joiningTables = ` LEFT JOIN EKPO AS EKPO ON(EKKO.EBELN = EKPO.EBELN)
  LEFT JOIN MARA AS MARA ON (EKPO.MATNR = MARA.MATNR)
  LEFT JOIN PA0002 AS USERS ON (USERS.PERNR :: CHARACTER VARYING = EKKO.ERNAM)
  LEFT JOIN LFA1 AS LFA1 ON (EKKO.LIFNR = LFA1.LIFNR) `;

  baseQuery += joiningTables;

  return baseQuery;
}
function poListCountByEkko(tokenData, search) {
  let baseQuery = "";
  const selectedItem = `SELECT COUNT(DISTINCT EKKO.EBELN) AS total_count FROM EKKO AS EKKO `;

  baseQuery += selectedItem;
  let conditionQuery = " WHERE 1 = 1 ";
  if (tokenData.user_type == USER_TYPE_VENDOR) {
    conditionQuery += ` AND EKKO.LIFNR = '${tokenData.vendor_code}'`;
  }
  if (search) {
    conditionQuery += " AND (";
    conditionQuery += ` EKKO.EBELN LIKE '%${search}%'`;
    conditionQuery += ` OR EKKO.ERNAM LIKE '%${search}%'`;
    if (tokenData.user_type != USER_TYPE_VENDOR) {
      conditionQuery += ` OR EKKO.LIFNR LIKE '%${search}%'`;
    }
    conditionQuery += ")";
  }

  baseQuery += conditionQuery;
  return baseQuery;
}

// eslint-disable-next-line no-unused-vars
function poListForOtherUser(dependedQuery, search, po, pageNo, pageSize) {
  let baseQuery = "WITH COMBINED_DATA AS ";
  // let unionQuery = `
  //     (SELECT DISTINCT(purchasing_doc_no) FROM sdbg WHERE assigned_to = '600700')
  //       UNION
  //     (SELECT DISTINCT(purchasing_doc_no) FROM btn_assign WHERE assign_to = '600700')
  //       UNION
  //     (SELECT DISTINCT(purchasing_doc_no)  FROM btn_assign WHERE  assign_to_fi= '600700')`

  baseQuery += " ( " + dependedQuery + " )";

  const selectedItem = ` SELECT COMBINED_DATA.*,
EKKO.LIFNR AS "vendor_code",
EKKO.AEDAT AS "createdAt",
LFA1.NAME1 AS "vendor_name",
EKKO.EBELN AS "poNb",
EKKO.BSART AS "poType",
EKPO.MATNR AS "m_number",
MARA.MTART AS "MTART",
EKPO.MATNR AS "MATNR",
EKKO.ERNAM AS "po_creator",
USERS.CNAME AS "po_creator_name"
  FROM COMBINED_DATA`;

  baseQuery += selectedItem;

  const joiningTables = ` 
  LEFT JOIN EKKO AS EKKO ON (EKKO.EBELN = COMBINED_DATA.PURCHASING_DOC_NO)
  LEFT JOIN EKPO AS EKPO ON(EKKO.EBELN = EKPO.EBELN)
  LEFT JOIN MARA AS MARA ON (EKPO.MATNR = MARA.MATNR)
  LEFT JOIN PA0002 AS USERS ON (USERS.PERNR :: CHARACTER VARYING  = EKKO.ERNAM)
  LEFT JOIN LFA1 AS LFA1 ON (EKKO.LIFNR = LFA1.LIFNR) `;

  baseQuery += joiningTables;

  let conditionQuery = " WHERE 1 = 1 ";
  if (po) {
    conditionQuery += ` AND COMBINED_DATA.PURCHASING_DOC_NO < '${po}'`;
  }
  if (search) {
    conditionQuery += " AND (";
    conditionQuery += ` EKKO.EBELN  LIKE '%${search}%'`;
    conditionQuery += ` OR EKKO.LIFNR LIKE '%${search}%'`;
    conditionQuery += ` OR EKKO.ERNAM LIKE '%${search}%'`;
    conditionQuery += ")";
  }

  baseQuery += conditionQuery;
  const orderBy = " ORDER BY COMBINED_DATA.PURCHASING_DOC_NO  DESC ";
  baseQuery += orderBy;
  // const limit = ` LIMIT ${pageSize}`;
  // baseQuery += limit;
  return baseQuery;
}

function poListCountForOtherUser(dependedQuery) {
  const countQuery = `SELECT COUNT(*) AS total_count
    FROM ( ${dependedQuery}) AS combined_query`;
  return countQuery;
}

function joinArrays(arr1, arr2) {
  return arr1.map((item1) => {
    const matchingItem = arr2.find((item2) => item1.eblel == item2.purchasing_doc_no && item1.mid == item2.flag);

    if (matchingItem) {
      return { ...item1, ...matchingItem };
    }

    return item1;
  });
}

function mergeData(timelineData, currentData) {
  return timelineData.map((timelineItem) => {
    const currentItem = currentData.find((currentItem) => currentItem.purchasing_doc_no === timelineItem.ebeln && currentItem.flag === timelineItem.mid);

    return currentItem ? { ...timelineItem, current_status: currentItem.current_status } : timelineItem;
  });
}

const poListQuery = (tokenData, searchValue, po, pageNo, pageSize) => {
  let LIMIT_OFFSET = "";
  if (pageSize >= 0) {
    const offset = (pageNo - 1) * pageSize;
    LIMIT_OFFSET = ` LIMIT ${pageSize} OFFSET ${offset}`;
  }
  // const orderByPo = " ORDER BY purchasing_doc_no DESC";
  const orderByPo = "";
  let poFilterQuery = "";
  if (searchValue && typeof searchValue == "string") {
    poFilterQuery += ` AND purchasing_doc_no LIKE '%${searchValue}%'`;
  }
  let Query = "";
  let CountQuery = "";
  let tempQuery = "";
  const UNION = " UNION ";
  
  switch (tokenData.department_id) {
    case USER_TYPE_GRSE_QAP:
      if (tokenData.internal_role_id === ASSIGNER) {
        Query = poListByEkko(tokenData, searchValue, po, pageNo, pageSize);
        CountQuery = poListCountByEkko(tokenData, searchValue);
      } else if (tokenData.internal_role_id === STAFF) {
        tempQuery = `SELECT DISTINCT(purchasing_doc_no), created_at from qap_submission WHERE 1 = 1 `;
        tempQuery += ` AND assigned_to = '${tokenData.vendor_code}' AND is_assign = 1`;
        tempQuery += poFilterQuery;
        CountQuery = poListCountForOtherUser(tempQuery);
        tempQuery += orderByPo;
        tempQuery += LIMIT_OFFSET;
        Query = poListForOtherUser(tempQuery, searchValue, po, pageNo, pageSize);
      }
      break;
    case USER_TYPE_GRSE_FINANCE:
      if (tokenData.internal_role_id === ASSIGNER) {
        Query = poListByEkko(tokenData, searchValue, po, pageNo, pageSize);
        CountQuery = poListCountByEkko(tokenData, searchValue);
      } else if (tokenData.internal_role_id === STAFF) {
        tempQuery += `SELECT DISTINCT(purchasing_doc_no) FROM sdbg WHERE assigned_to = '${tokenData.vendor_code}'`;
        tempQuery += poFilterQuery;
        tempQuery += UNION;
        tempQuery += `SELECT DISTINCT(purchasing_doc_no) FROM btn_assign WHERE assign_to = '${tokenData.vendor_code}'`;
        tempQuery += poFilterQuery;
        tempQuery += UNION;
        tempQuery += `SELECT DISTINCT(purchasing_doc_no) FROM btn_assign WHERE  assign_to_fi= '${tokenData.vendor_code}'`;
        tempQuery += poFilterQuery;
        CountQuery = poListCountForOtherUser(tempQuery);
        tempQuery += orderByPo;
        tempQuery += LIMIT_OFFSET;
        Query = poListForOtherUser(tempQuery, searchValue, po, pageNo, pageSize);
      }
      break;
    case USER_TYPE_GRSE_DRAWING:
      Query = poListByEkko(tokenData, searchValue, po, pageNo, pageSize);
      CountQuery = poListCountByEkko(tokenData, searchValue);
      break;
    case USER_TYPE_GRSE_PURCHASE:
      if (tokenData.internal_role_id === ASSIGNER) {
        Query = poListByEkko(tokenData, searchValue, po, pageNo, pageSize);
        CountQuery = poListCountByEkko(tokenData, searchValue);
      } else if (tokenData.internal_role_id === STAFF) {
        tempQuery += `SELECT DISTINCT(EBELN) as purchasing_doc_no,aedat as created_at from ekko AS EKKO WHERE 1 = 1 AND EKKO.ERNAM = '${tokenData.vendor_code}' `;
        // tempQuery += poFilterQuery;
        let conditionQ_D17 = "";
        if (searchValue) {
          conditionQ_D17 += ` AND ( EKKO.EBELN  LIKE '%${searchValue}%' OR EKKO.LIFNR LIKE '%${searchValue}%') `;
        }

        CountQuery = poListCountForOtherUser(tempQuery + conditionQ_D17);
        // tempQuery += orderByPo;
        // tempQuery += LIMIT_OFFSET;
        Query = poListForOtherUser(tempQuery + conditionQ_D17 + orderByPo + LIMIT_OFFSET, null, po, pageNo, pageSize);
      }
      break;
    case USER_TYPE_PPNC_DEPARTMENT:
      // Query = poListByEkko(tokenData, searchValue, po, pageNo, pageSize); // poListByPPNC(req.query);
      // CountQuery = poListCountByEkko(tokenData, searchValue);
      if (tokenData.internal_role_id === ASSIGNER) {
        Query = poListByEkko(tokenData, searchValue, po, pageNo, pageSize);
        CountQuery = poListCountByEkko(tokenData, searchValue);
      } else if (tokenData.internal_role_id === STAFF) {
        // tempQuery += `SELECT DISTINCT(EBELN) as purchasing_doc_no,aedat as created_at from ekko AS EKKO WHERE 1 = 1 AND EKKO.ERNAM = '${tokenData.vendor_code}' `;
        // let conditionQ_D14 = "";
        // if (searchValue) {
        //   conditionQ_D14 += ` AND ( EKKO.EBELN  LIKE '%${searchValue}%' OR EKKO.LIFNR LIKE '%${searchValue}%') `;
        // }
        // CountQuery = poListCountForOtherUser(tempQuery + conditionQ_D14);
        // Query = poListForOtherUser(tempQuery + conditionQ_D14 + orderByPo + LIMIT_OFFSET, null, po, pageNo, pageSize);

        tempQuery += `SELECT DISTINCT(EBELN) as purchasing_doc_no from ekko AS EKKO WHERE 1 = 1 AND EKKO.ERNAM = '${tokenData.vendor_code}'`;
        // tempQuery += poFilterQuery;
        if (searchValue) {
          tempQuery += ` AND ( EKKO.EBELN  LIKE '%${searchValue}%' OR EKKO.LIFNR LIKE '%${searchValue}%') `;
        }
        tempQuery += UNION;
        tempQuery += `SELECT DISTINCT(purchasing_doc_no) from WDC AS WDC WHERE WDC.ACTION_BY = '${tokenData.vendor_code}' OR WDC.ACTION_ON = '${tokenData.vendor_code}'`;
        tempQuery += poFilterQuery;
        CountQuery = poListCountForOtherUser(tempQuery);
        tempQuery += orderByPo;
        tempQuery += LIMIT_OFFSET;
        Query = poListForOtherUser(tempQuery, searchValue, po, pageNo, pageSize);
      }
      break;
    case STORE:
      Query = poListByEkko(tokenData, searchValue, po, pageNo, pageSize);
      CountQuery = poListCountByEkko(tokenData, searchValue);
      break;
    case RIC:
      Query = poListByEkko(tokenData, searchValue, po, pageNo, pageSize);
      CountQuery = poListCountByEkko(tokenData, searchValue);
      break;
    case USER_TYPE_GRSE_CONTRACT_CELL: {

      if (tokenData.internal_role_id === ASSIGNER) {
        Query = poListByEkko(tokenData, searchValue, po, pageNo, pageSize);
        CountQuery = poListCountByEkko(tokenData, searchValue);
      } else if (tokenData.internal_role_id === STAFF) {
        tempQuery += `SELECT DISTINCT(EBELN) as purchasing_doc_no,aedat as created_at from ekko AS EKKO WHERE 1 = 1 AND EKKO.ERNAM = '${tokenData.vendor_code}' `;
        // tempQuery += poFilterQuery;
        let conditionQ_D20 = "";
        if (searchValue) {
          conditionQ_D20 += ` AND ( EKKO.EBELN  LIKE '%${searchValue}%' OR EKKO.LIFNR LIKE '%${searchValue}%') `;
        }

        CountQuery = poListCountForOtherUser(tempQuery + conditionQ_D20);
        // tempQuery += orderByPo;
        // tempQuery += LIMIT_OFFSET;
        Query = poListForOtherUser(tempQuery + conditionQ_D20 + orderByPo + LIMIT_OFFSET, null, po, pageNo, pageSize);
      }

      // tempQuery += `SELECT DISTINCT(EBELN) as purchasing_doc_no,aedat as created_at from ekko AS EKKO WHERE 1 = 1 AND EKKO.ERNAM = '${tokenData.vendor_code}' `;
      // let conditionQ_D17 = "";
      // if (searchValue) {
      //   conditionQ_D17 += ` AND ( EKKO.EBELN  LIKE '%${searchValue}%' OR EKKO.LIFNR LIKE '%${searchValue}%') `;
      // }
      // CountQuery = poListCountForOtherUser(tempQuery + conditionQ_D17);
      // Query = poListForOtherUser(tempQuery + conditionQ_D17 + orderByPo + LIMIT_OFFSET, null, po, pageNo, pageSize);
    }
      break;
    default:
      Query = poListByEkko(tokenData, searchValue, po, pageNo, pageSize);
      CountQuery = poListCountByEkko(tokenData, searchValue);
   
  }
  return { Query, CountQuery };
};

const poListCopy = async (req, res) => {
  try {
    const client = await poolClient();
    const tokenData = req.tokenData;
    const { search, po } = req.query;
    let pageNo = parseInt(req.query.pageNo) || 1;
    let pageSize = parseInt(req.query.pageSize) || 2000;
    // let offset = (pageNo - 1) * pageSize;
    let CountQuery = "";
    let Query = "";

    try {
      if (tokenData.user_type === USER_TYPE_VENDOR) {
        Query = poListByEkko(tokenData, search, po, pageNo, pageSize);
        CountQuery = poListCountByEkko(tokenData, search);
      } else {
        const q = poListQuery(tokenData, search, po, pageNo, pageSize);
        Query = q.Query;
        CountQuery = q.CountQuery;
      }

      if (!Query) {
        return resSend(res, false, 400, "You don't have permission or no data found", null, null);
      }

      // console.error("---------poListQuery--------");
      // console.warn(Query);
      // console.error("--------poListCountQuery---------");
      // console.warn(CountQuery);
      const poDetails = await poolQuery({ client, query: Query, values: [] });

      if (!poDetails.length) {
        return resSend(res, true, 200, "No data found", poDetails, null, 0, 1);
      }
      let poArr = poDetails.map((el) => el?.EBELN || el?.ebeln || el?.purchasing_doc_no || el?.poNb);
      poArr = [...new Set(poArr)];
      const poCountData = await poolQuery({ client, query: CountQuery, values: [] }); // await getCount(client, poArr, conditionQuery);
      const poCount = parseInt(poCountData[0]?.total_count || 0);
      const contractualDates = await getActualAndCurrentDetails(client, poArr);
      const currentActivity = await currentStageHandleForAllActivity(client, poArr);
      const materialTypeQuery = "SELECT * FROM material_type";
      const materialType = await poolQuery({ client, query: materialTypeQuery, values: [] });
      const modifiedPOData = poDataModify2(poDetails);

      const result = [];
      for (const [key, value] of modifiedPOData.entries()) {
        const mileStoneActivity = setMileStoneActivity(key, contractualDates);
        const isMatTypePO = poTypeCheck(value, materialType);
        const poType = isMatTypePO;

        result.push({
          poNumber: key,
          currentStage: {
            current: currentActivity[key],
          },
          vendor_code: value[0]?.vendor_code,
          vendor_name: value[0]?.vendor_name,
          createdAt: value[0]?.createdAt,
          po_creator: value[0]?.po_creator,
          po_creator_name: value[0]?.po_creator_name,
          poType,
          ...mileStoneActivity,
        });
      }

      resSend(res, true, 200, Message.DATA_FETCH_SUCCESSFULL, result, "", poCount, pageNo);
    } catch (error) {
      console.error("error", error.message, error.stack);
      resSend(res, false, 500, Message.DATA_FETCH_ERROR, error.message, null);
    } finally {
      client.release();
    }
  } catch (error) {
    resSend(res, false, 501, Message.DB_CONN_ERROR, error.message, null);
  }
};

module.exports = { details, download, poListCopy };
