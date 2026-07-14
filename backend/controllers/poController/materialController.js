const { resSend } = require("../../lib/resSend");
const { getQuery } = require("../../config/pgDbConfig");
const Message= require("../../utils/messages");


/** APIS START ----->  */

const materialIssue = async (req, res) => {
  try {

    let q = `SELECT 
                    mseg.MBLNR as "issueNo",
                    mseg.WERKS as "plantName",
                    mseg.MJAHR as "issueYear",
                    mseg.MATNR as "materialNumber",
                    makt.MAKTX as "materialDescription",
                    mseg.MEINS as "unit",
                    mseg.CHARG as "batchNo",
                    mseg.ERFMG as "issueQty",
                    mseg.BPMNG as "BPMNG",
                    mkpf.BUDAT as "issuDate",
                    mseg.EBELN as "purchasing_doc_no",
                    mseg.EBELP as "poItemNumber",
                    mseg.RSNUM as "reservationNo",
                    mseg.LIFNR as "vendor_code",
                    mseg.MENGE as "requiredQty",
                    mseg.KOSTL as "costCenter"
                FROM mseg AS mseg
                	LEFT JOIN mkpf AS mkpf
                    	ON( mseg.MBLNR = mkpf.MBLNR)
                     LEFT JOIN makt AS makt
                    	ON( mseg.MATNR = makt.MATNR) 
                        WHERE 1 = 1 AND  ( mseg.BWART IN ('221', '281', '201', '101', '321', '222', '202', '102', '122') )`;

    if (!req.body.issueNo) {
      return resSend(res, false, 200, "plese send Issue No", [], null);
    }
    let val = [];
    let count = 0;

    if (req.body.issueNo) {
      ++count;
      q = q.concat(` AND mseg.MBLNR =  $${count}`);
      val.push(req.body.issueNo);
    }
    if (req.body.issueYear) {
      ++count;
      q = q.concat(` AND mseg.MJAHR = $${count} `);
      val.push(req.body.issueYear);
    }

    const result = await getQuery({ query: q, values: val });

    let response = {
      issueNo: null,
      issuDate: null,
      plantName: null,
      reservationNo: null,
      lineItem: result,
    };

    // {
    //     issueNo: '1000001014',
    //     materialNumber: null,
    //     materialDescription: null,
    //     unit: null,
    //     batchNo: null,
    //     issueQty: null,
    //     BPMNG: null,
    //     issuDate: null,
    //     purchasing_doc_no: null,
    //     poItemNumber: null,
    //     reserationNo: null,
    //     vendor_code: '50000437',
    //     requiredQty: null
    //   }

    if (result.length > 0) {
      response.issueNo = result[0]?.issueNo;
      response.issuDate = result[0]?.issuDate || null;
      response.plantName = result[0]?.plantName;
      response.reservationNo = result[0]?.reservationNo || null;

      resSend(res, true, 200, "Data fetched successfully", response, null);
    } else {
      resSend(res, false, 200, "No Record Found", response, null);
    }
  } catch (error) {
    console.error("[error]", error);
    return resSend(res, false, 500, Message.SOMTHING_WENT_WRONG, null);
  }
};

module.exports = { materialIssue };
