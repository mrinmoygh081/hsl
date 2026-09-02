const { resSend } = require("../lib/resSend");
const { poolClient, poolQuery, withTransaction } = require("../config/pgDbConfig");
const { SDBG_ENTRY, QAP_SUBMISSION, DRAWING, WDC } = require("../lib/tableName");
// const { checkPoType } = require("../services/lastassignee.servces");
const {
  USER_TYPE_HSL_QAP,
  ASSIGNER,
  STAFF,
  USER_TYPE_IT,
  USER_TYPE_HSL_FINANCE,
  USER_TYPE_HSL_DRAWING,
  USER_TYPE_VENDOR,
  DEFAULT_PAGE_NO,
  DEFAULT_PAGE_SIZE,
} = require("../lib/constant");
const { ASSIGNED, ACCEPTED, APPROVED } = require("../lib/status");
const localData = require("../utils/localData.json");
const Message = require("../utils/messages");
const { getDasboardBgExtensionList } = require("../services/stat.services");
const QueryBuilder = require("../utils/QueryBuilder");
const { LatestRecordQueryBuilder } = require("../utils/LatestRecordQueryBuilder");

// exports.statsForBG = async (req, res) => {
//   try {

//     await withTransaction(async (client) => {

//       const tokenData = req.tokenData;
//       const queryParams = req.query;

//       // For grse_FINANCE_ASSIGNER
//       let check = localData.registrationApprovedAuthority.map((el) => el.manNo) || [];
//       let Q = "";
//       let CountQ = "";
//       const val = [];
//       // Pagination
//       let pageNo = parseInt(queryParams.pageNo) || 1;
//       let pageSize = parseInt(queryParams.pageSize) || 5000;

//       let offset = (pageNo - 1) * pageSize;
//       let LIMIT_OFFSET = ` LIMIT ${pageSize} OFFSET ${offset} `;

//       if (
//         (tokenData.internal_role_id === ASSIGNER && tokenData.department_id === USER_TYPE_HSL_FINANCE) ||
//         tokenData.department_id === USER_TYPE_IT ||
//         check.includes(tokenData.vendor_code)
//       ) {
//         Q = `SELECT se.* FROM ${SDBG_ENTRY} se `;
//         CountQ = `SELECT count(*) as total_count FROM ${SDBG_ENTRY} se `;
//         const orderBy = ` ORDER BY se.created_at DESC `;

//         Q += orderBy + LIMIT_OFFSET;
//         // const result = await poolQuery({
//         //   client,
//         //   query: Q,
//         //   values: [],
//         // });

//         // const data = await Promise.all(
//         //   result.map(async (el2) => {
//         //     const po_type = await checkPoType(el2.purchasing_doc_no);
//         //     if (po_type) {
//         //       el2.po_type = po_type;
//         //     }
//         //     return el2;
//         //   })
//         // );
//         // return resSend(res, true, 200, "Data fetched successfully.", result, null);
//       }
//       // For grse_FINANCE_STAFF
//       if (tokenData.internal_role_id === STAFF && tokenData.department_id === USER_TYPE_HSL_FINANCE) {
//         Q = `
//           SELECT se.*
//           FROM ${SDBG_ENTRY} se
//           JOIN ${SDBG} s ON se.purchasing_doc_no = s.purchasing_doc_no
//           WHERE s.assigned_to = $1
//       `;
//         CountQ = ` SELECT se.*
//           FROM ${SDBG_ENTRY} se
//           JOIN ${SDBG} s ON se.purchasing_doc_no = s.purchasing_doc_no
//           WHERE s.assigned_to = $1`;

//         const orderBy = " ORDER BY se.created_at DESC ";
//         Q += orderBy + LIMIT_OFFSET;
//         val.push(tokenData.vendor_code)

//         // const result = await poolQuery({
//         //   client,
//         //   query: Q,
//         //   values: [tokenData.vendor_code],
//         // });

//         // const data = await Promise.all(
//         //   result.map(async (el2) => {
//         //     const po_type = await checkPoType(el2.purchasing_doc_no);
//         //     if (po_type) {
//         //       el2.po_type = po_type;
//         //     }
//         //     return el2;
//         //   })
//         // );

//       }

//       if (!Q) {
//         return resSend(res, false, 200, Message.YOU_ARE_UN_AUTHORIZED, []);
//       }

//       const [result, dataCount] = await Promise.all(
//         [
//           poolQuery({ client, query: Q, values: val }),
//           poolQuery({ client, query: CountQ, values: val })
//         ]);
//       console.log("Q", Q, dataCount, tokenData);
//       resSend(res, true, 200, "Data fetched successfully.", result, null, Number(dataCount[0]?.total_count) || 0,);
//     })
//   } catch (error) {
//     console.error("Error fetching data:", error);
//     resSend(res, false, 400, "Data not fetched!", null, null);

//   }
// }

exports.stats = async (req, res) => {
  let client;
  try {
    client = await poolClient();
    const tokenData = { ...req.tokenData };

    // check type
    const type = req.query.type;

    if (!type || (type != QAP_SUBMISSION && type != DRAWING)) {
      return resSend(res, false, 200, "please send a type.", null, null);
    }

    const TABLE = type;
    const ENTITY = type === QAP_SUBMISSION ? "QAP" : "DRAWING";
    const STATUS = type === QAP_SUBMISSION ? ACCEPTED : APPROVED;
    const USER_DEPT_ID = type === QAP_SUBMISSION ? USER_TYPE_HSL_QAP : USER_TYPE_HSL_DRAWING;
    const ASSIGNED_FROM = type === QAP_SUBMISSION ? "assigned_from" : "assign_from";
    const ASSIGNED_TO = type === QAP_SUBMISSION ? "assigned_to" : "assign_to";
    const ASSIGN_STATUS = type === QAP_SUBMISSION ? "is_assign" : "last_assigned";

    let accessUserList = localData.qapDashBoardSpecialAccessUsers.map((el) => el.manNo) || [];

    if (tokenData.department_id === USER_DEPT_ID || tokenData.department_id === USER_TYPE_IT || accessUserList.includes(tokenData.vendor_code)) {
      let str = "";
      let q;
      let result;
      let refNum = "";

      // For grse_ASSIGNER
      if (tokenData.internal_role_id === ASSIGNER) {
        q = `SELECT DISTINCT ON (t1.reference_no)
            t1.reference_no,
            t1.purchasing_doc_no,
            t1.vendor_code,
            t1.status,
            t3.name1 as vendor_name
            FROM ${TABLE} AS t1
                          LEFT JOIN
                              ekko AS t2
                          ON
                              t1.purchasing_doc_no = t2.ebeln

                              LEFT JOIN
                              lfa1 AS t3
                          ON
                              t2.lifnr = t3.lifnr
                        
          WHERE t1.reference_no != '${ENTITY} ASSIGNED'
            ORDER BY  t1.reference_no,t1.created_at DESC`;

        result = await poolQuery({
          client,
          query: q,
          values: [],
        });

        let strArr = [];
        if (result.length) {
          result.forEach((item) => {
            strArr.push(item.purchasing_doc_no);
          });
        }
        let refNumArr = [];
        if (result.length) {
          result.forEach((item) => {
            refNumArr.push(item.reference_no);
          });
        }

        function removeDuplicates(strArr) {
          return [...new Set(strArr)];
        }
        strArr = removeDuplicates(strArr);
        refNumArr = removeDuplicates(refNumArr);

        if (strArr.length) {
          strArr.forEach((item) => {
            // const no = item.purchasing_doc_no;
            str = str.concat("'").concat(`${item}`).concat("'").concat(",");
          });
        }
        str = str.slice(0, -1);
        if (refNumArr.length) {
          refNumArr.forEach((item) => {
            refNum = refNum.concat("'").concat(`${item}`).concat("'").concat(",");
          });
        }
        refNum = refNum.slice(0, -1);
      }

      // For grse_STAFF
      if (tokenData.internal_role_id === STAFF) {
        const getStrArrQ = `SELECT DISTINCT ON (purchasing_doc_no) purchasing_doc_no,${ASSIGNED_TO} 
              FROM ${TABLE} WHERE ${ASSIGNED_TO} = $1`;

        const getStrArrData = await poolQuery({
          client,
          query: getStrArrQ,
          values: [tokenData.vendor_code],
        });

        // return;
        if (getStrArrData.length) {
          getStrArrData.forEach((item) => {
            const no = item.purchasing_doc_no;
            str = str.concat("'").concat(`${no}`).concat("'").concat(",");
            const refNo = item.reference_no;
            refNum = refNum.concat("'").concat(`${refNo}`).concat("'").concat(",");
          });
        }
        str = str.slice(0, -1);

        refNum = refNum.slice(0, -1);

        let q = `SELECT DISTINCT ON (t1.reference_no)
            t1.reference_no,
            t1.purchasing_doc_no,
            t1.vendor_code,
            t1.status,
            t3.name1 as vendor_name
            FROM ${TABLE} AS t1
                          LEFT JOIN
                              ekko AS t2
                          ON
                              t1.purchasing_doc_no = t2.ebeln

                              LEFT JOIN
                              lfa1 AS t3
                          ON
                              t2.lifnr = t3.lifnr
                        
          WHERE t1.purchasing_doc_no IN (${str}) AND t1.reference_no != '${ENTITY} ASSIGNED'
            ORDER BY  t1.reference_no,t1.created_at DESC`;

        result = await poolQuery({
          client,
          query: q,
          values: [],
        });
      }

      const getAsfromAstoQ = `SELECT DISTINCT ON (purchasing_doc_no) purchasing_doc_no,${ASSIGNED_FROM},${ASSIGNED_TO},created_at AS assigned_on 
              FROM ${TABLE} WHERE purchasing_doc_no IN(${str})
          AND status = $1 AND ${ASSIGN_STATUS} = $2`;

      const getAsfromAstoData = await poolQuery({
        client,
        query: getAsfromAstoQ,
        values: [ASSIGNED, 1],
      });

      const getStatusAccepctedQ = `SELECT 
        MAX(created_at) AS created_at, reference_no 
        FROM ${TABLE} WHERE purchasing_doc_no IN(${str})
          AND status = $1  GROUP BY reference_no`;

      const getStatusAccepctedData = await poolQuery({
        client,
        query: getStatusAccepctedQ,
        values: [STATUS],
      });

      const created_at_difference_query = `SELECT 
       MIN(created_at) AS created_at,
        (MAX(created_at) - MIN(created_at)) AS created_at_difference,
          reference_no
        FROM 
             ${TABLE}
        WHERE 
            purchasing_doc_no IN(${str}) GROUP BY reference_no`;

      const created_at_difference_data = await poolQuery({
        client,
        query: created_at_difference_query,
        values: [],
      });
      let results = [];
      if (result && Array.isArray(result)) {
        results = result.map((el2) => {
          let staAcc = getStatusAccepctedData.find((ele) => ele.reference_no == el2.reference_no);
          staAcc ? (el2.accepted_on = staAcc.created_at) : (el2.accepted_on = "N/A");

          let DOObj = getAsfromAstoData.find((elms) => elms.purchasing_doc_no == el2.purchasing_doc_no);
          if (DOObj) {
            DOObj = { ...DOObj, ...el2 };
          } else {
            DOObj = {
              ...el2,
              assigned_from: "N/A",
              assigned_to: "N/A",
              assigned_on: "N/A",
            };
          }

          let timeTaken = created_at_difference_data.find((elms) => elms.reference_no == el2.reference_no);

          if (timeTaken) {
            const millisecondsInOneDay = 1000 * 60 * 60 * 24;
            const time_taken = Math.floor(parseInt(timeTaken.created_at_difference) / millisecondsInOneDay);

            return {
              ...DOObj,
              time_taken: time_taken,
              created_at: timeTaken.created_at,
            };
          } else {
            return {
              ...DOObj,
              time_taken: "N/A",
            };
          }
        });
      }

      resSend(res, true, 200, "Data fetched successfully.", results, null);
    } else {
      resSend(res, false, 200, "You are not authorized to view the information", null, null);
    }
  } catch (error) {
    console.error("Error fetching data:", error);
    resSend(res, false, 500, Message.SOMTHING_WENT_WRONG, null, null);
  } finally {
    if (client) client.release();
  }
};

exports.statsForBTN = async (req, res) => {
  let client;
  try {
    const tokenData = req.tokenData;
    const queryParams = req.query;

    // let check = localData.registrationApprovedAuthority.map((el) => el.manNo) || [];

    // if (
    //   tokenData.department_id != USER_TYPE_HSL_FINANCE &&
    //   tokenData.department_id != USER_TYPE_IT &&
    //   !check.includes(tokenData.vendor_code)
    // ) {
    //   return resSend(res, false, 401, Message.YOU_ARE_UN_AUTHORIZED, null, null);
    // }

    if (tokenData.user_type === USER_TYPE_VENDOR) {
      return resSend(res, false, 401, Message.YOU_ARE_UN_AUTHORIZED, null, null);
    }

    client = await poolClient();

    // Pagination
    let pageNo = parseInt(queryParams.pageNo) || 1;
    let pageSize = parseInt(queryParams.pageSize) || 5000;

    let offset = (pageNo - 1) * pageSize;
    let LIMIT_OFFSET = ` LIMIT ${pageSize} OFFSET ${offset} `;

    // Base Query
    let Q = `
      SELECT DISTINCT ON (LIST.btn_num)
        LIST.btn_num,
        LIST.status,
        LIST.purchasing_doc_no,
        LIST.created_at,
        LIST.assign_to,
        LIST.remarks,
        LIST.btn_type,

        COALESCE(
          material_btn.INVOICE_NO,
          SERVICE_BTN.INVOICE_NO,
          btn_jcc.INVOICE_NO,
          btn_pbg.invoice_no,
          btn_any_other_claim.letter_reference_no
        ) AS invoice_no,

        COALESCE(
          material_btn.invoice_file_path,
          SERVICE_BTN.invoice_file_path,
          btn_jcc.ref_invoice1_file_path,
          btn_any_other_claim.invoice_file_path,
          btn_pbg.invoice_file_path
        ) AS invoice_file_path,

        vendor_details.lifnr AS vendor_code,
        vendor_details.name1 AS vendor_name,
        vendor_details.vendor_type AS vendor_type

      FROM btn_list LIST

      LEFT JOIN btn AS material_btn 
        ON LIST.btn_num = material_btn.btn_num

      LEFT JOIN btn_service_hybrid AS SERVICE_BTN 
        ON LIST.btn_num = SERVICE_BTN.btn_num

      LEFT JOIN btn_any_other_claim AS btn_any_other_claim 
        ON LIST.btn_num = btn_any_other_claim.btn_num

      LEFT JOIN btn_pbg AS btn_pbg 
        ON LIST.btn_num = btn_pbg.btn_num

      LEFT JOIN btn_jcc AS btn_jcc 
        ON LIST.btn_num = btn_jcc.btn_num

      LEFT JOIN ekko AS ekko 
        ON LIST.purchasing_doc_no = ekko.ebeln

      LEFT JOIN lfa1 AS vendor_details 
        ON LIST.vendor_code = vendor_details.lifnr
    `;

    // WHERE clause
    let whereClause = ` WHERE 1=1 `;
    let val = [];
    let count = 0;

    // Filter by BTN
    if (queryParams.btn_num) {
      whereClause += ` AND LIST.btn_num LIKE $${++count}`;
      val.push(`%${queryParams.btn_num}%`);
    }
    if (queryParams.poNo) {
      whereClause += ` AND LIST.purchasing_doc_no LIKE $${++count}`;
      val.push(`%${queryParams.poNo}%`);
    }
    if (queryParams.status) {
      whereClause += ` AND LIST.status = $${++count}`;
      val.push(`${queryParams.status}`);
    }

    // if (tokenData.internal_role_id == STAFF) {
    //   whereClause += ` AND LIST.assign_to LIKE $${++count}`;
    //   val.push(`tokenData.vendor_code`);
    // }

    // Correct USER FILTER (IMPORTANT FIX)
    if (queryParams.assign_to) {
      whereClause += ` AND EXISTS (
        SELECT 1 FROM btn_list sub
        WHERE sub.btn_num = LIST.btn_num
        AND sub.assign_to LIKE $${++count}
      )`;
      val.push(`%${queryParams.assign_to}%`);
    }

    if (queryParams.vendor_type) {
      whereClause += ` AND EXISTS (
        SELECT 1
        FROM lfa1 vendor_details
        WHERE vendor_details.lifnr = LIST.vendor_code
        AND vendor_details.vendor_type ilike $${++count}
      )`;

      val.push(`%${queryParams.vendor_type}%`);
    }

  
    // ORDER BY (required for DISTINCT ON)
    // const orderBy = ` ORDER BY LIST.btn_num DESC `;
    const orderBy = ` ORDER BY LIST.btn_num DESC, LIST.created_at DESC `;

    // Final Query
    Q += whereClause + orderBy + LIMIT_OFFSET;

    // COUNT QUERY (same logic, no joins needed)
    let countQuery = `
      SELECT COUNT(DISTINCT LIST.btn_num) AS count
      FROM btn_list LIST
      ${whereClause}
    `;

    // Execute Queries

    // const result = await poolQuery({ client, query: Q, values: val });
    // const dataCount = await poolQuery({ client, query: countQuery, values: val });

    const [result, dataCount] = await Promise.all([poolQuery({ client, query: Q, values: val }), poolQuery({ client, query: countQuery, values: val })]);

    resSend(res, true, 200, Message.DATA_FETCH_SUCCESSFULL, result, null, parseInt(dataCount[0]?.count), pageNo);
  } catch (error) {
    console.error("Error btn dashboard api", error);
    resSend(res, false, 500, Message.SOMTHING_WENT_WRONG, null);
  } finally {
    if (client) client.release();
  }
};

exports.statsForBgExtension = async (req, res) => {
  let client;
  try {
    const tokenData = req.tokenData;
    const queryParams = req.query;
    let bgData = {};
    client = await poolClient();
    bgData = await getDasboardBgExtensionList(client, queryParams, tokenData);

    resSend(res, true, 200, Message.DATA_FETCH_SUCCESSFULL, bgData.result, "");
  } catch (error) {
    console.error("getBgExtensionList error", error.message, error);
    resSend(res, false, 500, Message.SOMTHING_WENT_WRONG, null);
  } finally {
    if (client) client.release();
  }
};

exports.statsForWDC = async (req, res) => {
  try {
    await withTransaction(async (client) => {
      const { tokenData, query: queryParams } = req;

      const pageNo = Number(queryParams.pageNo) || DEFAULT_PAGE_NO;

      const pageSize = Number(queryParams.pageSize) || DEFAULT_PAGE_SIZE;

      //--------------------------------------------------
      // Filters
      //--------------------------------------------------

      const filters = [];

      // Current Status Filters
      const filterableColumns = [
        "reference_no",
        "purchasing_doc_no",
        "action_type",
        "vendor_code",
        "status",
      ];

      if (queryParams.poNo) {
        queryParams.purchasing_doc_no = queryParams.poNo;
      }

      if (queryParams.search) {
        filters.push({
          group: [
            {
              column: "purchasing_doc_no",
              operator: "ILIKE",
              condition: "OR",
              value: queryParams.search,
            },
            {
              column: "vendor_code",
              operator: "ILIKE",
              value: queryParams.search,
              condition: "OR",
            },
            {
              column: "status",
              operator: "ILIKE",
              value: queryParams.search,
              condition: "OR",
            },
            {
              column: "reference_no",
              operator: "ILIKE",
              value: queryParams.search,
              condition: "OR",
            },
          ],
        });
      }

      filterableColumns.forEach((column) => {
        if (!queryParams[column]) return;

        filters.push({
          column,
          operator: "=",
          value: queryParams[column],
        });
      });

      //--------------------------------------------------
      // Mandatory Filters
      //--------------------------------------------------

      if (tokenData?.user_type === USER_TYPE_VENDOR) {
        filters.push({
          column: "vendor_code",
          operator: "=",
          value: tokenData.vendor_code,
        });
      }

      //--------------------------------------------------
      // Query Builder
      //--------------------------------------------------

      const { dataQuery, countQuery } = LatestRecordQueryBuilder({
        tableName: WDC,

        groupByColumn: "reference_no",

        timestampColumn: "created_at",

        pageNo,

        pageSize,

        selectColumns: [
          "lr.reference_no",
          "lr.purchasing_doc_no",
          "lr.action_type",
          "lr.vendor_code",
          "lr.unit",
          "lr.status",
          "lr.work_title",
          "lfa1.vendor_type",
        ],

        joins: [
          {
            type: "LEFT",
            table: "lfa1",
            on: "lfa1.lifnr = lr.vendor_code",
          },
        ],

        filters,
      });

      //--------------------------------------------------
      // Execute
      //--------------------------------------------------

      const [rows, countRows] = await Promise.all([
        poolQuery({ client, query: dataQuery.sql, values: dataQuery.params }),
        poolQuery({ client, query: countQuery.sql, values: countQuery.params }),
      ]);

      const finalQapResult = rows;

      return resSend(
        res,
        true,
        200,
        Message.DATA_FETCH_SUCCESSFULL,
        finalQapResult,
        null,
        Number(countRows?.[0]?.total || 0),
        pageNo,
      );
    });
  } catch (error) {
    console.error("statsForQA Error:", error);

    return resSend(res, false, 400, "Data not fetched!");
  }
};

exports.statsForQA = async (req, res) => {
  try {
    // console.log(req);
    await withTransaction(async (client) => {
      const { tokenData, query: queryParams } = req;

      const pageNo = Number(queryParams.pageNo) || DEFAULT_PAGE_NO;

      const pageSize = Number(queryParams.pageSize) || DEFAULT_PAGE_SIZE;

      //--------------------------------------------------
      // Filters
      //--------------------------------------------------

      const filters = [];

      // Current Status Filters
      const filterableColumns = [
        "status",
        "purchasing_doc_no",
        "vendor_code",
        "assigned_to",
        "vendor_type",
      ];

      if (queryParams["poNo"]) {
        queryParams["purchasing_doc_no"] = queryParams["poNo"];
      }

      if (queryParams["vendor_type"]) {
        queryParams["vendor_type"];
      }

      filterableColumns.forEach((column) => {
        if (!queryParams[column]) return;

        filters.push({
          column,
          operator: "=",
          value: queryParams[column],
        });
      });

      //--------------------------------------------------
      // Search Filter
      //--------------------------------------------------
      if (queryParams.search) {
        filters.push({
          group: [
            {
              column: "purchasing_doc_no",
              operator: "ILIKE",
              condition: "OR",
              value: queryParams.search,
            },
            {
              column: "vendor_code",
              operator: "ILIKE",
              value: queryParams.search,
              condition: "OR",
            },
            {
              column: "assigned_to",
              operator: "ILIKE",
              value: queryParams.search,
              condition: "OR",
            },
            {
              column: "status",
              operator: "ILIKE",
              value: queryParams.search,
              condition: "OR",
            },
            {
              column: "reference_no",
              operator: "ILIKE",
              value: queryParams.search,
              condition: "OR",
            },
          ],
        });
      }

      //--------------------------------------------------
      // Mandatory Filters
      //--------------------------------------------------

      filters.push({
        column: "reference_no",
        operator: "!=",
        value: "QAP ASSIGNED",
      });

      if (tokenData?.user_type === USER_TYPE_VENDOR) {
        filters.push({
          column: "vendor_code",
          operator: "=",
          value: tokenData.vendor_code,
        });
      }

      //--------------------------------------------------
      // Query Builder
      //--------------------------------------------------

      const { dataQuery, countQuery } = LatestRecordQueryBuilder({
        tableName: QAP_SUBMISSION,

        groupByColumn: "reference_no",

        timestampColumn: "created_at",

        pageNo,

        pageSize,

        selectColumns: [
          "lr.reference_no",
          "lr.purchasing_doc_no",
          "lr.vendor_code",
          "lr.status",
          "lr.assigned_to",
          "lr.assigned_from",
          "lr.created_at",

          "lr.created_at AS accepted_on",

          "vendor.name1 AS vendor_name",
          "vendor.vendor_type AS vendor_type",

          // "emp_assigned_to.cname AS assigned_to_name",

          // "emp_assigned_from.cname AS assigned_from_name"
        ],

        joins: [
          {
            type: "LEFT",
            table: "ekko ekko",
            on: "ekko.ebeln = lr.purchasing_doc_no",
          },

          {
            type: "LEFT",
            table: "lfa1 vendor",
            on: "vendor.lifnr = ekko.lifnr",
          },

          // {
          //   type: "LEFT",
          //   table: "pa0002 emp_assigned_to",
          //   on: "emp_assigned_to.pernr ::CHARACTER varying = lr.assigned_to"
          // },

          // {
          //   type: "LEFT",
          //   table: "pa0002 emp_assigned_from",
          //   on: "emp_assigned_from.pernr ::CHARACTER varying = lr.assigned_from"
          // }
        ],

        filters,
      });

      //--------------------------------------------------
      // Execute
      //--------------------------------------------------

      const [rows, countRows] = await Promise.all([
        poolQuery({ client, query: dataQuery.sql, values: dataQuery.params }),
        poolQuery({ client, query: countQuery.sql, values: countQuery.params }),
      ]);

      const AllPoNoArr = [...new Set(rows.map((el) => el.purchasing_doc_no))];
      let qapAssigndStatusData = [];

      if (AllPoNoArr.length) {
        const qb = new QueryBuilder(`${QAP_SUBMISSION} as qap`)
          .select([
            "qap.*, assignedToUser.cname as assigned_to_name, assignedFromUser.cname as assigned_from_name ",
          ])
          .joinTable(
            "LEFT",
            "pa0002 as assignedToUser",
            "assignedToUser.pernr ::CHARACTER varying = qap.assigned_to",
          )
          .joinTable(
            "LEFT",
            "pa0002 as assignedFromUser",
            "assignedFromUser.pernr ::CHARACTER varying = qap.assigned_from",
          )
          .whereIn("purchasing_doc_no", AllPoNoArr)
          .where("is_assign", "=", 1)
          .where("reference_no", "=", "QAP ASSIGNED");

        const buildQuery = qb.toJSON();

        qapAssigndStatusData = await poolQuery({
          client,
          query: buildQuery.sql,
          values: buildQuery.params,
        });
      }
      const finalQapResult = [];

      if (rows && rows.length) {
        rows.forEach((qaEle) => {
          const foundData = qapAssigndStatusData.find(
            (qaAssignedEle) =>
              qaAssignedEle.purchasing_doc_no == qaEle.purchasing_doc_no,
          );

          finalQapResult.push({
            ...qaEle,
            assigned_to: foundData?.assigned_to || null,
            assigned_to_name: foundData?.assigned_to_name || null,
            assigned_from: foundData?.assigned_from || null,
            assigned_from_name: foundData?.assigned_from_name || null,
          });
        });
      }
      return resSend(
        res,
        true,
        200,
        Message.DATA_FETCH_SUCCESSFULL,
        finalQapResult,
        null,
        Number(countRows?.[0]?.total || 0),
        pageNo,
      );
    });
  } catch (error) {
    console.error("statsForQA Error:", error);

    return resSend(res, false, 400, "Data not fetched!");
  }
};
exports.statsForDrawing = async (req, res) => {
  try {
    await withTransaction(async (client) => {
      const { tokenData, query: queryParams } = req;

      const pageNo = Number(queryParams.pageNo) || DEFAULT_PAGE_NO;

      const pageSize = Number(queryParams.pageSize) || DEFAULT_PAGE_SIZE;

      //--------------------------------------------------
      // Filters
      //--------------------------------------------------

      const filters = [];

      // Current Status Filters
      const filterableColumns = [
        "status",
        "purchasing_doc_no",
        "vendor_code",
        "assigned_to",
      ];

      filterableColumns.forEach((column) => {
        if (!queryParams[column]) return;

        filters.push({
          column,
          operator: "=",
          value: queryParams[column],
        });
      });

      //--------------------------------------------------
      // Search Filter
      //--------------------------------------------------

      if (queryParams.search) {
        filters.push({
          group: [
            {
              column: "purchasing_doc_no",
              operator: "ILIKE",
              condition: "OR",
              value: queryParams.search,
            },
            {
              column: "vendor_code",
              operator: "ILIKE",
              value: queryParams.search,
              condition: "OR",
            },
            {
              column: "action_by",
              operator: "ILIKE",
              value: queryParams.search,
              condition: "OR",
            },
            {
              column: "action_on",
              operator: "ILIKE",
              value: queryParams.search,
              condition: "OR",
            },
            {
              column: "status",
              operator: "ILIKE",
              value: queryParams.search,
              condition: "OR",
            },
          ],
        });
      }

      //--------------------------------------------------
      // Mandatory Filters
      //--------------------------------------------------

      if (tokenData?.user_type === USER_TYPE_VENDOR) {
        filters.push({
          column: "vendor_code",
          operator: "=",
          value: tokenData.vendor_code,
        });
      }

      //--------------------------------------------------
      // Query Builder
      //--------------------------------------------------

      const { dataQuery, countQuery } = LatestRecordQueryBuilder({
        tableName: DRAWING,

        groupByColumn: "reference_no",

        timestampColumn: "created_at",

        pageNo,

        pageSize,

        selectColumns: [
          "lr.reference_no",
          "lr.purchasing_doc_no",
          "lr.vendor_code",
          "lr.status",
          "lr.action_by",
          "lr.action_on",
          "lr.created_at",

          "lr.created_at AS accepted_on",

          "vendor.name1 AS vendor_name",
          "vendor.vendor_type AS vendor_type",

          "emp_action_by.cname AS action_by_name",

          "emp_action_on.cname AS action_on_name",
        ],

        joins: [
          {
            type: "LEFT",
            table: "ekko ekko",
            on: "ekko.ebeln = lr.purchasing_doc_no",
          },

          {
            type: "LEFT",
            table: "lfa1 vendor",
            on: "vendor.lifnr = ekko.lifnr",
          },

          {
            type: "LEFT",
            table: "pa0002 emp_action_on",
            on: "emp_action_on.pernr ::CHARACTER varying = lr.action_on",
          },

          {
            type: "LEFT",
            table: "pa0002 emp_action_by",
            on: "emp_action_by.pernr ::CHARACTER varying = lr.action_by",
          },
        ],

        filters,
      });

      //--------------------------------------------------
      // Execute
      //--------------------------------------------------

      const [rows, countRows] = await Promise.all([
        poolQuery({ client, query: dataQuery.sql, values: dataQuery.params }),
        poolQuery({ client, query: countQuery.sql, values: countQuery.params }),
      ]);

      const finalQapResult = rows;

      return resSend(
        res,
        true,
        200,
        Message.DATA_FETCH_SUCCESSFULL,
        finalQapResult,
        null,
        Number(countRows?.[0]?.total || 0),
        pageNo,
      );
    });
  } catch (error) {
    console.error("statsForQA Error:", error);

    return resSend(res, false, 400, "Data not fetched!");
  }
};
exports.statsForBG = async (req, res) => {
  try {
    await withTransaction(async (client) => {
      const { tokenData, query: queryParams } = req;

      const pageNo = Number(queryParams.pageNo) || DEFAULT_PAGE_NO;

      const pageSize = Number(queryParams.pageSize) || DEFAULT_PAGE_SIZE;

      //--------------------------------------------------
      // Filters
      //--------------------------------------------------

      const filters = [];

      // Current Status Filters
      const filterableColumns = ["status", "purchasing_doc_no", "reference_no"];
      if (queryParams.status == "All") {
        queryParams.status = "";
      }

      filterableColumns.forEach((column) => {
        if (!queryParams[column]) return;

        filters.push({
          column: `lr.${column}`,
          operator: "=",
          value: queryParams[column],
        });
      });

      //--------------------------------------------------
      // Search Filter
      //--------------------------------------------------

      if (queryParams.search) {
        filters.push({
          group: [
            {
              column: "lr.purchasing_doc_no",
              operator: "ILIKE",
              condition: "OR",
              value: queryParams.search,
            },
            {
              column: "lr.status",
              operator: "ILIKE",
              value: queryParams.search,
              condition: "OR",
            },
            {
              column: "lr.reference_no",
              operator: "ILIKE",
              value: queryParams.search,
              condition: "OR",
            },
          ],
        });
      }

      //--------------------------------------------------
      // Mandatory Filters
      //--------------------------------------------------

      if (
        tokenData.internal_role_id === STAFF &&
        tokenData.department_id === USER_TYPE_HSL_FINANCE
      ) {
        filters.push({
          column: "sdbg.assigned_to",
          operator: "=",
          value: tokenData.vendor_code,
        });
      }

      //--------------------------------------------------
      // Query Builder
      //--------------------------------------------------

      const { dataQuery, countQuery } = LatestRecordQueryBuilder({
        tableName: SDBG_ENTRY,

        groupByColumn: "reference_no",

        timestampColumn: "created_at",

        pageNo,

        pageSize,

        selectColumns: ["lr.*", "lfa1.vendor_type"],

        joins: [
          {
            type: "LEFT",
            table: "sdbg",
            on: "sdbg.reference_no = lr.reference_no",
          },
          {
            type: "LEFT",
            table: "lfa1",
            on: "lfa1.lifnr = sdbg.vendor_code ",
          },
        ],

        filters,
      });

      //--------------------------------------------------
      // Execute
      //--------------------------------------------------

      const [rows, countRows] = await Promise.all([
        poolQuery({ client, query: dataQuery.sql, values: dataQuery.params }),
        poolQuery({ client, query: countQuery.sql, values: countQuery.params }),
      ]);

      const finalQapResult = rows;
      // console.log(rows[1]);
      return resSend(
        res,
        true,
        200,
        Message.DATA_FETCH_SUCCESSFULL,
        finalQapResult,
        null,
        Number(countRows?.[0]?.total || 0),
        pageNo,
      );
    });
  } catch (error) {
    console.error("[ERROR] statsForBG:", error);

    return resSend(res, false, 400, "Data not fetched!");
  }
};
