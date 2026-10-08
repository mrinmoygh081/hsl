const {  TRUE } = require("../lib/constant");
const { responseSend } = require("../lib/resSend");
const { EKKO } = require("../lib/tableName");
const { formatDate, generateInsertUpdateQuery, generateQueryForMultipleData } = require("../lib/utils");
const {  PO_UPLOAD_IN_LAN } = require("../lib/event");
const {
  ekpoTablePayload,
  zpo_milestonePayload,
  archivePoHeaderPayload,
  archivePoLineItemsPayload,
} = require("../services/sap.po.services");
const { poolClient, getQuery } = require("../config/pgDbConfig");
const { getUserDetailsQuery } = require("../utils/mailFunc");
const { sendMail } = require("../services/mail.services");

const insertPOData = async (req, res) => {
  console.log("PO API CALL");
  let insertPayload = {};
  let payload = {};

  try {
    const client = await poolClient();
    let transactionSuccessful = false;
    if (Array.isArray(req.body)) {
      payload = req.body.length > 0 ? req.body[0] : null;
    } else if (typeof req.body === "object" && req.body !== null) {
      payload = req.body;
    }

    const { EKPO, ZPO_MILESTONE, ...obj } = payload;

    try {
      if (
        !obj ||
        typeof obj !== "object" ||
        !Object.keys(obj).length ||
        !obj.EBELN
      ) {
        return responseSend(res, "F", 400, "INVALID PAYLOAD", null, null);
      }

      await client.query("BEGIN");

      insertPayload = {
        EBELN: obj.EBELN,
        BUKRS: obj.BUKRS ? obj.BUKRS : null,
        BSTYP: obj.BSTYP ? obj.BSTYP : null,
        BSART: obj.BSART ? obj.BSART : null,
        LOEKZ: obj.LOEKZ ? obj.LOEKZ : null,
        // AEDAT: formatDate(obj.AEDAT),
        AEDAT: obj.AEDAT,
        ERNAM: obj.ERNAM ? obj.ERNAM : null,
        LIFNR: obj.LIFNR ? obj.LIFNR : null,
        EKORG: obj.EKORG ? obj.EKORG : null,
        EKGRP: obj.EKGRP ? obj.EKGRP : null,
      };
      const ekkoTableInsert = await generateInsertUpdateQuery(
        insertPayload,
        EKKO,
        ["EBELN"],
      );
      try {
        await client.query(ekkoTableInsert.q, ekkoTableInsert.val);
      } catch (error) {
        return responseSend(res, "F", 502, error.message, error.stack, null);
      }

      try {
        const delete_from_zpo_milestoen = `DELETE FROM zpo_milestone  WHERE  ebeln = $1`;
        await client.query(delete_from_zpo_milestoen, [obj.EBELN]);
      } catch (error) {
        console.error(error.message);
      }

      const insertPromiseFn = [];

      if (ZPO_MILESTONE?.length) {
        try {
          const zmilestonePayload = await zpo_milestonePayload(ZPO_MILESTONE);
          const insert_zpo_milestone_table = await generateQueryForMultipleData(
            zmilestonePayload,
            "zpo_milestone",
            ["EBELN", "MID"],
          );
          insertPromiseFn.push(
            client.query(
              insert_zpo_milestone_table.q,
              insert_zpo_milestone_table.val,
            ),
          );
        } catch (error) {
          console.error(error.message);
        }
      }

      if (EKPO?.length) {
        try {
          const ekpopayload = await ekpoTablePayload(EKPO, obj.EBELN);
          const insert_ekpo_table = await generateQueryForMultipleData(
            ekpopayload,
            "ekpo",
            ["EBELN", "EBELP"],
          );
          insertPromiseFn.push(
            client.query(insert_ekpo_table.q, insert_ekpo_table.val),
          );
        } catch (error) {
          console.error(error.message);
        }
      }
      if (insertPromiseFn.length) {
        await Promise.all(insertPromiseFn);
      }

      await client.query("COMMIT");

      transactionSuccessful = true;

      if (insertPayload.LIFNR && transactionSuccessful === TRUE) {
        try {
          handelMail(insertPayload);
          responseSend(
            res,
            "S",
            200,
            "data insert succeed with mail trigere",
            [],
            null,
          );
        } catch (error) {
          responseSend(
            res,
            "F",
            201,
            "Data insert but mail not send !!",
            error.toString(),
            null,
          );
        }
      } else {
        responseSend(
          res,
          "S",
          200,
          "data insert succeed without mail.",
          [],
          null,
        );
      }
    } catch (error) {
      console.log("error", error.message, error.stack);

      responseSend(res, "F", 502, "Data insert failed !!", error.message, null);
    } finally {
      if (!transactionSuccessful) {
        await client.query("ROLLBACK");
      }
      client.release();
    }
  } catch (error) {
    console.error("po api error", error);
    responseSend(res, "F", 400, "Error in database conn!!", error, null);
  }
};

async function handelMail(data) {
  try {
    let vendorAndDoDetails = getUserDetailsQuery("vendor_and_do", "$1");
    const mail_details = await getQuery({
      query: vendorAndDoDetails,
      values: [data.EBELN],
    });
    const dataObj = {
      ...data,
      purchasing_doc_no: data.EBELN,
      vendor_name: mail_details[0]?.u_name,
      do_name: mail_details[1]?.u_name,
      upload_date: new Date().toDateString(),
    };
    await sendMail(
      PO_UPLOAD_IN_LAN,
      dataObj,
      { users: mail_details },
      PO_UPLOAD_IN_LAN,
    );
  } catch (error) {
    console.error(error.message);
  }
}

const archivePo = async (req, res) => {
  let insertPayload = {};
  let payload = {};

  try {
    const client = await poolClient();
    let transactionSuccessful = false;
    if (Array.isArray(req.body)) {
      payload = req.body.length > 0 ? req.body[0] : null;
    } else if (typeof req.body === "object" && req.body !== null) {
      payload = req.body;
    }

    const cdhdr_table_data = payload.CDHDR_HEADER || payload.cdhdr_header;
    const cdpos_table_data = payload.CDPOS_LINE_ITEM || payload.cdpos_line_item;

    try {
      await client.query("BEGIN");

      if (cdhdr_table_data?.length) {
        try {
          insertPayload = await archivePoHeaderPayload(cdhdr_table_data);

          const cdhdrTableInsert = await generateQueryForMultipleData(
            insertPayload,
            "cdhdr",
            ["OBJECTCLAS", "OBJECTID", "CHANGENR"],
          );
          await client.query(cdhdrTableInsert.q, cdhdrTableInsert.val);
        } catch (error) {
          console.error(error.message);
          return responseSend(
            res,
            false,
            502,
            "Data insert failed !!",
            error,
            null,
          );
        }
      }

      if (cdpos_table_data?.length) {
        try {
          const cdposTablePayload =
            await archivePoLineItemsPayload(cdpos_table_data);
          const insert_cdpos_table = await generateQueryForMultipleData(
            cdposTablePayload,
            "cdpos",
            [
              "OBJECTCLAS",
              "OBJECTID",
              "CHANGENR",
              "TABNAME",
              "TABKEY",
              "FNAME",
              "CHNGIND",
            ],
          );
          // CONSTRAINT cdpos_pkey PRIMARY KEY (objectclas, objectid, changenr, tabname, tabkey, fname, chngind)
          await client.query(insert_cdpos_table.q, insert_cdpos_table.val);
        } catch (error) {
          console.error(error.message);
        }
      }

      await client.query("COMMIT");
      transactionSuccessful = true;
      if (transactionSuccessful === TRUE) {
        responseSend(
          res,
          "S",
          200,
          "data insert succeed with mail trigere",
          [],
          null,
        );
      }
    } catch (error) {
      responseSend(res, "F", 502, "Data insert failed !!", error, null);
    } finally {
      if (!transactionSuccessful) {
        await client.query("ROLLBACK");
      }
      client.release();
    }
  } catch (error) {
    responseSend(res, "F", 400, "Error in database conn!!", error, null);
  }
};

module.exports = { insertPOData, archivePo };
