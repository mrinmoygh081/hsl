const { formatDate, formatTime } = require("../lib/utils");

/*
 * Modify RKPF payload object to insert data
 * @param {Object} payload
 * @param {string} status
 * @returns Object
 */

const reservationHeaderPayload = async (obj) => {
  if (!obj || typeof obj !== "object") {
    throw new Error("Please send valid payload");
  }
  const pl = {
    // C_PKEY: `${obj.EBELN}-${obj.EBELP}`,
    RSNUM: obj.RSNUM | obj.rsnum,
    RSDAT: formatDate(obj.RSDAT) || formatDate(obj.rsdat),
    USNAM: obj.USNAM || obj.usnam || null,
    BWART: obj.BWART || obj.bwart || null,
    WEMPF: obj.WEMPF || obj.wempf || null,
    KOSTL: obj.KOSTL || obj.kostl || null,
    EBELN: obj.EBELN || obj.ebeln || null,
    EBELP: obj.EBELP || obj.ebelp || null,
    UMWRK: obj.UMWRK || obj.umwrk || null,
    UMLGO: obj.UMLGO || obj.umlgo || null,
    PS_PSP_PNR: obj.PS_PSP_PNR || obj.ps_psp_pnr || null,
    WBS_DESC: obj.WBS_DESC || obj.wsb_desc || null,
  };
  return pl;
};

/*
 * Modify  payload object to insert data
 * @param {Object} payload
 * @param {string} status
 * @returns Object
 */

const reservationLineItemPayload = async (payload) => {
  if (!payload || !Array.isArray(payload) || !payload.length) {
    throw new Error("Please send valid payload");
  }
  const pl = payload.map((obj) => ({
    // C_PKEY: `${obj.RSNUM}-${obj.RSPOS}-${obj.RSART}`,
    RSNUM: obj.RSNUM,
    RSPOS: obj.RSPOS,
    RSART: obj.RSART,
    BDART: obj.BDART || null,
    RSSTA: obj.RSSTA || null,
    KZEAR: obj.KZEAR || null,
    MATNR: obj.MATNR || null,
    WERKS: obj.WERKS || null,
    LGORT: obj.LGORT || null,
    CHARG: obj.CHARG || null,
    BDMNG: obj.BDMNG || null,
    MEINS: obj.MEINS || null,
    ENMNG: obj.ENMNG || null,
    BWART: obj.BWART || null,
    ERFMG: obj.ERFMG || null,
    XWAOK: obj.XWAOK || null,
    XLOEK: obj.XLOEK || null,
    PSPEL: obj.PSPEL || null,
    BDTER: formatDate(obj.BDTER),
  }));
  return pl;
};
const serviceEntryPayload = async (payload) => {
  if (!payload || !Array.isArray(payload) || !payload.length) {
    throw new Error("Please send valid payload");
  }
  const pl = payload.map((obj) => ({
    lblni: obj.lblni || obj.LBLNI || "",
    lblne: obj.lblne || obj.LBLNE || "",
    ernam: obj.ernam || obj.ERNAM || "",
    erdat: formatDate(obj.erdat) || formatDate(obj.ERDAT),
    aedat: formatDate(obj.aedat) || formatDate(obj.AEDAT),
    aenam: obj.aenam || obj.AENAM || "",
    sbnamag: obj.sbnamag || obj.SBNAMAG || "",
    sbnaman: obj.sbnaman || obj.SBNAMAN || "",
    dlort: obj.dlort || obj.DLORT || "",
    lbldt: formatDate(obj.lbldt) || formatDate(obj.LBLDT),
    lzvon: formatDate(obj.lzvon) || formatDate(obj.LZVON),
    lzbis: formatDate(obj.lzbis) || formatDate(obj.LZBIS),
    lwert: obj.lwert || obj.LWERT || "",
    uwert: obj.uwert || obj.UWERT || "",
    unplv: obj.unplv || obj.UNPLV || "",
    waers: obj.waers || obj.WAERS || "",
    packno: obj.packno || obj.PACKNO || null,
    txz01: obj.txz01 || obj.TXZ01 || "",
    ebeln: obj.ebeln || obj.EBELN || "",
    ebelp: obj.ebelp || obj.EBELP || null,
    loekz: obj.loekz || obj.LOEKZ || "",
    kzabn: obj.kzabn || obj.KZABN || "",
    final: obj.final || obj.FINAL || "",
    frggr: obj.frggr || obj.FRGGR || "",
    frgsx: obj.frgsx || obj.FRGSX || "",
    frgkl: obj.frgkl || obj.FRGKL || "",
    frgzu: obj.frgzu || obj.FRGZU || "",
    frgrl: obj.frgrl || obj.FRGRL || "",
    f_lock: obj.f_lock || obj.F_LOCK || "",
    pwwe: obj.pwwe || obj.PWWE || null,
    pwfr: obj.pwfr || obj.PWFR || null,
    bldat: formatDate(obj.bldat) || formatDate(obj.BLDAT),
    budat: formatDate(obj.budat) || formatDate(obj.BUDAT),
    xblnr: obj.xblnr || obj.XBLNR || "",
    bktxt: obj.bktxt || obj.BKTXT || "",
    knttp: obj.knttp || obj.KNTTP || "",
    kzvbr: obj.kzvbr || obj.KZVBR || "",
    netwr: obj.netwr || obj.NETWR || "",
    banfn: obj.banfn || obj.BANFN || "",
    bnfpo: obj.bnfpo || obj.BNFPO || null,
    warpl: obj.warpl || obj.WARPL || "",
    wapos: obj.wapos || obj.WAPOS || "",
    abnum: obj.abnum || obj.ABNUM || null,
    fknum: obj.fknum || obj.FKNUM || "",
    fkpos: obj.fkpos || obj.FKPOS || null,
    user1: obj.user1 || obj.USER1 || "",
    user2: obj.user2 || obj.USER2 || "",
    navnw: obj.navnw || obj.NAVNW || "",
    spec_no: obj.spec_no || obj.SPEC_NO || "",
    cuobj: obj.cuobj || obj.CUOBJ || null,
    lemin: obj.lemin || obj.LEMIN || "",
    comp_date: formatDate(obj.comp_date) || formatDate(obj.COMP_DATE),
    manhrs: obj.manhrs || obj.MANHRS || null,
    rspt: obj.rspt || obj.RSPT || null,
    drsbm: obj.drsbm || obj.DRSBM || null,
    qaps: obj.qaps || obj.QAPS || null,
    ldel: obj.ldel || obj.LDEL || null,
    prpmd: obj.prpmd || obj.PRPMD || null,
    spcim: obj.spcim || obj.SPCIM || null,
    disbm: obj.disbm || obj.DISBM || null,
    sreng: obj.sreng || obj.SRENG || null,
    prmta: obj.prmta || obj.PRMTA || null,
    rejre: obj.rejre || obj.REJRE || null,
    wdc: trimData(obj.wdc || obj.WDC) || "",
  }));
  return pl;
};


function trimData(str) {
  if (!str || typeof str != "string") return str;

  return str.trim();
}

const serviceEntryLineItemPayload = async (payload) => {
  if (!payload || !Array.isArray(payload) || !payload.length) {
    throw new Error("Please send valid payload");
  }
  const pl = payload.map((obj) => ({
    packno: obj.packno || obj.PACKNO,
    introw: obj.introw || obj.INTROW,
    extrow: obj.extrow || obj.EXTROW || null,
    del: obj.del || obj.DEL || "",
    srvpos: obj.srvpos || obj.SRVPOS || "",
    extgroup: obj.extgroup || obj.EXTGROUP || "",
    package: obj.package || obj.PACKAGE || "",
    sub_packno: obj.sub_packno || obj.SUB_PACKNO || null,
    lbnum: obj.lbnum || obj.LBNUM || "",
    ausgb: obj.ausgb || obj.AUSGB || null,
    stlvpos: obj.stlvpos || obj.STLVPOS || "",
    extsrvno: obj.extsrvno || obj.EXTSRVNO || "",
    menge: obj.menge || obj.MENGE || null,
    meins: obj.meins || obj.MEINS || "",
    uebto: obj.uebto || obj.UEBTO || null,
    uebtk: obj.uebtk || obj.UEBTK || "",
    with_lim: obj.with_lim || obj.WITH_LIM || "",
    spinf: obj.spinf || obj.SPINF || "",
    peinh: obj.peinh || obj.PEINH || null,
    brtwr: obj.brtwr || obj.BRTWR || "",
    netwr: obj.netwr || obj.NETWR || "",
    frompos: obj.frompos || obj.FROMPOS || "",
    topos: obj.topos || obj.TOPOS || "",
    ktext1: obj.ktext1 || obj.KTEXT1 || "",
    vrtkz: obj.vrtkz || obj.VRTKZ || "",
    twrkz: obj.twrkz || obj.TWRKZ || "",
    pernr: obj.pernr || obj.PERNR || null,
    molga: obj.molga || obj.MOLGA || "",
    lgart: obj.lgart || obj.LGART || "",
    lgtxt: obj.lgtxt || obj.LGTXT || "",
    stell: obj.stell || obj.STELL || null,
    iftnr: obj.iftnr || obj.IFTNR || null,
    budat: formatDate(obj.budat || obj.BUDAT),
    insdt: formatDate(obj.insdt || obj.INSDT),
    pln_packno: obj.pln_packno || obj.PLN_PACKNO || null,
    pln_introw: obj.pln_introw || obj.PLN_INTROW || null,
    knt_packno: obj.knt_packno || obj.KNT_PACKNO || null,
    knt_introw: obj.knt_introw || obj.KNT_INTROW || null,
    tmp_packno: obj.tmp_packno || obj.TMP_PACKNO || null,
    tmp_introw: obj.tmp_introw || obj.TMP_INTROW || null,
    stlv_lim: obj.stlv_lim || obj.STLV_LIM || "",
    limit_row: obj.limit_row || obj.LIMIT_ROW || null,
    act_menge: obj.act_menge || obj.ACT_MENGE || null,
    act_wert: obj.act_wert || obj.ACT_WERT || "",
    knt_wert: obj.knt_wert || obj.KNT_WERT || "",
    knt_menge: obj.knt_menge || obj.KNT_MENGE || null,
    zielwert: obj.zielwert || obj.ZIELWERT || "",
    ung_wert: obj.ung_wert || obj.UNG_WERT || "",
    ung_menge: obj.ung_menge || obj.UNG_MENGE || null,
    alt_introw: obj.alt_introw || obj.ALT_INTROW || null,
    basic: obj.basic || obj.BASIC || "",
    alternat: obj.alternat || obj.ALTERNAT || "",
    bidder: obj.bidder || obj.BIDDER || "",
    supple: obj.supple || obj.SUPPLE || "",
    freeqty: obj.freeqty || obj.FREEQTY || "",
    inform: obj.inform || obj.INFORM || "",
    pausch: obj.pausch || obj.PAUSCH || "",
    eventual: obj.eventual || obj.EVENTUAL || "",
    mwskz: obj.mwskz || obj.MWSKZ || "",
    txjcd: obj.txjcd || obj.TXJCD || "",
    txdat: formatDate(obj.txdat || obj.TXDAT),
    prs_chg: obj.prs_chg || obj.PRS_CHG || "",
    matkl: obj.matkl || obj.MATKL || "",
    tbtwr: obj.tbtwr || obj.TBTWR || "",
    navnw: obj.navnw || obj.NAVNW || "",
    baswr: obj.baswr || obj.BASWR || "",
    kknumv: obj.kknumv || obj.KKNUMV || "",
    iwein: obj.iwein || obj.IWEIN || "",
    int_work: obj.int_work || obj.INT_WORK || null,
    externalid: obj.externalid || obj.EXTERNALID || "",
    kstar: obj.kstar || obj.KSTAR || "",
    act_work: obj.act_work || obj.ACT_WORK || null,
    mapno: obj.mapno || obj.MAPNO || null,
    srvmapkey: obj.srvmapkey || obj.SRVMAPKEY || null,
    taxtariffcode: obj.taxtariffcode || obj.TAXTARIFFCODE || "",
    sdate: formatDate(obj.sdate || obj.SDATE),
    begtime: formatTime(obj.begtime || obj.BEGTIME),
    endtime: formatTime(obj.endtime || obj.ENDTIME) || null,
    persext: obj.persext || obj.PERSEXT || "",
    catscounte: obj.catscounte || obj.CATSCOUNTE || "",
    stokz: obj.stokz || obj.STOKZ || "",
    belnr: obj.belnr || obj.BELNR || "",
    formelnr: obj.formelnr || obj.FORMELNR || "",
    frmval1: obj.frmval1 || obj.FRMVAL1 || null,
    frmval2: obj.frmval2 || obj.FRMVAL2 || null,
    frmval3: obj.frmval3 || obj.FRMVAL3 || null,
    frmval4: obj.frmval4 || obj.FRMVAL4 || null,
    frmval5: obj.frmval5 || obj.FRMVAL5 || null,
    userf1_num: obj.userf1_num || obj.USERF1_NUM || null,
    userf2_num: obj.userf2_num || obj.USERF2_NUM || null,
    userf1_txt: obj.userf1_txt || obj.USERF1_TXT || "",
    userf2_txt: obj.userf2_txt || obj.USERF2_TXT || "",
    knobj: obj.knobj || obj.KNOBJ || null,
    chgtext: obj.chgtext || obj.CHGTEXT || "",
    kalnr: obj.kalnr || obj.KALNR || null,
    klvar: obj.klvar || obj.KLVAR || "",
    extdes: obj.extdes || obj.EXTDES || "",
    bosinter: obj.bosinter || obj.BOSINTER || "",
    bosgrp: obj.bosgrp || obj.BOSGRP || "",
    bos_risk: obj.bos_risk || obj.BOS_RISK || "",
    bos_ecp: obj.bos_ecp || obj.BOS_ECP || "",
    chgltext: obj.chgltext || obj.CHGLTEXT || "",
    bosgruppenr: obj.bosgruppenr || obj.BOSGRUPPENR || null,
    boslfdnr: obj.boslfdnr || obj.BOSLFDNR || null,
    bosdrukz: obj.bosdrukz || obj.BOSDRUKZ || "",
    bossuppleno: obj.bossuppleno || obj.BOSSUPPLENO || null,
    bossupplestatus: obj.bossupplestatus || obj.BOSSUPPLESTATUS || null,
    extrefkey: obj.extrefkey || obj.EXTREFKEY || "",
    inv_menge: obj.inv_menge || obj.INV_MENGE || null,
    _dataaging: formatDate(obj._dataaging || obj._DATAAGING),
    per_sdate: formatDate(obj.per_sdate || obj.PER_SDATE),
    per_edate: formatDate(obj.per_edate || obj.PER_EDATE)
  }));
  return pl;
};
module.exports = {
  reservationHeaderPayload,
  reservationLineItemPayload,
  serviceEntryPayload,
  serviceEntryLineItemPayload
};
