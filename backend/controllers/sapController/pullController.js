const { connectToSapServer } = require("../../config/sapServerConfig");
const { resSend } = require("../../lib/resSend");
const Message = require("../../utils/messages");

const pullPo = async (req, res) => {
    try {
        const sapEndPoint = "/sap/bc/zobps_po_data?sap-client=100";
        const { docNo } = req.body;
        const response = await connectToSapServer(sapEndPoint, { EBELN: docNo }, "POST");

        if (response.statusCode && response.statusCode >= 200 && response.statusCode <= 226) {
            resSend(res, true, 200, Message.FILE_UPLOAD_SUCCESSFULLY, response);
        } else {
            resSend(res, false, 200, `${response}`, response);
        }
    } catch (error) {
        console.error("pull po", error, error.message);
        resSend(res, false, 500, Message.SOMTHING_WENT_WRONG)
    }
}

const pullStoreAction = async (req, res) => {
    try {
        const sapEndPoint = "/sap/bc/zgrn_icgrn_api?sap-client=100";
        const { poNo, grnNo, startDate, endDate } = req.query;
        const searchByObj = {};
        if (poNo) {
            searchByObj["EBELN"] = poNo;
        }
        if (grnNo) {
            searchByObj["MBLNR"] = grnNo;
        }
        if (startDate) {
            searchByObj["START_DATE"] = startDate;
        }
        if (endDate) {
            searchByObj["END_DATE"] = startDate;
        }

        if(!poNo) {
            return resSend(res, true, 200, Message.MANDATORY_INPUTS_REQUIRED, { poNo, grnNo });
        }

        const response = await connectToSapServer(sapEndPoint, searchByObj, "POST");

        if (response.statusCode && response.statusCode >= 200 && response.statusCode <= 226) {
            resSend(res, true, 200, Message.FILE_UPLOAD_SUCCESSFULLY, response);
        } else {
            resSend(res, false, 200, `${response}`, response);
        }
    } catch (error) {
        console.error("pull po", error, error.message);
        resSend(res, false, 500, Message.SOMTHING_WENT_WRONG)
    }
}


module.exports = { pullPo, pullStoreAction };
