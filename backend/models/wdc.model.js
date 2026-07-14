// // models/Wdc.js (new file or extend your existing WDC model)

// const { query, poolQuery } = require("../config/pgDbConfig");
// const { INSERT, UPDATE } = require("../lib/constant");
// const { WDC, WDC_LINE } = require("../lib/tableName");
// const { generateQuery, generateQueryForMultipleData, generateSimpleSingleGetQuery } = require("../lib/utils");


// class Wdc {
//     reference_no;
//     constructor(reference_no) {
//         this.reference_no = reference_no;
//     }
//     static getReferenceNo() {
//         return this.reference_no;
//     }

//     static async getWdc(client, findByObject, selectedCols = "*") {
//         try {

//             const { q, val } = generateSimpleSingleGetQuery(WDC, selectedCols, findByObject, "created_at DESC");
//             const { rows } = await query({ query: q, values: val });
//             return rows[0];
//         } catch (error) {
//             throw error;
//         }

//     }

//     static async getRecentWdcBySearchValue(client, findByObject, selectedCols = "*") {
//         try {
//             const { q, val } = generateSimpleSingleGetQuery(WDC, selectedCols, findByObject, "created_at DESC");
//             const result = await poolQuery({ client, query: q, values: val });
//             return result;
//         } catch (error) {
//             throw error;
//         }

//     }

//     static async createWdc(client, payload) {
//         try {
//             const { q, val } = generateQuery(INSERT, WDC, payload);
//             const result = await poolQuery({ client, query: q, values: val });
//             return result;
//         } catch (error) {
//             throw error;
//         }
//     }

//     static async saveWdcLineItems(client, payload) {
//         try {
//             const { q, val } = generateQueryForMultipleData(payload, WDC_LINE, payload, ['id']);
//             const result = await poolQuery({ client, query: q, values: val });
//             return result;
//         } catch (error) {
//             throw error;
//         }
//     }

//      static async getSavedWdcLineItems(client, findByObject, selectedCols = "*") {
//         try {
//             const { q, val } = generateSimpleSingleGetQuery(WDC_LINE, selectedCols, findByObject);
//             const result = await poolQuery({ client, query: q, values: val });
//             return result;
//         } catch (error) {
//             throw error;
//         }

//     }

//     static async updateWdc(client, payload, conditionObj) {
//         try {
//             const { q, val } = generateQuery(UPDATE, WDC, payload, conditionObj);
//             const result = await poolQuery({ client, query: q, values: val });
//             return result;
//         } catch (error) {
//             throw error;
//         }
//     }
// }


// module.exports = Wdc;