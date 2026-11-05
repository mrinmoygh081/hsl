/*
 * Modify lifnrPayload payload object to insert data
 * @param {Object} payload
 * @param {string} status
 * @returns Object
 */
const lfa1Payload = async (payload) => {
  if (!payload || !Array.isArray(payload) || !payload.length) {
    throw new Error("Please send valid payload");
  }
  const pl = payload.map((obj) => ({
    LIFNR: obj.LIFNR,
    NAME1: obj.NAME1 || null,
    BU_GROUP: obj.BU_GROUP || null,
    STREET: obj.STREET || null,
    HOUSE_NUM1: obj.HOUSE_NUM1 || null,
    POST_CODE1: obj.POST_CODE1 || null,
    CITY1: obj.CITY1 || null,
    COUNTRY: obj.COUNTRY || null,
    REGION: obj.REGION || null,
    BEZEI: obj.BEZEI || null,
    TELF1: obj.TELF1 || null,
    SMTP_ADDR: obj.SMTP_ADDR || null,
    TAXTYPE: obj.TAXTYPE || null,
    STCD3: obj.STCD3 || null,
    J_1IPANNO: obj.J_1IPANNO || null,
    AKONT: obj.AKONT || null,
    ZZVEND_CAT: obj.ZZVEND_CAT || null,
    ZMSME_SOCCAT: obj.ZMSME_SOCCAT || null,
    ZMSME_GENDER: obj.ZMSME_GENDER || null,
    ZUDYAM_NO: obj.ZUDYAM_NO || null,
    ZVENDOR_TYPE: obj.ZVENDOR_TYPE || null,
    ZESI_NUM: obj.ZESI_NUM || null,
    ZPF_NUM: obj.ZPF_NUM || null,
    ZZSOLVENCY: obj.ZZSOLVENCY || null,
    ZDT_BANKSOL: obj.ZDT_BANKSOL || null,
    BANKL: obj.BANKL || null,
    BANKN: obj.BANKN || null,
    KOINH: obj.KOINH || null,
    ACCNAME: obj.ACCNAME || null,
    XDELE: obj.XDELE || null,
  }));
  return pl;
};

const addUserPayload = async (obj) => {
  if (!obj || !Array.isArray(obj) || !obj.length) {
    throw new Error("Please send valid payload");
  }
  const pl = obj.map((obj) => ({
    PERNR: obj.PERNR,
    CNAME: obj.CNAME || null,
    PHONE: obj.PHONE || null,
    EMAIL: obj.EMAIL || null,
    PERSG: obj.PERSG || null,
  }));
  return pl;
};

const addMaterialMasterPayload = async (obj) => {
  if (!obj || !Array.isArray(obj) || !obj.length) {
    throw new Error("Please send valid payload");
  }
  const pl = obj.map((obj) => ({
    MATNR: obj.MATNR,
    MTART: obj.MTART || null,
    MAKTX: obj.MAKTX || null,
    BSTME: obj.BSTME || null,
    MEINS: obj.MEINS || null,
  }));
  return pl;
};

module.exports = { lfa1Payload, addUserPayload, addMaterialMasterPayload };