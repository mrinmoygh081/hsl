// const { Pool } = require("pg");
// const { generateQuery } = require("../lib/utils");
// const { INSERT } = require("../lib/constant");

// const LAN_PG_DB_USER = "";
// const LAN_PG_DB_HOST = "";
// const LAN_PG_DB_DATABASE_NAME = "";
// const LAN_PG_DB_PASSWORD = "";

// const AWS_PG_DB_USER = "";
// const AWS_PG_DB_HOST = "";
// const AWS_PG_DB_DATABASE_NAME = "";
// const AWS_PG_DB_PASSWORD = "";


// const asyncPool = async (config) => {
//     try {
//         const pool = new Pool(config);
//         return pool;
//     } catch (error) {
//         console.log("error", error, error.message);
//         throw error;
//     }
// };

// const poolClient = async (config) => {
//     const pool = await asyncPool(config);
//     try {
//         const client = await pool.connect();
//         // client.release() Must need to Release
//         return client;
//     } catch (error) {
//         console.error("Pool-Client error", error.message, error);
//         throw error;
//     }
// };

// const poolQuery = async ({ client, query, values }) => {
//     try {
//         const { rows } = await client.query(query, values);
//         return rows;
//     } catch (error) {
//         console.error(" Pool-Query --- error", error.message, error);
//         throw error;
//     }
// };

// async function AWSconnectDB() {
//     let client;
//     try {
//         const pgDbConfig = {
//             user: AWS_PG_DB_USER,
//             host: AWS_PG_DB_HOST,
//             database: AWS_PG_DB_DATABASE_NAME,
//             password: AWS_PG_DB_PASSWORD,
//             port: 5432,
//             max: 20,
//             idleTimeoutMillis: 30000,
//             connectionTimeoutMillis: 2000,
//         };

//         client = await poolClient(pgDbConfig);
//         console.log("AWS DB connection successfull");
//         return client;

//     } catch (error) {
//         console.error("AWSconnectDB - error", error.message, error);
//         throw error;
//     }

// }
// async function LANconnectDB() {
//     let client;
//     try {
//         const pgDbConfig = {
//             user: LAN_PG_DB_USER,
//             host: LAN_PG_DB_HOST,
//             database: LAN_PG_DB_DATABASE_NAME,
//             password: LAN_PG_DB_PASSWORD,
//             port: 5432,
//             max: 20,
//             idleTimeoutMillis: 30000,
//             connectionTimeoutMillis: 2000,
//         };

//         client = await poolClient(pgDbConfig);
//         console.log("LAN DB connection successfull");
//         return client;

//     } catch (error) {
//         console.error("LANconnectDB - error", error.message, error);
//         throw error;
//     }

// }

// async function getDataFromTable(client, tableName, selectFields = "*", whereCondition = "") {

//     try {
//         const query = `SELECT ${selectFields} FROM ${tableName} WHERE 1 = 1 ${whereCondition}`;
//         const values = [];
//         const result = await poolQuery({ client, query, values });
//         return result;
//     } catch (error) {
//         throw error;
//     }
// }


// async function compareDataAndFixLANtoAWS(tableName) {
//     let awsClient;
//     let lanClient
//     try {
//         awsClient = await AWSconnectDB();
//         lanClient = await LANconnectDB();
//         await awsClient.query("BEGIN");
//         // await lanClient.query("BEGIN");

//         // LOOKUP TABLE
//         console.log("LOOKUP TABLE NAME - - - ", tableName);
//         // LAN TABLE DATA COUNT IN TABLE
//         const countTableData = await poolQuery({ client: lanClient, query: `select count(*) from ${tableName}`, values: [] });
//         let pageSize = 200;
//         let count = parseInt(countTableData[0].count)
//         let totalPages = Math.ceil(count / pageSize);
//         console.log("--counts----", count, totalPages);
//         let totoalQueyexecute = 0;

//         for (let pageNo = 1; pageNo <= totalPages; pageNo++) {
//             const offset = (pageNo - 1) * pageSize;
//             const LIMIT_QUERY = `SELECT * FROM ${tableName} WHERE sync = true ORDER BY SYNC_UPDATED_AT DESC LIMIT ${pageSize} OFFSET ${offset}`;
//             console.log(LIMIT_QUERY);
//             const lanData = await poolQuery({ client: lanClient, query: LIMIT_QUERY, values: [] })

//             for (let lanTabelData of lanData) {
//                 const isFoundInAws = await poolQuery({
//                     client: awsClient,
//                     query: `select count(*) from ${tableName} where sync_id = $1 `,
//                     values: [lanTabelData["sync_id"]]
//                     // query: `select count(*) from ${tableName} where ebeln = $1 and mid = $2 `,
//                     // values: [lanTabelData["ebeln"], lanTabelData["mid"]]
//                 });

//                 // HANDLE FOR ZPO_MILESTONE DATA 
//                 // if (parseInt(isFoundInAws[0].count && tableName == "zpo_milestone")) {
//                 //     await poolQuery({
//                 //         client: awsClient,
//                 //         query: `DELETE from ${tableName} where ebeln = $1 and mid = $2 `,
//                 //         values: [lanTabelData["ebeln"], lanTabelData["mid"]]
//                 //     });

//                 //     console.log("FOUND AND DELETED FROM AWS", lanTabelData["ebeln"], lanTabelData["mid"]);
                    

//                 //     const { q, val } = generateQuery(INSERT, tableName, lanTabelData)
//                 //     await poolQuery({ client: awsClient, query: q, values: val });
//                 // }
//                 if (!parseInt(isFoundInAws[0].count)) {
//                     // console.log("lanTabelData", lanTabelData["sync_id"]);
//                     // update in AWS DB
//                     const { q, val } = generateQuery(INSERT, tableName, lanTabelData)
//                     await poolQuery({ client: awsClient, query: q, values: val });
//                 }

//                 totoalQueyexecute++;
//             }
//             console.log("INFO -- REMAINING ", count - totoalQueyexecute + " of " + count + " curren processed " + lanData.length);

//         }

//         await awsClient.query("COMMIT");

//         const awsCount = await poolQuery({ client: awsClient, query: `SELECT COUNT(*) FROM ${tableName} WHERE SYNC = $1`, values: [true] });
//         const lanCount = await poolQuery({ client: lanClient, query: `SELECT COUNT(*) FROM ${tableName} WHERE SYNC = $1`, values: [true] });

//         // await lanClient.query("COMMIT");
//         console.log("totoalQueyexecute", totoalQueyexecute);
//         console.warn("lan count", lanCount);
//         console.warn("aws count", awsCount);

//     } catch (error) {
//         if (awsClient) await awsClient.query("ROLLBACK");
//         //  if (lanClient) await lanClient.query("ROLLBACK");
//         console.error("compareData -- error", error.message, error);
//     } finally {
//         if (awsClient) awsClient.release();
//         if (lanClient) lanClient.release();

//     }
// }
// async function compareDataAndFixAWStoLAN(tableName) {
//     let awsClient;
//     let lanClient
//     try {
//         awsClient = await AWSconnectDB();
//         lanClient = await LANconnectDB();
//         await awsClient.query("BEGIN");
//         // await lanClient.query("BEGIN");

//         // LOOKUP TABLE
//         console.log("LOOKUP TABLE NAME - - - ", tableName);
//         // LAN TABLE DATA COUNT IN TABLE
//         const countTableData = await poolQuery({ client: awsClient, query: `select count(*) from ${tableName}`, values: [] });
//         let pageSize = 200;
//         let count = parseInt(countTableData[0].count)
//         let totalPages = Math.ceil(count / pageSize);
//         console.log("--counts----", count, totalPages);
//         let totoalQueyexecute = 0;

//         for (let pageNo = 1; pageNo <= totalPages; pageNo++) {
//             const offset = (pageNo - 1) * pageSize;
//             const LIMIT_QUERY = `SELECT * FROM ${tableName} WHERE sync = true ORDER BY SYNC_UPDATED_AT DESC LIMIT ${pageSize} OFFSET ${offset}`;
//             console.log(LIMIT_QUERY);
//             const awsData = await poolQuery({ client: awsClient, query: LIMIT_QUERY, values: [] })

//             for (let awsTabelData of awsData) {
//                 const isFoundInAws = await poolQuery({
//                     client: lanClient,
//                     query: `select count(*) from ${tableName} where sync_id = $1 `,
//                     values: [awsTabelData["sync_id"]]
//                 });
//                 if (!parseInt(isFoundInAws[0].count)) {
//                     // console.log("lanTabelData", lanTabelData["sync_id"]);
//                     // update in AWS DB
//                     const { q, val } = generateQuery(INSERT, tableName, awsTabelData)
//                     await poolQuery({ client: lanClient, query: q, values: val });
//                 }

//                 totoalQueyexecute++;
//             }
//             console.log("INFO -- REMAINING ", count - totoalQueyexecute + " of " + count + " curren processed " + awsData.length);

//         }

//         console.log("totoalQueyexecute", totoalQueyexecute);
//         await lanClient.query("COMMIT");
//         // await lanClient.query("COMMIT");

//     } catch (error) {
//         //  if (awsClient) await awsClient.query("ROLLBACK");
//         if (lanClient) await lanClient.query("ROLLBACK");
//         console.error("compareData -- error", error.message, error);
//     } finally {
//         if (awsClient) awsClient.release();
//         if (lanClient) lanClient.release();

//     }
// }



// // (async () => {
// //     const tableName = "essr";
// //     console.log("data compare on " + tableName);
// //     await compareDataAndFixLANtoAWS(tableName);
// //     console.log("data compare finished on " + tableName);

// //     // await compareDataAndFixAWStoLAN();
// // })();




