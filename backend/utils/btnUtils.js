
const { getQuery, poolQuery } = require("../config/pgDbConfig");
const { ACTION_SDBG, ACTION_PBG, UPDATE } = require("../lib/constant");
const { APPROVED } = require("../lib/status");
const { BTN_MATERIAL_DO, GATE_ENTRY_DATA } = require("../lib/tableName");
const { generateQuery } = require("../lib/utils");

//-----------------------------------------------------------------------------------//
exports.getSDBGApprovedFiles = async (po) => {
  // GET Approved SDBG by PO Number
  let q = `SELECT file_name, file_path FROM sdbg WHERE purchasing_doc_no = $1 and status = $2 and action_type = $3`;
  let result = await getQuery({
    query: q,
    values: [po, APPROVED, ACTION_SDBG],
  });
  return result;
};

exports.getPBGApprovedFiles = async (po) => {
  // GET Approved PBG by PO Number
    let q = `SELECT * FROM public.sdbg WHERE purchasing_doc_no = $1 and status = $2 and action_type = $3`;
    let result = await getQuery({
      query: q,
      values: [po, APPROVED, ACTION_PBG],
    });
    return result;

};
exports.getSDFiles = async (po, action_type) => {
  let q = `SELECT file_name, file_path FROM sdbg WHERE purchasing_doc_no = $1 and action_type = $2`;
  let result = await getQuery({
    query: q,
    values: [po, action_type],
  });
  return result;
};

/**
 * UPDATE INVOICE DATE IN GATE ENTRY DATA TABLE
 * WHEN INVOICE DATE IS MISSING IN GATE_ENTRY_D TABLE TABLE
 * COND ENTRY_NO, INVNO, EBELN 
 * @param {*} client 
 * @param { Object} data 
 * @param {Object} condData 
 * @returns Error || Query execute acknowledge
 */
exports.updateInvoiceDate = async (client, data, condData) => {
    let result;
    const condObj = {
      ENTRY_NO: condData?.gate_entry_no,
      INVNO: condData?.invoice_no,
      EBELN: condData?.purchasing_doc_no,
    }
    const { q, val } = generateQuery(UPDATE, GATE_ENTRY_DATA, data, condObj);

    let mod_q = q + " AND INV_DATE IS NULL"
    if (!client) {
      result = await getQuery({ query: mod_q, values: val })
    } else {
      result = await poolQuery({ client, query: mod_q, values: val })
    }
    return result;
}

exports.checkBTNRegistered = async (btn_num, po) => {
  let q = `SELECT count(btn_num) as count FROM ${BTN_MATERIAL_DO} WHERE btn_num = $1 and purchasing_doc_no = $2`;
  let result = await getQuery({
    query: q,
    values: [btn_num, po],
  });
  if (parseInt(result[0].count) > 0) {
    return true;
  }
  return false;
};

exports.fetchBTNListByPOAndBTNNum = async (btn, po) => {
  if (!po || !btn) {
    return { status: false, data: null, message: "PO or BTN is missing, please refresh and retry!", };
  }
  let btn_list_q = `SELECT * FROM btn_list WHERE purchasing_doc_no = $1 and btn_num = $2`;
  let btn_list = await getQuery({
    query: btn_list_q,
    values: [po, btn],
  });
  if (btn_list.length > 0) {
    return { status: true, data: btn_list[0], message: "BTN LIST Fetched!", };
  } else {
    return { status: false, data: null, message: "Vendor have to create BTN First." };
  }
};

/**
 * GET VENDOR DETAILS
 * @param {Object} client
 * @param {Object} data
 * @returns {Promise<Object>}
 * @throws {Error} If the query execution fails, an error is thrown.
 */
exports.getVendorDetails = async (client, ebeln) => {

    let q = `SELECT po.lifnr       AS vendor_code,
                     vendor_t.name1 AS vendor_name,
                     vendor_t.email AS vendor_email,
                     vendor_t.stcd3 AS vendor_gstno
              FROM   ekko AS po
                     left join lfa1 AS vendor_t
                            ON ( po.lifnr = vendor_t.lifnr )
              WHERE  po.ebeln = $1`;
    let result = await poolQuery({ client, query: q, values: ebeln });
    return result;
};
/**
 * GET VENDOR DETAILS
 * @param {Object} client
 * @param {Object} data
 * @returns {Promise<Object>}
 * @throws {Error} If the query execution fails, an error is thrown.
 */
exports.getDoDetailsByPO = async (client, ebeln) => {
  let q = `SELECT    
                po.ernam           AS u_id,
                user_t.cname       AS u_name,
                user_t.email       AS u_email,
                'do'               AS u_type
                  FROM      ekko     AS po
                    LEFT JOIN pa0002 AS user_t
                      ON( po.ernam = user_t.pernr :: CHARACTER varying) where po.ebeln = $1 LIMIT 1`;
  let result = await poolQuery({ client, query: q, values: [ebeln] });
  return result[0] || {};
};

exports.calculateTotals = (data) => {

  let totalQuantity = 0;
  let totalPrice = 0;

  data.forEach((item) => {
    const quantity = item.quantity;
    const price = item.price;
    if (quantity && !isNaN(quantity)) {
      totalQuantity += parseFloat(quantity);
    }
    if (price && !isNaN(price) && quantity && !isNaN(quantity)) {
      totalPrice += parseFloat(price) * parseFloat(quantity);
    }
  });
  return {
    totalQuantity,
    totalPrice,
  };
}

/**
 * calculation grn qty, value and more
 * @param {*} data 
 * @returns 
 */
exports.calculateTotalGrnValue = (data) => {
  let totalQuantity = 0;
  let totalPrice = 0;
  let totalUnitPrice = 0;
  let totalReturnUnitPrice = 0;
  let totalReturnQuantity = 0;
  let totalReturnPrice = 0;
  
  data.forEach(item => {
    const quantity = parseFloat(item.quantity);
    const price = parseFloat(item.price);
    const returnQuantity = parseFloat(item.return_quantity);
    const unitPrice = parseFloat(item.unit_price);
 
    if (!isNaN(quantity)) {
      totalQuantity += quantity;
    }

    if (!isNaN(price)) {
      totalPrice += price;
    }

    if (!isNaN(quantity) && !isNaN(unitPrice)) {
      totalUnitPrice += quantity * unitPrice;
    }

    if (!isNaN(returnQuantity) && !isNaN(unitPrice)) {
      totalReturnQuantity += returnQuantity;
      totalReturnPrice += returnQuantity * unitPrice;
      totalReturnUnitPrice += returnQuantity * unitPrice;
    }
  });

  return {
    totalQuantity,
    totalPrice,
    totalUnitPrice,
    totalReturnQuantity,
    totalReturnPrice,
    totalReturnUnitPrice
  };
}
