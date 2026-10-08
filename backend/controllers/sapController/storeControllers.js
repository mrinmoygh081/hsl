const { TRUE } = require("../../lib/constant");
const { responseSend, resSend } = require("../../lib/resSend");
const { GATE_ENTRY_DATA, GATE_ENTRY_HEADER } = require("../../lib/tableName");
const { gateEntryHeaderPayload, gateEntryDataPayload } = require("../../services/sap.store.services");
const { generateInsertUpdateQuery, generateQueryForMultipleData } = require("../../lib/utils");
const Message = require("../../utils/messages");
const { poolClient, poolQuery, getQuery } = require("../../config/pgDbConfig");
const { sendMail } = require("../../services/mail.services");
const { GATE_ENTRY_DOC_CREATE } = require("../../lib/event");
const { getUserDetailsQuery } = require("../../utils/mailFunc");

const insertGateEntryData = async (req, res) => {
  let insertPayload = {};
  let payload = {};

  try {
    const client = await poolClient();
    let transactionSuccessful = false;
    payload = req.body;

    await client.query("BEGIN");

    async function insertRecurcionFn(payload, index) {
      if (index == payload.length) return;

      const { ITEM_TAB, ...obj } = payload[index];

      if (!obj || typeof obj !== "object" || !Object.keys(obj).length || !obj.ENTRY_NO || !obj.W_YEAR) {
        return responseSend(res, "F", 400, Message.INVALID_PAYLOAD, null, null);
      }

      try {
        insertPayload = await gateEntryHeaderPayload(obj);
        const gate_entry_h_Insert = await generateInsertUpdateQuery(insertPayload, GATE_ENTRY_HEADER, ["ENTRY_NO", "W_YEAR"]);
        await poolQuery({
          client,
          query: gate_entry_h_Insert.q,
          values: gate_entry_h_Insert.val,
        });
      } catch (error) {
        throw new Error(`${Message.DATA_INSERT_FAILED} ${error.toString()}`);
      }

      if (ITEM_TAB && ITEM_TAB?.length) {
        try {
          const zmilestonePayload = await gateEntryDataPayload(ITEM_TAB);
          const zmm_ge_line_item_q = await generateQueryForMultipleData(zmilestonePayload, GATE_ENTRY_DATA, ["ENTRY_NO", "EBELN", "EBELP", "W_YEAR"]);
          await poolQuery({
            client,
            query: zmm_ge_line_item_q.q,
            values: zmm_ge_line_item_q.val,
          });
        } catch (error) {
          throw new Error(`${Message.DATA_INSERT_FAILED} ${error.toString()}`);
        }
      }

      await handelMail(ITEM_TAB[0], obj);
      await insertRecurcionFn(payload, index + 1);
    }

    try {
      await insertRecurcionFn(payload, 0);
      await client.query("COMMIT");
      transactionSuccessful = true;
    } catch (error) {
      responseSend(res, "F", 502, error.message, error.stack, null);
    } finally {
      if (!transactionSuccessful) {
        await client.query("ROLLBACK");
      }
      if (transactionSuccessful === TRUE) {
        responseSend(res, "S", 200, "data insert succeed with", [], null);
      }
      client.release();
    }
  } catch (error) {
    console.error("GE-error", error.message, error.stack);
    responseSend(res, "F", 500, Message.SERVER_ERROR, error.message, null);
  }
};

async function handelMail(data, ge_h) {
  try {
    /**
     * HANDLE DUPLICATE MAIL SEND ISSUE
     * IF ALREADY EXIST GATE ENTRY THEN DON'T SEND MAIL
     */
    const geCount = await getQuery({
      query: "SELECT COUNT(*) FROM zmm_gate_entry_h WHERE ENTRY_NO = $1 AND W_YEAR = $2",
      values: [ge_h?.ENTRY_NO, ge_h?.W_YEAR],
    });

    // CHAECK GE ALREAY IN DO
    if (!parseInt(geCount[0]?.count)) {
      let vendorDetails = getUserDetailsQuery("vendor_by_po", "$1");
      const mail_details = await getQuery({
        query: vendorDetails,
        values: [data?.EBELN],
      });
      const dataObj = {
        ...data,
        purchasing_doc_no: data?.EBELN,
        vendor_name: mail_details[0]?.u_name,
      };
      await sendMail(GATE_ENTRY_DOC_CREATE, dataObj, { users: mail_details }, GATE_ENTRY_DOC_CREATE);
    }
  } catch (error) {
    console.error(error.message, error.stack);
  }
}

const storeActionList = async (req, res) => {
  try {

    /**
     * gate entry
     * grn
     * icgrn
     * resvertion ( SIR)
     * issue
     * service enty sheet
     */
    const client = await poolClient();
    try {
      let storeActionListQuery = `
                (SELECT NULL         AS docNo,
                    NULL         AS btn,
                    NULL         AS issueNo,
                    NULL         AS issueYear,
                    NULL         AS reservationNumber,
                    NULL         AS reservationDate,
                    gateEntryNo,
                    updatedBy,
                    dateTime,
                    'gate_entry' AS documentType
             FROM   (SELECT entry_no   AS gateEntryNo,
                            entry_date AS dateTime,
                            'grse'     AS updatedBy
                     FROM   zmm_gate_entry_h AS gateentry) AS gate_entry)
            UNION ALL
            
            (SELECT docno,
                    NULL           AS btn,
                    NULL           AS issueNo,
                    NULL           AS issueYear,
                    NULL           AS reservationNumber,
                    NULL           AS reservationDate,
                    NULL           AS gateEntryNo,
                    updatedby,
                    dateTime,
                    'icgrn_report' AS documentType
             FROM   (SELECT DISTINCT mblnr      AS docNo,
                                     ersteldat  AS dateTime,
                                     USER.cname AS updatedBy
                     FROM   qals AS q
                            LEFT JOIN pa0002 AS USER
                                   ON ( q.aenderer = USER.pernr )) AS qals)
            UNION ALL
            (SELECT NULL                 AS docNo,
                    NULL                 AS btn,
                    NULL                 AS issueNo,
                    NULL                 AS issueYear,
                    reservationNumber,
                    reservationDate,
                    NULL                 AS gateEntryNo,
                    updatedby,
                    dateTime,
                    'reservation_report' AS documentType
             FROM   (SELECT rsnum      AS reservationNumber,
                            rsdat      AS reservationDate,
                            rsdat      AS dateTime,
                            USER.cname AS updatedBy
                     FROM   rkpf AS rk
                            LEFT JOIN pa0002 AS USER
                                   ON ( rk.usnam = USER.pernr)
                     GROUP  BY rk.rsnum,
                               rk.rsdat) AS rkpf)
            UNION ALL
            (
                SELECT NULL AS docno,
                       NULL AS btn,
                       issueno,
                       issueyear,
                       NULL AS reservationnumber,
                       NULL AS reservationdate,
                       NULL AS gateentryno,
                       updatedby,
                       dateTime,
                       'goods_issue_slip' AS documenttype
                FROM   (
                                 SELECT    mblnr      AS issueno,
                                           mjahr      AS issueyear,
                                           USER.cname AS updatedby,
                                           bwart,
                                           budat_mkpf AS dateTime
                                 FROM      mseg       AS ms
                                 LEFT JOIN pa0002     AS USER
                                 ON        (
                                                     ms.usnam_mkpf = USER.pernr )
                                 GROUP BY  ms.mblnr,
                                           ms.mjahr) AS mseg
                WHERE  
                              mseg.bwart IN ('221',
                                             '281',
                                             '201',
                                             '321',
                                             '222',
                                             '202',
                                             '122'))`;

      storeActionListQuery = `SELECT * FROM ((SELECT 
                
                NULL         AS matDocNo,
                NULL         AS docNo,
                                                NULL         AS btn,
                                                NULL         AS issueNo,
                                                NULL         AS issueYear,
                                                NULL         AS reservationNumber,
                                                NULL         AS reservationDate,
                                                gateEntryNo,
                                                updatedBy,
                                                dateTime,
                                                 purchasing_doc_no,
                                                'gate_entry' AS documentType
                                         FROM   (SELECT zmm_gate_entry_d.entry_no   AS gateEntryNo,
                                                         zmm_gate_entry_d.ebeln AS purchasing_doc_no,
                                                        zmm_gate_entry_h.entry_date AS dateTime,
                                                        'grse'     AS updatedBy
                                                 FROM   zmm_gate_entry_d AS zmm_gate_entry_d
                                                 LEFT JOIN zmm_gate_entry_h AS zmm_gate_entry_h
                                                     ON zmm_gate_entry_d.ENTRY_NO = zmm_gate_entry_h.ENTRY_NO
                                                 GROUP BY zmm_gate_entry_d.entry_no
                            ) AS gate_entry)

                            UNION ALL

                            (

                            SELECT 		matDocNo,
                				NULL           AS docno,
                                NULL           AS btn,
                                NULL           AS issueNo,
                                NULL           AS issueYear,
                                NULL           AS reservationNumber,
                                NULL           AS reservationDate,
                                NULL           AS gateEntryNo,
                                NULL           AS updatedby,
                                dateTime,
                                purchasing_doc_no,
                                'grn_report' AS documentType
                         FROM   (
                            SELECT 
                        mseg.MBLNR as matDocNo,
                        mseg.EBELN as purchasing_doc_no,
                        mseg.budat_mkpf AS dateTime
                            FROM mseg AS mseg
                            WHERE 1 = 1 AND  ( mseg.BWART IN ('101') )) AS mseg
                            )
                            
                            UNION ALL
                            
                            (SELECT             NULL         AS matDocNo,
                                                docno,
                                                NULL           AS btn,
                                                NULL           AS issueNo,
                                                NULL           AS issueYear,
                                                NULL           AS reservationNumber,
                                                NULL           AS reservationDate,
                                                NULL           AS gateEntryNo,
                                                updatedby,
                                                dateTime,
                                                purchasing_doc_no,
                                                'icgrn_report' AS documentType
                                         FROM   (SELECT DISTINCT mblnr      AS docNo,
                                                                 ersteldat  AS dateTime,
                                                 q.EBELN as purchasing_doc_no,
                                                                 USER.cname AS updatedBy
                                                 FROM   qals AS q
                                                        LEFT JOIN pa0002 AS USER
                                                               ON ( q.aenderer = USER.pernr )) AS qals)
                            
                            UNION ALL
                            
                            (SELECT             NULL                 AS matDocNo,
                                                NULL                 AS docNo,
                                                NULL                 AS btn,
                                                NULL                 AS issueNo,
                                                NULL                 AS issueYear,
                                                reservationNumber,
                                                reservationDate,
                                                NULL                 AS gateEntryNo,
                                                updatedby,
                                                dateTime,
                                                 purchasing_doc_no,
                                                'reservation_report' AS documentType
                                         FROM   (SELECT rk.rsnum      AS reservationNumber,
                                                        rk.rsdat      AS reservationDate,
                                                        rk.rsdat      AS dateTime,
                                                         rk.EBELN as purchasing_doc_no,
                                                        USER.cname AS updatedBy
                                                 FROM   rkpf AS rk
                                                        LEFT JOIN pa0002 AS USER
                                                               ON ( rk.usnam = USER.pernr)
                                                 GROUP  BY rk.rsnum,
                                                           rk.rsdat) AS rkpf)
                            
                            UNION ALL

                            (
                                            SELECT 
                                                   NULL         AS matDocNo,
                                                   NULL AS docno,
                                                   NULL AS btn,
                                                   issueno,
                                                   issueyear,
                                                   NULL AS reservationnumber,
                                                   NULL AS reservationdate,
                                                   NULL AS gateentryno,
                                                   updatedby,
                                                   dateTime,
                                                   purchasing_doc_no,
                                                   'goods_issue_slip' AS documenttype
                                            FROM   (
                                                             SELECT    ms.mblnr      AS issueno,
                                                                       ms.mjahr      AS issueyear,
                                                                       USER.cname AS updatedby,
                                                                       ms.bwart,
                                                                       budat_mkpf AS dateTime,
                                                                        ms.EBELN as purchasing_doc_no
                                                             FROM      mseg       AS ms
                                                             LEFT JOIN pa0002     AS USER
                                                             ON        (
                                                                                 ms.usnam_mkpf = USER.pernr )
                                                             GROUP BY  ms.mblnr,
                                                                       ms.mjahr) AS mseg
                                            WHERE  
                                                          mseg.bwart IN ('221',
                                                                         '281',
                                                                         '201',
                                                                         '321',
                                                                         '222',
                                                                         '202',
                                                                         '122'))) AS store_action_list WHERE 1 = 1`;

      //     (SELECT NULL              AS docNo,
      //         btn,
      //         NULL              AS issueNo,
      //         NULL              AS issueYear,
      //         NULL              AS reservationNumber,
      //         NULL              AS reservationDate,
      //         NULL AS gateEntryNo,
      //         updatedBy,
      //         dateTime,
      //         'ztfi_bil_deface' AS documentType
      //  FROM   (SELECT DISTINCT zregnum    AS btn,
      //                          zcreatedon AS dateTime,
      //                          USER.cname AS updatedBy
      //          FROM   ztfi_bil_deface AS zb
      //                 LEFT JOIN pa0002 AS USER
      //                        ON ( zb.zcreatedby = USER.pernr )) AS ztfi_bil_deface)

      storeActionListQuery = `
            SELECT * FROM ((SELECT 
                
                NULL         AS "matDocNo",
                NULL         AS "docNo",
                                                NULL         AS "btn",
                                                NULL         AS "issueNo",
                                                NULL         AS "issueYear",
                                                NULL         AS "reservationNumber",
                                                NULL         AS "reservationDate",
                                                gateEntryNo AS "gateEntryNo",
                                                updatedBy AS "updatedBy",
                                                dateTime AS "dateTime",
                                                purchasing_doc_no AS "purchasing_doc_no",
                								NULL AS "serviceEntryNumber",
                                                'gate_entry' AS "documentType"
                                         FROM   (SELECT zmm_gate_entry_d.entry_no   AS "gateEntryNo",
                                                         zmm_gate_entry_d.ebeln AS "purchasing_doc_no",
                                                        zmm_gate_entry_h.entry_date AS "dateTime",
                                                        'grse'     AS "updatedBy"
                                                 FROM   zmm_gate_entry_d AS zmm_gate_entry_d
                                                 LEFT JOIN zmm_gate_entry_h AS zmm_gate_entry_h
                                                     ON zmm_gate_entry_d.ENTRY_NO = zmm_gate_entry_h.ENTRY_NO
                                                 GROUP BY zmm_gate_entry_d.entry_no
                            ) AS gate_entry)

                            UNION ALL

                            (

                            SELECT 		matDocNo AS "matDocNo",
                				NULL           AS "docNo",
                                NULL           AS "btn",
                                NULL           AS "issueNo",
                                NULL           AS "issueYear",
                                NULL           AS "reservationNumber",
                                NULL           AS "reservationDate",
                                NULL           AS "gateEntryNo",
                                NULL           AS "updatedby",
                                dateTime        AS "dateTime",
                                purchasing_doc_no AS purchasing_doc_no,
                                NULL AS "serviceEntryNumber",
                                'grn_report' AS "documentType"
                         FROM   (
                            SELECT 
                        mseg.MBLNR as "matDocNo",
                        mseg.EBELN as "purchasing_doc_no",
                        mseg.budat_mkpf AS "dateTime"
                            FROM mseg AS mseg
                            WHERE 1 = 1 AND  ( mseg.BWART IN ('101') )) AS mseg
                            )
                            
                            UNION ALL
                            
                            (SELECT             NULL         AS "matDocNo",
                                                docNo         AS "docNo",
                                                NULL           AS "btn",
                                                NULL           AS "issueNo",
                                                NULL           AS "issueYear",
                                                NULL           AS "reservationNumber",
                                                NULL           AS "reservationDate",
                                                NULL           AS "gateEntryNo",
                                                updatedBy       AS "updatedBy",
                                                dateTime        AS "dateTime",
                                                purchasing_doc_no AS "purchasing_doc_no",
                             					NULL AS serviceEntryNumber,
                                                'icgrn_report' AS documentType
                                         FROM   (SELECT DISTINCT mblnr      AS "docNo",
                                                                 ersteldat  AS "dateTime",
                                                                 q.EBELN as "purchasing_doc_no",
                                                                 USER.cname AS "updatedBy"
                                                 FROM   qals AS q
                                                        LEFT JOIN pa0002 AS USER
                                                               ON ( q.aenderer = USER.pernr )) AS qals)
                            
                            UNION ALL
                            
                            (SELECT             NULL                 AS "matDocNo",
                                                NULL                 AS "docNo",
                                                NULL                 AS "btn",
                                                NULL                 AS "issueNo",
                                                NULL                 AS "issueYear",
                                                reservationNumber AS "reservationNumber",
                                                reservationDate AS "reservationDate",
                                                NULL                 AS "gateEntryNo",
                                                updatedBy       AS "updatedBy",
                                                dateTime        AS "dateTime",
                                                purchasing_doc_no AS "purchasing_doc_no",
                                                 NULL AS "serviceEntryNumber",
                                                'reservation_report' AS "documentType"
                                         FROM   (SELECT rk.rsnum      AS "reservationNumber",
                                                        rk.rsdat      AS "reservationDate",
                                                        rk.rsdat      AS "dateTime",
                                                         rk.EBELN as "purchasing_doc_no",
                                                        USER.cname AS "updatedBy"
                                                 FROM   rkpf AS rk
                                                        LEFT JOIN pa0002 AS USER
                                                               ON ( rk.usnam = USER.pernr)
                                                 GROUP  BY rk.rsnum,
                                                           rk.rsdat) AS rkpf)
                            
                            UNION ALL

                            (
                                            SELECT 
                                                   NULL         AS "matDocNo",
                                                   NULL AS "docNo",
                                                   NULL AS "btn",
                                                   issueNo AS "issueNo",
                                                   issueYear as "issueYear",
                                                   NULL AS "reservationNumber",
                                                   NULL AS "reservationDate",
                                                   NULL AS "gateentryNo",
                                                   updatedBy       AS "updatedBy",
                                                   dateTime        AS "dateTime",
                                                   purchasing_doc_no AS "purchasing_doc_no",
                                					NULL AS "serviceEntryNumber",
                                                   'goods_issue_slip' AS "documentType"
                                            FROM   (
                                                             SELECT    ms.mblnr      AS "issueNo",
                                                                       ms.mjahr      AS "issueYear",
                                                                       USER.cname AS "updatedby",
                                                                       ms.bwart,
                                                                       budat_mkpf AS "dateTime",
                                                                        ms.EBELN as "purchasing_doc_no"
                                                             FROM      mseg       AS ms
                                                             LEFT JOIN pa0002     AS USER
                                                             ON        (
                                                                                 ms.usnam_mkpf = USER.pernr )
                                                             GROUP BY  ms.mblnr,
                                                                       ms.mjahr) AS mseg
                                            WHERE  
                                                          mseg.bwart IN ('221',
                                                                         '281',
                                                                         '201',
                                                                         '321',
                                                                         '222',
                                                                         '202',
                                                                         '122'))

              UNION ALL
               
               (SELECT             				NULL         		AS "matDocNo",
                                                NULL                 AS "docNo",
                                                NULL                 AS "btn",
                                                NULL                 AS "issueNo",
                                                NULL                 AS "issueYear",
                                                NULL AS "reservationNumber",
                                                NULL AS "reservationDate",
                                                NULL                 AS "gateEntryNo",
                                                NULL AS "updatedby",
                                                dateTime as "dateTime" ,
                                                 purchising_doc_no as "purchising_doc_no",
                                                 serviceEntryNumber as "serviceEntryNumber",
                                                'service_entry_report' AS "documentType"
                                         FROM   (
                                             SELECT essr.lblni as "serviceEntryNumber",
                								essr.ebeln as "purchising_doc_no",
                								essr.erdat as "dateTime"
                
                							FROM essr) AS essr)

              ) AS store_action_list WHERE 1 = 1`;

      storeActionListQuery = `
SELECT 
  * 
FROM 
  (
    (
      SELECT 
        NULL AS "matDocNo", 
        NULL AS "docNo", 
        NULL AS "btn", 
        NULL AS "issueNo", 
        NULL AS "issueYear", 
        NULL AS "reservationNumber", 
        NULL AS "reservationDate", 
        "gateEntryNo" AS "gateEntryNo", 
        "updatedBy" AS "updatedBy", 
        "dateTime" AS "dateTime", 
        "purchasing_doc_no" AS "purchasing_doc_no", 
        NULL AS "serviceEntryNumber", 
        'gate_entry' AS "documentType" 
      FROM 
        (
          SELECT 
            zmm_gate_entry_d.entry_no AS "gateEntryNo", 
            zmm_gate_entry_d.ebeln AS "purchasing_doc_no", 
            zmm_gate_entry_h.entry_date AS "dateTime", 
            'grse' AS "updatedBy" 
          FROM 
            zmm_gate_entry_d AS zmm_gate_entry_d 
            LEFT JOIN zmm_gate_entry_h AS zmm_gate_entry_h ON zmm_gate_entry_d.ENTRY_NO = zmm_gate_entry_h.ENTRY_NO 
          GROUP BY 
            zmm_gate_entry_d.entry_no, 
            zmm_gate_entry_d.ebeln, 
            zmm_gate_entry_h.entry_date
        ) AS gate_entry
    ) 
    UNION ALL 
      (
        SELECT 
          "matDocNo" AS "matDocNo", 
          NULL AS "docNo", 
          NULL AS "btn", 
          NULL AS "issueNo", 
          NULL AS "issueYear", 
          NULL AS "reservationNumber", 
          NULL AS "reservationDate", 
          NULL AS "gateEntryNo", 
          NULL AS "updatedby", 
          "dateTime" AS "dateTime", 
          "purchasing_doc_no" AS purchasing_doc_no, 
          NULL AS "serviceEntryNumber", 
          'grn_report' AS "documentType" 
        FROM 
          (
            SELECT 
              DISTINCT mseg.MBLNR as "matDocNo", 
              mseg.EBELN as "purchasing_doc_no", 
              mseg.budat_mkpf AS "dateTime" 
            FROM 
              mseg AS mseg 
            WHERE 
              1 = 1 
              AND (
                mseg.BWART IN ('101')
              )
          ) AS mseg
      ) 
    UNION ALL 
      (
        SELECT 
          NULL AS "matDocNo", 
          "docNo" AS "docNo", 
          NULL AS "btn", 
          NULL AS "issueNo", 
          NULL AS "issueYear", 
          NULL AS "reservationNumber", 
          NULL AS "reservationDate", 
          NULL AS "gateEntryNo", 
          "updatedBy" AS "updatedBy", 
          "dateTime" AS "dateTime", 
          "purchasing_doc_no" AS "purchasing_doc_no", 
          NULL AS "serviceEntryNumber", 
          'icgrn_report' AS documentType 
        FROM 
          (
            SELECT 
              DISTINCT mblnr AS "docNo", 
              ersteldat AS "dateTime", 
              q.EBELN as "purchasing_doc_no", 
              'grse' AS "updatedBy" 
            FROM 
              qals AS q 
          ) AS qals
      ) 
    UNION ALL 
      (
        SELECT 
          NULL AS "matDocNo", 
          NULL AS "docNo", 
          NULL AS "btn", 
          NULL AS "issueNo", 
          NULL AS "issueYear", 
          "reservationNumber" AS "reservationNumber", 
          "reservationDate" AS "reservationDate", 
          NULL AS "gateEntryNo", 
          "updatedBy" AS "updatedBy", 
          "dateTime" AS "dateTime", 
          "purchasing_doc_no" AS "purchasing_doc_no", 
          NULL AS "serviceEntryNumber", 
          'reservation_report' AS "documentType" 
        FROM 
          (
            SELECT 
              rk.rsnum::character varying AS "reservationNumber", 
              rk.rsdat::character varying AS "reservationDate", 
              rk.rsdat AS "dateTime", 
              rk.EBELN as "purchasing_doc_no", 
              'update' AS "updatedBy" 
            FROM 
              rkpf AS rk 
              
            GROUP BY 
              rk.rsnum, 
              rk.rsdat
          ) AS rkpf
      ) 
    UNION ALL 
      (
        SELECT 
          NULL AS "matDocNo", 
          NULL AS "docNo", 
          NULL AS "btn", 
          "issueNo" AS "issueNo", 
          "issueYear" as "issueYear", 
          NULL AS "reservationNumber", 
          NULL AS "reservationDate", 
          NULL AS "gateentryNo", 
          mseg.updatedBy AS "updatedBy", 
          "dateTime" AS "dateTime", 
          "purchasing_doc_no" AS "purchasing_doc_no", 
          NULL AS "serviceEntryNumber", 
          'goods_issue_slip' AS "documentType" 
        FROM 
          (
            SELECT 
              ms.mblnr AS "issueNo", 
              ms.mjahr::character varying AS "issueYear", 
              'grse' AS "updatedby", 
              ms.bwart, 
              budat_mkpf AS "dateTime", 
              ms.EBELN as "purchasing_doc_no" 
            FROM 
              mseg AS ms 
            
            GROUP BY 
              ms.mblnr, 
              ms.bwart, 
              budat_mkpf, 
              ms.mjahr, 
              ms.EBELN
          ) AS mseg 
        WHERE 
          mseg.bwart IN (
            '221', '281', '201', '321', '222', '202', 
            '122'
          )
      ) 
    UNION ALL 
      (
        SELECT 
          NULL AS "matDocNo", 
          NULL AS "docNo", 
          NULL AS "btn", 
          NULL AS "issueNo", 
          NULL AS "issueYear", 
          NULL AS "reservationNumber", 
          NULL AS "reservationDate", 
          NULL AS "gateEntryNo", 
          NULL AS "updatedby", 
          "dateTime" as "dateTime", 
          "purchising_doc_no" as "purchising_doc_no", 
          "serviceEntryNumber" as "serviceEntryNumber", 
          'service_entry_report' AS "documentType" 
        FROM 
          (
            SELECT 
              essr.lblni as "serviceEntryNumber", 
              essr.ebeln as "purchising_doc_no", 
              essr.erdat as "dateTime" 
            FROM 
              essr
          ) AS essr
      )
  ) AS store_action_list WHERE 1 = 1`;

      const queryParams = req.query;
      const val = [];
      if (queryParams.poNo) {
        storeActionListQuery.concat(" AND store_action_list.purchasing_doc_no = $1 ");
        val.push(queryParams.poNo);
      }

      const results = await Promise.all([
        getGateEntry(client, val),
        getGrn(client, val),
        getICGrn(client, val),
        // getReservation(client, val),
        // getGoodsIssueSlip(client, val),
        getServiceEntry(client, val),
      ]);

      let result2 = [];
      if (results[0] && results[0]?.length) {
        // Gate Entry
        result2 = result2.concat(results[0]);
      }
      if (results[1] && results[1]?.length) {
        // GRN
        result2 = result2.concat(results[1]);
      }
      if (results[2] && results[2]?.length) {
        // ICGRN
        result2 = result2.concat(results[2]);
      }
      if (results[3] && results[3]?.length) {
        // SERVICE ENTRY SHEET
        result2 = result2.concat(results[3]);
      }

      resSend(res, true, 200, "data fetch success", result2, null);
    } catch (error) {
      responseSend(res, "F", 502, "data fetch failed !!", error.message, null);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error(error.message);
    responseSend(res, "F", 400, "Error in database conn!!", error.message, null);
  }
};
const gateEntryReport = async (req, res) => {
  try {
    let ge_query = `
            SELECT 
                zmm_gate_entry_h.ENTRY_NO as "gate_entry_no",
                zmm_gate_entry_h.ENTRY_DATE as "entry_date",
                zmm_gate_entry_h.VEH_REG_NO as "vehicle_no",
                zmm_gate_entry_d.INVNO as "invoice_number",
                zmm_gate_entry_d.INV_DATE as "invoice_date",
                zmm_gate_entry_d.EBELN as "purchising_doc_no",
                zmm_gate_entry_d.EBELP as "po_line_item_no",
                zmm_gate_entry_d.CH_QTY as "chalan_quantity",
                zmm_gate_entry_d.CH_NETWT as "net_quantity",
                zmm_gate_entry_d.MATNR as "material_code",
                material.MAKTX as "material_desc",
                ekko.LIFNR as "vendor_code",
                lfa1.NAME1 as "vendor_name",
                ekpo.MENGE as "quantity"
                FROM zmm_gate_entry_h AS zmm_gate_entry_h 
            LEFT JOIN zmm_gate_entry_d as zmm_gate_entry_d
                ON( zmm_gate_entry_h.ENTRY_NO = zmm_gate_entry_d.ENTRY_NO)
                LEFT JOIN ekko as ekko
                	ON (zmm_gate_entry_d.EBELN = ekko.EBELN)
                    LEFT JOIN ekpo as ekpo
                	ON (zmm_gate_entry_d.EBELN = ekpo.EBELN AND zmm_gate_entry_d.EBELP = ekpo.EBELP)
                    LEFT JOIN lfa1 as lfa1
                    	ON(lfa1.LIFNR = ekko.LIFNR)
                    LEFT JOIN makt as material
                        ON(material.MATNR = zmm_gate_entry_d.MATNR)
                WHERE 1 = 1`;

    if (req.body.gate_entry_no) {
      ge_query = ge_query.concat(` AND zmm_gate_entry_h.ENTRY_NO = '${req.body.gate_entry_no}'`);
    }

    let results = await getQuery({ query: ge_query.q, values: ge_query.val });
    let obj = {
      gate_entry_no: null,
      entry_date: null,
      vendor_code: null,
      vendor_name: null,
      invoice_number: null,
      vehicle_no: null,
    };
    if (results && results.length) {
      ((obj.gate_entry_no = results[0].gate_entry_no),
        (obj.entry_date = results[0].entry_date),
        (obj.vendor = results[0].vendor),
        (obj.invoice_number = results[0].invoice_number),
        (obj.vehicle_no = results[0].vehicle_no),
        (obj.vendor_name = results[0].vendor_name),
        (obj.vendor_code = results[0].vendor_code),
        (obj.line_items = results));
    }

    if (results.length) {
      resSend(res, true, 200, "data fetch success", obj, null);
    } else {
      resSend(res, false, 200, "no data found", [], null);
    }
  } catch (error) {
    resSend(res, false, 502, error.toString(), error.stack, null);
  }
};

async function getGateEntry(client, data) {
  let gateEntryQuery = `SELECT 
    ZMM_GATE_ENTRY_D.ENTRY_NO AS "gateEntryNo",
    	ZMM_GATE_ENTRY_D.EBELN AS "purchasing_doc_no",
    	ZMM_GATE_ENTRY_D.INVNO AS "invoice_no",
    	ZMM_GATE_ENTRY_D.INV_DATE AS "invoice_date",
    	ZMM_GATE_ENTRY_H.ENTRY_DATE AS "dateTime",
      'gate_entry' AS "documentType"
    FROM ZMM_GATE_ENTRY_D AS ZMM_GATE_ENTRY_D
    	LEFT JOIN ZMM_GATE_ENTRY_H AS ZMM_GATE_ENTRY_H 
    		ON (ZMM_GATE_ENTRY_D.ENTRY_NO = ZMM_GATE_ENTRY_H.ENTRY_NO)
    WHERE ZMM_GATE_ENTRY_D.EBELN = $1
    GROUP BY 
            ZMM_GATE_ENTRY_D.ENTRY_NO, 
            ZMM_GATE_ENTRY_D.EBELN, 
            ZMM_GATE_ENTRY_D.ENTRY_DATE,
            ZMM_GATE_ENTRY_D.INV_DATE
    `;

  gateEntryQuery = `
    SELECT 
    DISTINCT ZMM_GATE_ENTRY_D.ENTRY_NO AS "gateEntryNo",
    ZMM_GATE_ENTRY_D.EBELN AS "purchasing_doc_no",
    ZMM_GATE_ENTRY_D.INVNO AS "invoice_no",
    ZMM_GATE_ENTRY_H.ENTRY_DATE AS "dateTime",
    'gate_entry' AS "documentType"
FROM ZMM_GATE_ENTRY_H AS ZMM_GATE_ENTRY_H
LEFT JOIN ZMM_GATE_ENTRY_D AS ZMM_GATE_ENTRY_D 
    ON ZMM_GATE_ENTRY_D.ENTRY_NO = ZMM_GATE_ENTRY_H.ENTRY_NO
WHERE ZMM_GATE_ENTRY_D.EBELN = $1 
  AND (ZMM_GATE_ENTRY_D.INVNO IS NOT NULL 
       OR NOT EXISTS (
           SELECT 1 
           FROM ZMM_GATE_ENTRY_D AS sub 
           WHERE sub.ENTRY_NO = ZMM_GATE_ENTRY_D.ENTRY_NO
             AND sub.INVNO IS NOT NULL
       ))
GROUP BY 
    ZMM_GATE_ENTRY_D.ENTRY_NO, 
    ZMM_GATE_ENTRY_D.EBELN, 
    ZMM_GATE_ENTRY_H.ENTRY_DATE,
    ZMM_GATE_ENTRY_D.INVNO`;
  const result = await poolQuery({ client, query: gateEntryQuery, values: data });
  return result;
}

async function getGrn(client, data) {
  let grnQuery = `
      SELECT 
        "matDocNo" AS "matDocNo", 
        NULL AS "docNo", 
        NULL AS "btn", 
        NULL AS "issueNo", 
        NULL AS "issueYear", 
        NULL AS "reservationNumber", 
        NULL AS "reservationDate", 
        NULL AS "gateEntryNo", 
        NULL AS "updatedby", 
        'dateTime' AS "dateTime", 
        "purchasing_doc_no" AS purchasing_doc_no, 
        NULL AS "serviceEntryNumber", 
        'grn_report' AS "documentType" 
      FROM 
        (
          SELECT DISTINCT MBLNR as "matDocNo",
		EBELN as "purchasing_doc_no",
		budat_mkpf AS "dateTime" ,
       BWART,
       SMBLN
FROM MSEG AS m1
WHERE BWART IN ('101', '102')
  AND NOT EXISTS (
      SELECT 1
      FROM MSEG AS m2
      WHERE (m2.MBLNR = m1.SMBLN AND m1.BWART = '102')
         OR (m2.SMBLN = m1.MBLNR AND m2.BWART = '102')
  )
        ) AS mseg where 1 = 1 and purchising_doc_no = $1`;

  grnQuery = `
    SELECT MSEG.MBLNR AS "matDocNo",
    	MSEG.EBELN AS "purchasing_doc_no",
    	MSEG.BUDAT_MKPF AS "dateTime",
      MSEG.LGORT AS "storageLocation",
    	GE_D.INVNO  AS "invoice_no",
    	GE_D.INV_DATE AS "invoice_date",
    	GE_D.ENTRY_NO,
      'grn_report' AS "documentType"
    FROM MSEG AS MSEG
    LEFT JOIN ZMM_GATE_ENTRY_D AS GE_D 
    	ON(GE_D.EBELN = MSEG.EBELN	AND GE_D.EBELP = MSEG.EBELP	AND GE_D.ZMBLNR = MSEG.MBLNR)
    WHERE BWART IN ('101', '102')
    	AND MSEG.EBELN = $1
    GROUP BY(MSEG.MBLNR,
    		 MSEG.EBELN,
         MSEG.LGORT,
    		 GE_D.ENTRY_NO,
    		 GE_D.INV_DATE,
    		 GE_D.INVNO,
    		 MSEG.BUDAT_MKPF)`;
  const result = await poolQuery({ client, query: grnQuery, values: data });
  return result;
}

async function getICGrn(client, data) {
  let icgrnQuery = `
      SELECT 
        NULL AS "matDocNo", 
        "docNo" AS "docNo", 
        NULL AS "btn", 
        NULL AS "issueNo", 
        NULL AS "issueYear", 
        NULL AS "reservationNumber", 
        NULL AS "reservationDate", 
        NULL AS "gateEntryNo", 
        "updatedBy" AS "updatedBy", 
        "dateTime" AS "dateTime", 
        "purchasing_doc_no" AS "purchasing_doc_no", 
        NULL AS "serviceEntryNumber", 
        'icgrn_report' AS documentType 
      FROM 
        (
          SELECT 
            DISTINCT mblnr AS "docNo", 
            ersteldat AS "dateTime", 
            q.EBELN as "purchasing_doc_no", 
            'grse' AS "updatedBy" 
          FROM 
            qals AS q 
        ) AS qals where 1 =1 and purchising_doc_no = $1`;

  icgrnQuery = `
          SELECT 
          	QALS.MBLNR AS "docNo",
          	QALS.EBELN AS "purchasing_doc_no",
          	QALS.ERSTELDAT AS "dateTime",
			      QAVE.VDATUM as "udDateTime",
            MSEG.LGORT AS "storageLocation",
          	GE_D.INVNO  AS "invoice_no",
          	GE_D.INV_DATE AS "invoice_date",
          	GE_D.ENTRY_NO,
            'icgrn_report' AS "documentType"
          FROM QALS AS QALS
		  LEFT JOIN QAVE AS QAVE 
            ON(QAVE.PRUEFLOS = QALS.PRUEFLOS)
          LEFT JOIN ZMM_GATE_ENTRY_D AS GE_D 
          	ON(GE_D.EBELN = QALS.EBELN	AND GE_D.EBELP = QALS.EBELP	AND GE_D.ZMBLNR = QALS.MBLNR)
          LEFT JOIN MSEG AS MSEG 
            ON(MSEG.MBLNR = QALS.MBLNR)
          WHERE 1 = 1 AND QALS.EBELN = $1
          GROUP BY(QALS.MBLNR,
          		 QALS.EBELN,
		           QALS.ERSTELDAT,
          		 GE_D.ENTRY_NO,
          		 GE_D.INV_DATE,
          		 GE_D.INVNO,
               MSEG.LGORT,
				       QAVE.VDATUM)`;
  let result = await poolQuery({ client, query: icgrnQuery, values: data });
  result = result.map((el) => ({ ...el, lotNo: el.docNo }));
  return result;
}

//             GROUP BY
//               rk.rsnum,

//           GROUP BY
//             ms.mblnr,
//             ms.bwart,
//             budat_mkpf,
//             ms.mjahr,

async function getServiceEntry(client, data) {
  const serviceEntryQuery = `
          SELECT 
            essr.lblni as "serviceEntryNumber", 
            essr.ebeln as "purchising_doc_no", 
            essr.erdat as "dateTime",
            '' as "storageLocation",
            'service_entry_report' AS "documentType" 
          FROM 
            essr as essr where 1 = 1 AND ebeln = $1`;

  const result = await poolQuery({ client, query: serviceEntryQuery, values: data });
  return result;
}

const gateEngryHeaderTableDataInsert = async (req, res) => {
  let client;

  try {
    const { body: payload } = req;

    if (!Array.isArray(payload) || payload.length === 0) {
      return responseSend(res, "F", 400, Message.MANDATORY_PARAMETR, Message.INVALID_PAYLOAD, null);
    }

    // Process payloads concurrently
    const payloadArr = await Promise.all(payload.map(gateEntryHeaderPayload));

    client = await poolClient();

    const { q, val } = await generateQueryForMultipleData(payloadArr, GATE_ENTRY_HEADER, ["ENTRY_NO", "W_YEAR"]);

    const result = await poolQuery({ client, query: q, values: val });

    return responseSend(res, "S", 200, Message.DATA_SEND_SUCCESSFULL, result, null);
  } catch (err) {
    console.error("[ERROR] gateEngryHeaderTableDataInsert:", err);

    return responseSend(res, "F", 500, Message.SERVER_ERROR, err.message, null);
  } finally {
    if (client) client?.release();
  }
};

const gateEngryDataTableDataInsert = async (req, res) => {
  let client;

  try {
    const { body: payload } = req;

    if (!Array.isArray(payload) || payload.length === 0) {
      return responseSend(res, "F", 400, Message.INVALID_PAYLOAD, Message.INVALID_PAYLOAD, null);
    }

    const payloadArr = await gateEntryDataPayload(payload);

    client = await poolClient();

    const insertQuery = await generateQueryForMultipleData(payloadArr, GATE_ENTRY_DATA, ["ENTRY_NO", "EBELN", "EBELP", "W_YEAR"]);

    const result = await poolQuery({
      client,
      query: insertQuery.q,
      values: insertQuery.val,
    });

    return responseSend(res, "S", 200, Message.DATA_SEND_SUCCESSFULL, result, null);
  } catch (err) {
    console.error("[ERROR] gateEngryDataTableDataInsert:", err);

    return responseSend(res, "F", 500, Message.SERVER_ERROR, err.message, null);
  } finally {
    if (client) client?.release();
  }
};

// SELECT MBLNR,
//        BWART,
//        SMBLN
// FROM MSEG AS m1
// WHERE BWART IN ('101', '102')
//       SELECT 1
//       FROM MSEG AS m2
//       WHERE (m2.MBLNR = m1.SMBLN AND m1.BWART = '102')
//          OR (m2.SMBLN = m1.MBLNR AND m2.BWART = '102')

module.exports = { insertGateEntryData, storeActionList, gateEntryReport, gateEngryDataTableDataInsert, gateEngryHeaderTableDataInsert };
//     EBELN: "7777777777",
//     BUKRS: "5788",
//     BSTYP: "S",
//     BSART: "ABCD",
//     LOEKZ: "W",
//     AEDAT: "2023-11-07",
//     ERNAM: "34567656787",
//     LIFNR: "1234567890",
//     EKORG: "1234",
//     EKGRP: "123",
//         EBELN: "7777777777",
//         EBELP: 10023,
//         LOEKZ: "W",
//         STATU: "1",
//         AEDAT: "07.03.2014",
//         TXZ01: "IncomeTax Rectification in SAP Payroll",
//         MATNR: "",
//         BUKRS: "HSL",
//         WERKS: "100",
//         LGORT: "",
//         MATKL: "SE57",
//         KTMNG: 1244,
//         MENGE: 232131,
//         MEINS: "AU",
//         NETPR: "0",
//         NETWR: "0",
//         MWSKZ: "TV",
//         EBELN: "7777777777",
//         EBELP: 88,
//         LOEKZ: "W",
//         STATU: "1",
//         AEDAT: "20.06.2019",
//         TXZ01: "6. Warranty Support",
//         MATNR: "",
//         BUKRS: "HSL",
//         WERKS: "100",
//         LGORT: "",
//         MATKL: "SE74",
//         KTMNG: "0",
//         MENGE: "1",
//         MEINS: "AU",
//         NETPR: "9000,3222",
//         NETWR: "124,456,900",
//         MWSKZ: "SG",
//       { EBELN: "7777777777", MID: "M-1", MTEXT: "IM IN - 1", PLAN_DATE: "2023-11-02", MO: "M" },
//       { EBELN: "7777777777", MID: "M-2", MTEXT: "IM IN - 2", PLAN_DATE: "2023-11-03", MO: "O" },
