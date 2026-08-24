/* eslint-disable no-useless-catch */
const { poolQuery } = require("../config/pgDbConfig");
const { USER_TYPE_HSL_HR, ASSIGNER, USER_TYPE_VENDOR, STAFF, TYPE_RC, TYPE_PO } = require("../lib/constant");
const { SUBMITTED, APPROVED, REJECTED, STATUS_RECOMMEND, NOT_RECOMMEND, STATUS_HOLD_BY_HR, STATUS_HOLD_BY_HR_RECIPIENT } = require("../lib/status");
const { getEpochTime, generateSimpleSingleGetQuery } = require("../lib/utils");
// const complianceLists = ["PF", "ESI", "WAGES", "LEAVE_SALARY", "BONUS", "OTHERS"];
const Message = require("../utils/messages");
// const localData = require("../utils/localData.json");
// const { create_reference_no } = require("./po.services");
const {
  HR_COMPLIANCE,
  HR_COMPLIANCE_DATA,
  VENDOR_MASTER_LFA1,
} = require("../lib/tableName");

function createRefGroup(hrPayload) {
  return `${hrPayload?.rc_no}${hrPayload?.purchasing_doc_no}${hrPayload?.unit}`;
}

const paylaodValidation = (payloadArr) => {
  if (!Array.isArray(payloadArr) || !payloadArr?.length) return false;
  for (const pl of payloadArr) {
    if (!pl.compliance_month || !pl.compliance_year) {
      return false;
    }
    if (pl.type === TYPE_RC && !pl.rc_no) {
      return false;
    }
    if (pl.type === TYPE_PO && !pl.purchasing_doc_no) {
      return false;
    }
  }
  return true;
};
const paylaodValidationForHrRecepent = (payloadArr) => {
  if (!Array.isArray(payloadArr) || !payloadArr?.length) return false;
  for (const pl of payloadArr) {
    if (!pl.compliance_group_id || !pl.status) {
      return false;
    }
  }
  return true;
};
const paylaodValidationForHr = (payloadArr) => {
  if (!Array.isArray(payloadArr) || !payloadArr?.length) return false;
  for (const pl of payloadArr) {
    if (!pl.compliance_group_id || !pl.status) {
      return false;
    }
  }
  return true;
};

const setVendorPoPayload = (compliance_data, tokenData) => {
  const payload = [];
  compliance_data.forEach((element) => {
    element.compliances.forEach((compl) => {
      payload.push({
        // reference_no: create_reference_no("HRC", tokenData.vendor_code),
        ref_group: createRefGroup(element),
        compliance_group_id: `${createRefGroup(element)}${element.compliance_month}${element.compliance_year}`,
        purchasing_doc_no: element.purchasing_doc_no,
        rc_no: element.rc_no,
        unit: element.unit,
        compliance_month: element.compliance_month,
        compliance_year: element.compliance_year,
        file1: element.file1,
        compliance: compl,
        status: SUBMITTED,
        vendor_code: tokenData.vendor_code,
      });
    });
  });
  return payload;
};
const setVendorRcPayload = (compliance_data, tokenData) => {
  const payload = [];
  compliance_data.forEach((element) => {
    element.compliances.forEach((compl) => {
      payload.push({
        // reference_no: create_reference_no("HRC", tokenData.vendor_code),
        // ref_group: element.ref_group,
        compliance_group_id: `${createRefGroup(element)}${element.compliance_month}${element.compliance_year}`,
        ref_group: createRefGroup(element),
        purchasing_doc_no: element.purchasing_doc_no,
        rc_no: element.rc_no,
        unit: element.unit,
        compliance_month: element.compliance_month,
        compliance_year: element.compliance_year,
        file1: element.file1,
        compliance: compl,
        status: SUBMITTED,
        vendor_code: tokenData.vendor_code,
        created_by: tokenData.vendor_code,
        created_at: getEpochTime(),
      });
    });
  });
  return payload;
};
const setHrPayload = (compliance_data, tokenData) => {
  const payload = [];
  compliance_data.forEach((element) => {
    payload.push({
      compliance_group_id: element.compliance_group_id,
      status: element.status,
      remarks: element.remarks,
      updated_by: tokenData.vendor_code,
      updated_at: getEpochTime(),
    });
  });
  return payload;
};

async function checkCurrentData(client, data) {
  try {
    const { q, val } = generateSimpleSingleGetQuery(
      HR_COMPLIANCE_DATA,
      "*",
      data,
    );
    const result = await poolQuery({ client, query: q, values: val });

    return result[0] || {};
  } catch (error) {
    throw error;
  }
}

function hrComplinceViewSimplyfy(data) {
  const grouped = {};

  const hrStatusCodeRank = {
    [SUBMITTED]: 1,
    [STATUS_HOLD_BY_HR]: 1,
    [STATUS_HOLD_BY_HR_RECIPIENT]: 1,
    [STATUS_RECOMMEND]: 2,
    [NOT_RECOMMEND]: 3,
    [APPROVED]: 4,
    [REJECTED]: 5,
  };
  data.forEach((item) => {
    const key = `${item.ref_group}_${item.compliance_month}_${item.compliance_year}`;

    if (!grouped[key]) {
      const { ...rest } = item;
      grouped[key] = {
        ...rest,
        statusCode: hrStatusCodeRank[item.status] || 10,
      };
    }

    // Add compliance flags
    item.compliance_data.forEach((c) => {
      if (c.compliance && typeof c.compliance == "string") {
        grouped[key][c.compliance.toLowerCase()] = "Y";
      }
    });
  });

  let result = Object.values(grouped);
  if (result.length) {
    result = result.sort((a, b) => a.statusCode - b.statusCode);
  }

  return result;
}

async function complianceListFromRc(client, tokenData, data) {
  try {
    let q = `SELECT hrc.ref_group, hrc.rc_no, hrc.purchasing_doc_no, hrc.unit FROM  ${HR_COMPLIANCE} as hrc
      LEFT JOIN ekko as ekko on( hrc.purchasing_doc_no = ekko.ebeln )
    `;
    let conditionQuery = " WHERE 1 = 1 ";

    let count = 0;
    const values = [];
    if (data.docNo) {
      conditionQuery += ` AND hrc.rc_no LIKE $${++count}`;
      values.push(`%${data.docNo}%`);
    }

    if (tokenData.user_type === USER_TYPE_VENDOR) {
      conditionQuery += ` AND ekko.lifnr = $${++count}`;
      values.push(tokenData.vendor_code);
    }

    const result = await poolQuery({
      client,
      query: q + conditionQuery,
      values,
    });
    //  result = result.map((el) => ({...el, rc_no: null, unit: null}))
    return result;
  } catch (error) {
    throw error;
  }
}
async function complianceListFromPo(client, tokenData, data) {
  try {
    let q = "SELECT ebeln as purchasing_doc_no FROM ekko";
    let conditionQuery = " WHERE 1 = 1 ";
    let count = 0;
    const values = [];
    if (data.docNo) {
      conditionQuery += ` AND ekko.ebeln LIKE $${++count}`;
      values.push(`%${data.docNo}%`);
    }
    if (tokenData.user_type === USER_TYPE_VENDOR) {
      conditionQuery += ` AND lifnr = $${++count}`;
      values.push(tokenData.vendor_code);
    }
    let result = await poolQuery({ client, query: q + conditionQuery, values });
    result = result.map((el) => ({
      ...el,
      rc_no: "NON_RC",
      unit: null,
      ref_group: null,
    }));
    return result;
  } catch (error) {
    throw error;
  }
}

async function complianceView(client, tokenData, data) {
  try {
    let q = `
    SELECT 
    compliance.purchasing_doc_no,
    compliance.unit,
    compliance.rc_no,
    compliance.ref_group,
    compliance_data.compliance_group_id,
    compliance_data.compliance_month,
    compliance_data.compliance_year,
    compliance_data.status,
    compliance_data.status,
    compliance_data.file1,
    compliance_data.hr_remarks,
    compliance_data.hr_retailer_remarks,
    compliance_data.supporting_doc,
    compliance_data.created_at,
    compliance_data.updated_at,
    compliance_data.vendor_code,
    vendor_master.vendor_type,
    json_agg(
        json_build_object(
            'reference_no', compliance_data.reference_no,
            'compliance', compliance_data.compliance,
            'compliance_month', compliance_data.compliance_month,
            'compliance_year', compliance_data.compliance_year,
            'status', compliance_data.status,
            'hr_retailer_user_id', compliance_data.hr_retailer_user_id,
            'hr_user_id', compliance_data.hr_user_id,
            'hr_remarks', compliance_data.hr_remarks,
            'created_at', compliance_data.created_at,
            'updated_at', compliance_data.updated_at,
            'created_by', compliance_data.created_by
        )
    ) AS compliance_data
FROM ${HR_COMPLIANCE} AS compliance
LEFT JOIN ${HR_COMPLIANCE_DATA} AS compliance_data 
    ON (compliance.ref_group = compliance_data.ref_group AND is_active = 'F')
LEFT JOIN ${VENDOR_MASTER_LFA1} as vendor_master
    ON vendor_master.lifnr = compliance_data.vendor_code`;

    let conditionQuery = " WHERE 1 = 1 ";

    conditionQuery += `
    -- AND compliance_data.compliance_month = '1' 
    -- AND compliance_data.compliance_year = '2025'
    AND EXISTS (
      SELECT 1 
      FROM ${HR_COMPLIANCE} AS copy2
      WHERE copy2.ref_group = compliance_data.ref_group)`;

    const groupBy = ` GROUP BY 
    compliance.purchasing_doc_no,
    compliance.unit,
    compliance.rc_no,
    compliance.ref_group,
    compliance_data.compliance_group_id,
    compliance_data.compliance_month,
    compliance_data.status,
    compliance_data.hr_remarks,
    compliance_data.hr_retailer_remarks,
    compliance_data.supporting_doc,
    compliance_data.file1,
    compliance_data.created_at,
    compliance_data.updated_at,
    compliance_data.vendor_code,
    compliance_data.compliance_year,
    vendor_master.vendor_type `;
    // const orderBy = ` ORDER BY
    // compliance_data.created_at,
    // compliance_data.compliance_year,
    // compliance_data.compliance_month DESC`;
    const orderBy = ` ORDER BY compliance_data.created_at DESC`;

    // [NEW] COUNT QUERY
    let countQuery = `SELECT 
          count(*) as total
          FROM ${HR_COMPLIANCE} AS compliance
          LEFT JOIN ${HR_COMPLIANCE_DATA} AS compliance_data 
              ON (compliance.ref_group = compliance_data.ref_group AND is_active = 'F')
          LEFT JOIN ${VENDOR_MASTER_LFA1} as vendor_master
              ON vendor_master.lifnr = compliance_data.vendor_code`;

    let values = [];
    let count = 0;

    if (tokenData?.user_type == USER_TYPE_VENDOR) {
      values.push(tokenData.vendor_code);
      conditionQuery += ` AND compliance_data.vendor_code = $${++count} `;
    }

    if (data?.year) {
      values.push(data?.year);
      conditionQuery += ` AND compliance_data.compliance_year = $${++count} `;
    }
    if (data?.month) {
      values.push(data?.month);
      conditionQuery += ` AND compliance_data.compliance_month = $${++count} `;
    }
    if (data?.compliance_group_id) {
      values.push(data?.compliance_group_id);
      conditionQuery += ` AND compliance_data.compliance_group_id = $${++count} `;
    }
    if (data?.status) {
      values.push(data?.status);
      conditionQuery += ` AND compliance_data.status = $${++count} `;
    }
    if (data?.vendor_code) {
      values.push(data?.vendor_code);
      conditionQuery += ` AND compliance_data.vendor_code = $${++count} `;
    }
    if (data?.vendor_type) {
      values.push(data?.vendor_type);
      conditionQuery += ` AND vendor_master.vendor_type = $${++count} `;
    }
    if (data?.poNo) {
      values.push(`%${data?.poNo}%`);
      conditionQuery += ` AND compliance.purchasing_doc_no LIKE $${++count} `;
    }
    if (data?.rc_no) {
      values.push(`%${data?.rc_no}%`);
      conditionQuery += ` AND compliance.rc_no LIKE $${++count} `;
    }
    if (data?.unit) {
      values.push(data?.unit);
      conditionQuery += ` AND compliance.unit = $${++count} `;
    }

    // pagination
    // [NEW] COUNT QUERY
    // let pageNo = parseInt(data.pageNo) || 1;
    // let pageSize = parseInt(data.pageNo) || 3000;
    let pageNo = 1;
    let pageSize = 5000;
    let LIMIT_OFFSET = "";

    if (pageSize >= 0) {
      let offset = (pageNo - 1) * pageSize;
      LIMIT_OFFSET = ` LIMIT ${pageSize} OFFSET ${offset} `;
    }

    const finalDataQuery =
      q + conditionQuery + groupBy + orderBy + LIMIT_OFFSET;

    const finalCountQuery = countQuery + conditionQuery + groupBy;

    let result = await poolQuery({ client, query: finalDataQuery, values });
    let countResult = await poolQuery({
      client,
      query: finalCountQuery,
      values,
    });

    result = hrComplinceViewSimplyfy(result);
    return { complianceData: result, totalCount: null };
  } catch (error) {
    throw error;
  }
}

const currentDataValidation = (tokenData, currntData, payloadData) => {
  const errorObj = { success: false, message: "", data: {} };
  if (tokenData.user_type != USER_TYPE_VENDOR && tokenData.department_id == USER_TYPE_HSL_HR && tokenData.internal_role_id == ASSIGNER) {
    if (currntData.status === REJECTED) {
      return { ...errorObj, message: Message.COMPLIANCE_STATUS_WARNING_MSG + currntData.status, data: payloadData };
    }
    // if (currntData.status === APPROVED && payloadData.status === REJECTED) {
    //   return { ...errorObj, message: Message.COMPLIANCE_STATUS_WARNING_MSG + currntData.status, data: payloadData };
    // }

    if (payloadData.status != STATUS_HOLD_BY_HR && currntData.status === payloadData.status) {
      return { ...errorObj, message: Message.COMPLIANCE_STATUS_WARNING_MSG + payloadData.status, data: payloadData };
    }

    // if (currntData.status === NOT_RECOMMEND) {
    //   return { ...errorObj, message: "Not recomend by HR agency", data: payloadData };
    // }
    if (currntData.status === STATUS_HOLD_BY_HR_RECIPIENT) {
      return { ...errorObj, message: "Hold by HR agency", data: payloadData };
    }
    // if (!currntData.vendor_status || currntData.vendor_status != SUBMITTED) {
    //   return { ...errorObj, message: "No upload compliance by vendor ", data: payloadData };
    // }
    return { success: true, message: "All ok", data: payloadData };
  }

  if (tokenData.user_type != USER_TYPE_VENDOR && tokenData.department_id == USER_TYPE_HSL_HR && tokenData.internal_role_id == STAFF) {
    if (currntData.status === APPROVED || currntData.status === REJECTED || currntData.status === STATUS_HOLD_BY_HR) {
      return { ...errorObj, message: "Alreday action taken by HR", data: payloadData };
    }
    if (payloadData.status != STATUS_HOLD_BY_HR_RECIPIENT && currntData.status === payloadData.status) {
      return { ...errorObj, message: Message.COMPLIANCE_STATUS_WARNING_MSG + payloadData.status, data: payloadData };
    }
    // if (!currntData.vendor_status || currntData.vendor_status != SUBMITTED) {
    //   return { ...errorObj, message: "No upload compliance by vendor", data: payloadData };
    // }
    return { success: true, message: "All ok", data: payloadData };
  }

  // if (tokenData.user_type === USER_TYPE_VENDOR) {
  //   // if (currntData.vendor_status === SUBMITTED && currntData.status === STATUS_RECOMMEND && currntData.status == APPROVED) {
  //   //   return { ...errorObj, message: "Still HR not taken any action", data: payloadData };
  //   // }
  //   if (currntData.status === SUBMITTED && (currntData.status === STATUS_RECOMMEND || currntData.status === APPROVED || currntData.status === STATUS_HOLD_BY_HR)) {
  //     return { ...errorObj, message: "Under HR Review...cannot submit more", data: payloadData };
  //   }
  //   // if (
  //   //   currntData.compliance_month == getMonthFromVendorValidateDate(payloadData.compliance_till_date) &&
  //   //   (currntData.hr_status == APPROVED && currntData.hr_retailer_status == STATUS_RECOMMEND)
  //   // ) {
  //   //   return { ...errorObj, message: "Compliance is already approved for the month  " + localData.MONTH_LIST_OBJECT[currntData.compliance_month], data: payloadData };
  //   // }

  //   if (parseInt(currntData.compliance_till) > parseInt(payloadData.compliance_till_date)) {
  //     return { ...errorObj, message: "Can't upload compliane for month " + localData.MONTH_LIST_OBJECT[currntData.compliance_month], data: payloadData };
  //   }

  //   // if (
  //   //   currntData.compliance_month == getMonthFromVendorValidateDate(payloadData.compliance_till_date) &&
  //   //   (!currntData.hr_status && currntData.hr_retailer_status == STATUS_RECOMMEND)
  //   // ) {
  //   //   return { ...errorObj, message: "Already update compliance for this month " + currntData.compliance_month, data: payloadData };
  //   // }
  //   return { success: true, message: "All ok", data: payloadData };
  // }
};

const findOutExistingAndNotExistingInNewData = (existingData, upcommingPayload) => {
  const existingDataMap = new Set(existingData.map((item) => `${item.compliance_group_id}__${item.compliance}`));

  const upcomingDataMap = new Set(upcommingPayload.map((item) => `${item.compliance_group_id}__${item.compliance}`));

  // 1️⃣ Find new items in upcoming that are not in existing
  const newItems = upcommingPayload.filter((item) => !existingDataMap.has(`${item.compliance_group_id}__${item.compliance}`));

  // 2️⃣ Find items in existing that are not in upcoming
  const removedItems = existingData.filter((item) => !upcomingDataMap.has(`${item.compliance_group_id}__${item.compliance}`));

  return { newItems, removedItems };
};

module.exports = {
  setVendorPoPayload,
  paylaodValidation,
  checkCurrentData,
  setVendorRcPayload,
  hrComplinceViewSimplyfy,
  complianceView,
  complianceListFromRc,
  complianceListFromPo,
  paylaodValidationForHrRecepent,
  paylaodValidationForHr,
  setHrPayload,
  currentDataValidation,
  findOutExistingAndNotExistingInNewData,
  createRefGroup,
};
