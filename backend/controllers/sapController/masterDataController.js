
const { VENDOR_MASTER_LFA1, EMPLAYEE_MASTER_PA0002 } = require('../../lib/tableName');
const { responseSend } = require("../../lib/resSend");
const { generateQueryForMultipleData } = require("../../lib/utils");
const { lfa1Payload, addUserPayload } = require('../../services/sap.masterData.services');
const { query } = require('../../config/pgDbConfig');
const Message = require('../../utils/messages');

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
        } else if (payload && typeof req.body === 'object') {
            payload.push(req.body);
        }

        if (!payload || !Array.isArray(payload)) {
            return responseSend(res, "F", 400, Message.INVALID_PAYLOAD, null, null);
        }

        try {
            const payloadObj = await lfa1Payload(payload);
            const multipleUserInsertQ = await generateQueryForMultipleData(payloadObj, VENDOR_MASTER_LFA1, ["LIFNR"]);
            const response = await query({ query: multipleUserInsertQ.q, values: multipleUserInsertQ.val });
            responseSend(res, "S", 200, Message.DATA_SEND_SUCCESSFULL, response, null);

        } catch (error) {

            responseSend(res, "F", 400, Message.DATA_INSERT_FAILED, error.toString(), null);
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
        } else if (payload && typeof req.body === 'object') {
            payload.push(req.body);
        }

        if (!payload || !Array.isArray(payload)) {
            return responseSend(res, "F", 400, Message.INVALID_PAYLOAD, null, null);
        }

        try {
            const payloadObj = await addUserPayload(payload);
            const multipleUserInsertQ = await generateQueryForMultipleData(payloadObj, EMPLAYEE_MASTER_PA0002, ["PERNR"]);
            let response = await query({ query: multipleUserInsertQ.q, values: multipleUserInsertQ.val });
            responseSend(res, "S", 200, Message.DATA_SEND_SUCCESSFULL, response, null);
        } catch (error) {
            responseSend(res, "F", 400, Message.DATA_INSERT_FAILED, error.message, null);
        }

    } catch (error) {
        responseSend(res, "F", 500, Message.UNEXPECTED_ERROR, error, null);
    }
};

module.exports = { lfa1, addUser }