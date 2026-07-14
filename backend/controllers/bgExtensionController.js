const { poolClient, poolQuery } = require("../config/pgDbConfig");
const { resSend } = require("../lib/resSend");
const Message = require("../utils/messages");
const bgExtensionServices = require("../services/bgExtension.services");


async function getBgExtensionList(req, res) {
    let client;
    try {
        client = await poolClient();
        let bgData = {}
        // bgData = await bgExtensionServices.getBgExtensionList(client, queryParams, tokenData);

        bgData.result = await poolQuery({ client, query: "select * from  sdbg_extension", values: [] });

        resSend(res, true, 200, Message.DATA_FETCH_SUCCESSFULL, bgData.result, "");
    } catch (error) {
        console.error("getBgExtensionList error", error.message, error);
        resSend(res, false, 500, Message.SOMTHING_WENT_WRONG, error);
    } finally {
        if (client) client.release();
    }

}
async function getBgExtensionDetails(req, res) {
    let client;
    try {
        client = await poolClient();
        const queryParams = req.params;

        // const bgData = await bgExtensionServices.getBgExtensionList(client, queryParams, tokenData);
        let bgData = {};
        bgData.result = await poolQuery({ client, query: "select * from  sdbg_extension where file_no = $1", values: [queryParams.file_no] });


        resSend(res, true, 200, Message.DATA_FETCH_SUCCESSFULL, bgData.result, "");
    } catch (error) {
        console.error("getBgExtensionDetails error", error.message, error);
        resSend(res, false, 500, Message.SOMTHING_WENT_WRONG, error);
    } finally {
        if (client) client.release();
    }

}

async function submitBgExtension(req, res) {

    let client;
    try {
        client = await poolClient();
        const tokenData = req.tokenData;
        const resp3 = await bgExtensionServices.saveBgExtension(client, tokenData, req.body);
        if (!resp3.success) {
            return resSend(res, false, resp3.statusCode, resp3.message, resp3.error);
        }
        resSend(res, true, 200, Message.DATA_FETCH_SUCCESSFULL, {});
    } catch (error) {
        console.error("submitBgExtension error", error.message, error);
        resSend(res, false, 500, Message.SOMTHING_WENT_WRONG, error);
    } finally {
        if (client) client.release();
    }

}
async function submitBgExtensionByDo(req, res) {

    let client;
    try {
        client = await poolClient();
        const tokenData = req.tokenData;
        const resp1 = await bgExtensionServices.updateBgExtensionByDo(client, tokenData, req.body);
        if (!resp1.success) {
            return resSend(res, false, resp1.statusCode, resp1.message, resp1.error);
        }
        resSend(res, true, 200, Message.DATA_FETCH_SUCCESSFULL, resp1, "", resp1);
    } catch (error) {
        console.error("submitBgExtensionByDo error", error.message, error);
        resSend(res, false, 500, Message.SOMTHING_WENT_WRONG, error);
    } finally {
        if (client) client.release();
    }

}
async function submitBgExtensionByFinance(req, res) {

    let client;
    try {
        client = await poolClient();
        const tokenData = req.tokenData;
        const resp2 = await bgExtensionServices.updateBgExtensionByFi(client, tokenData, req.body);
        if (!resp2.success) {
            return resSend(res, false, resp2.statusCode, resp2.message, resp2.error);
        }
        resSend(res, true, 200, Message.DATA_FETCH_SUCCESSFULL, resp2, "", resp2);
    } catch (error) {
        console.error("submitBgExtensionByFinance error", error.message, error);
        resSend(res, false, 500, Message.SOMTHING_WENT_WRONG, error);
    } finally {
        if (client) client.release();
    }

}

async function submitBgExtensionRecomendationByDo(req, res) {

    let client;
    try {
        client = await poolClient();
        const tokenData = req.tokenData;
        const resp1 = await bgExtensionServices.submitBgExtensionRecomendationByDo(client, tokenData, req.body);
        if (!resp1.success) {
            return resSend(res, false, resp1.statusCode, resp1.message, resp1.error);
        }
        resSend(res, true, 200, Message.DATA_FETCH_SUCCESSFULL, resp1, "", resp1);
    } catch (error) {
        console.error("submitBgExtensionRecomendationByDo error", error.message, error);
        resSend(res, false, 500, Message.SOMTHING_WENT_WRONG, error);
    } finally {
        if (client) client.release();
    }

}
async function submitBgExtensionRecomendationByFi(req, res) {

    let client;
    try {
        client = await poolClient();
        const tokenData = req.tokenData;
        const resp1 = await bgExtensionServices.submitBgExtensionRecomendationByFi(client, tokenData, req.body);
        if (!resp1.success) {
            return resSend(res, false, resp1.statusCode, resp1.message, resp1.error);
        }
        resSend(res, true, 200, Message.DATA_FETCH_SUCCESSFULL, resp1, "", resp1);
    } catch (error) {
        console.error("submitBgExtensionRecomendationByFi error", error.message, error);
        resSend(res, false, 500, Message.SOMTHING_WENT_WRONG, error);
    } finally {
        if (client) client.release();
    }

}

module.exports = {
    getBgExtensionList,
    submitBgExtension,
    submitBgExtensionByDo,
    submitBgExtensionByFinance,
    getBgExtensionDetails,
    submitBgExtensionRecomendationByDo,
    submitBgExtensionRecomendationByFi
}
