const {
  VENDOR_MASTER_LFA1,
  EMPLAYEE_MASTER_PA0002,
  MARA,
} = require("../../lib/tableName");
const { responseSend } = require("../../lib/resSend");
const { generateQueryForMultipleData } = require("../../lib/utils");
const {
  lfa1Payload,
  addUserPayload,
  addMaterialMasterPayload,
} = require("../../services/sap.masterData.services");
const { query } = require("../../config/pgDbConfig");
const Message = require("../../utils/messages");

// Material Master
const mara = async (req, res) => {
  let payload = [];
  if (req.body && Array.isArray(req.body)) {
    payload = req.body;
  } else if (payload && typeof req.body === "object") {
    payload.push(req.body);
  }

  if (!payload || !Array.isArray(payload)) {
    return responseSend(res, "F", 400, Message.INVALID_PAYLOAD, null, null);
  }

  try {
    try {
      const payloadObj = await addMaterialMasterPayload(payload);
      const multipleDataInsertQ = await generateQueryForMultipleData(
        payloadObj,
        MARA,
        ["MATNR"],
      );

      console.log("Generated Query:", multipleDataInsertQ.q);
      console.log("Query Values:", multipleDataInsertQ.val);

      const response = await query({
        query: multipleDataInsertQ.q,
        values: multipleDataInsertQ.val,
      });

      console.log("Database Response:", response);
      const insertedData = response.rows;
      responseSend(
        res,
        "S",
        200,
        Message.COMPLIANCE_INSERT_MSG,
        insertedData,
        null,
      );
    } catch (error) {
      responseSend(
        res,
        "F",
        400,
        Message.DATA_INSERT_FAILED,
        error.message,
        null,
      );
    }
  } catch (error) {
    responseSend(res, "F", 500, Message.UNEXPECTED_ERROR, error, null);
  }
};

const lfa1 = async (req, res) => {
  try {
    /**
     * PAYLOAD MODIFICATION
     * IF PAYLOADA IS A OBJECT THEN PUSH IN TO A ARRAY
     * ELSE PAYLOAD = req.body
     * THIS MODIFICATION IS DONE FOR SEND MULTIPLE DATA INSERT AND INSERT / UPDATE QUERY
     */
    let payload = [];
    if (req.body && Array.isArray(req.body)) {
      payload = req.body;
    } else if (payload && typeof req.body === "object") {
      payload.push(req.body);
    }

    if (!payload || !Array.isArray(payload)) {
      return responseSend(res, "F", 400, Message.INVALID_PAYLOAD, null, null);
    }

    try {
      const payloadObj = await lfa1Payload(payload);
      const multipleUserInsertQ = await generateQueryForMultipleData(
        payloadObj,
        VENDOR_MASTER_LFA1,
        ["LIFNR"],
      );
      const response = await query({
        query: multipleUserInsertQ.q,
        values: multipleUserInsertQ.val,
      });
      responseSend(
        res,
        "S",
        200,
        Message.DATA_SEND_SUCCESSFULL,
        response.rows,
        null,
      );
    } catch (error) {
      responseSend(
        res,
        "F",
        400,
        Message.DATA_INSERT_FAILED,
        error.toString(),
        null,
      );
    }
  } catch (error) {
    responseSend(res, "F", 500, Message.SERVER_ERROR, error, null);
  }
};

const addUser = async (req, res) => {
  try {
    /**
     * PAYLOAD MODIFICATION
     * IF PAYLOADA IS A OBJECT THEN PUSH IN TO A ARRAY
     * ELSE PAYLOAD = req.body
     * THIS MODIFICATION IS DONE FOR SEND MULTIPLE DATA INSERT AND INSERT / UPDATE QUERY
     */
    let payload = [];
    if (req.body && Array.isArray(req.body)) {
      payload = req.body;
    } else if (payload && typeof req.body === "object") {
      payload.push(req.body);
    }

    if (!payload || !Array.isArray(payload)) {
      return responseSend(res, "F", 400, Message.INVALID_PAYLOAD, null, null);
    }

    try {
      const payloadObj = await addUserPayload(payload);
      const multipleUserInsertQ = await generateQueryForMultipleData(
        payloadObj,
        EMPLAYEE_MASTER_PA0002,
        ["PERNR"],
      );
      let response = await query({
        query: multipleUserInsertQ.q,
        values: multipleUserInsertQ.val,
      });
      responseSend(
        res,
        "S",
        200,
        Message.DATA_SEND_SUCCESSFULL,
        response,
        null,
      );
    } catch (error) {
      responseSend(
        res,
        "F",
        400,
        Message.DATA_INSERT_FAILED,
        error.message,
        null,
      );
    }
  } catch (error) {
    responseSend(res, "F", 500, Message.UNEXPECTED_ERROR, error, null);
  }
};

module.exports = { mara, lfa1, addUser };
