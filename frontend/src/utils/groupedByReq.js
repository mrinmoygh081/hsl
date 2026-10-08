export const groupedByActionType = (data) => {
  return data.reduce((result, item) => {
    const actionType = item.action_type;
    if (!result[actionType]) {
      result[actionType] = [];
    }
    result[actionType].push(item);
    return result;
  }, {});
};

export const groupedByRefNo = (data) => {
  return data.reduce((result, item) => {
    const byType = item.reference_no;
    if (!result[byType]) {
      result[byType] = [];
    }
    result[byType].push(item);
    return result;
  }, {});
};
export const groupedByIlms = (data) => {
  return data.reduce((result, item) => {
    const byType = item.reference_no;
    if (!result[byType]) {
      result[byType] = [];
    }
    result[byType].push(item);
    return result;
  }, {});
};

export const groupedByShippingdocu = (data) => {
  return data.reduce((result, item) => {
    const byType = item.reference_no;
    if (!result[byType]) {
      result[byType] = [];
    }
    result[byType].push(item);
    return result;
  }, {});
};

export const groupedByBtnNum = (data) => {
  return data.reduce((result, item) => {
    const byType = item.btn_num;
    if (!result[byType]) {
      result[byType] = [];
    }
    result[byType].push(item);
    return result;
  }, {});
};
export const groupedByActiontype = (data) => {
  return data.reduce((result, item) => {
    const byType = item.action_type;
    if (!result[byType]) {
      result[byType] = [];
    }
    result[byType].push(item);
    return result;
  }, {});
};

export const groupByDocumentType = (data) => {
  return data.reduce((result, item) => {
    const byType = item.documentType;
    if (byType != "goods_issue_slip" && !result[byType]) {
      result[byType] = [];
    }
    if (byType != "goods_issue_slip") {
      result[byType].push(item);
    }
    console.log(result, "result");

    return result;
  }, {});
};
