/* eslint-disable no-unsafe-finally */
/* eslint-disable no-undef */
const http = require("http");
const Message = require("../utils/messages");

/**
 * makeHttpRequest function to call external api from node backend
 * @param {String} url
 * @param {String} method
 * @param {JSON} postData
 * @returns Promise
 */

function makeHttpRequest(url, method = "GET", postData = null) {
  return new Promise((resolve, reject) => {
    // Parse the URL
    const urlParts = new URL(url);

    // Define the options for the HTTP request
    const Username = process.env.SAP_API_AUTH_USERNAME || "dcg1";
    const Password = process.env.SAP_API_AUTH_PASSWORD || "test#100";
    const credential = Username + ":" + Password;
    const base64Credentials = Buffer.from(credential).toString("base64");
    let statusCode = null;

    const options = {
      hostname: urlParts.hostname,
      port: urlParts.port,
      path: urlParts.pathname,
      method: method.toUpperCase(),
      headers: {
        "Content-Type": "application/json",
        Authorization: "Basic " + base64Credentials,
      },
      maxRedirects: 5,
    };

    // Add postData to the request if provided
    if (method.toUpperCase() === "POST" && postData !== null) {
      const postDataString = JSON.stringify(postData);
      options.headers["Content-Length"] = Buffer.byteLength(postDataString);
    }

    // Make the HTTP request
    const req = http.request(options, (res) => {
      let data = "";

      // A chunk of data has been received.
      res.on("data", (chunk) => {
        data += chunk;
      });

      // The whole response has been received.
      res.on("end", () => {
        resolve({ statusCode, data });
      });
      statusCode = res.statusCode;
    });

    // Handle errors
    req.on("error", (error) => {
      reject({ statusCode, error });
    });

    // If it's a POST request, write the postData to the request
    if (method.toUpperCase() === "POST" && postData !== null) {
      req.write(JSON.stringify(postData));
    }

    // End the request
    req.end();
  });
}

const connectToSapServer = async (endpoint, payload, method = "POST") => {

  let responseData = { statusCode: 0, status: false, message: "", data: "" };
  if (!endpoint || typeof endpoint != 'string' || !payload) {
    return { statusCode: 0, status: false, message: "Missing endpoint or payload", data: "" };
  }

  let postUrl = process.env.SAP_HOST_URL || `http://10.181.1.31:8010`;
  postUrl = postUrl.concat(endpoint);
  try {
    const postResponse = await makeHttpRequest(postUrl, method, payload);

    if (postResponse.statusCode && postResponse.statusCode >= 200 && postResponse.statusCode <= 226) {
      responseData.statusCode = postResponse.statusCode;
      responseData.status = true;
      responseData.message = Message.COMPLIANCE_INSERT_MSG;
    } else {
      responseData.statusCode = postResponse.statusCode;
      responseData.status = false;
      responseData.message = Message.SAP_NOT_CONNECTED;
    }

    console.log("POST Response from the server:", postResponse);
  } catch (error) {
    console.error("Error making the request:", error);
    throw error;
  } finally {
    return responseData;
  }
};

module.exports = { makeHttpRequest, connectToSapServer };

// Example BTN SAVE INTO SAP
// // CALL THIS FUNCTION IN BTN CONTROLLER AS PER CONDITION

// Example SDBG SAVE INTO SAP
// CALL THIS FUNCTION IN SDBG CONTROLLER AS PER CONDITION

//       EBELN: "4700026717", // PO NUMBER
//       LIFNR: "0050007545", // VENDOR CODE
//       RERNAM: "DCG", // REG CREATOR NAME --> VENDOR NUMBER
//       STCD3: "GSTIN12112",// VENDOR GSTIN NUMBER
//       ZVBNO: "789", // GATE ENTRY INVOCE NUMBER
//       VEN_BILL_DATE: "20240711", // GATE ENTRY INVOICE DATE
//       PERNR: tokenData.vendor_code, // DO ID
//       ZBTNO: btnPayload.btn_num, //  BTN NUMBER
//       ERDAT: "20240711",  // VENDOR BILL SUBMIT DATE
//       ERZET: "104556", // VENDOR BILL SUBMIT TIME
//       RERDAT: "20240711", //REGISTRATION NUMBER --- VENDOR BILL SUBMIT DATE
//       RERZET: "104556", //REGISTRATION NUMBER --- VENDOR BILL SUBMIT TIME
//       DPERNR1: tokenData.vendor_code, // DO NUMBER
//       DRERDAT1: "20240711", // DEPARTMETN RECECE DATE --> WHEN SUBMIT DO
//       DRERZET1: "104556", // DEPARTMETN RECECE TIME --> WHEN SUBMIT DO
//       DRERNAM1: tokenData.name, // DEPARTMETN RECECE DO ID --> WHEN SUBMIT DO
//       DAERDAT: "20240711", // DEPARTMENT APPROVAL DATE --> DO SUBMISSION DATE
//       DAERZET: "104556", // DEPARTMENT APPROVAL DATE --> DO SUBMISSION TIME
//       DAERNAM: tokenData.name, // DEPARTMENT APPROVAL NAME --> DO NAME

//       // DEERDAT: "", // REJECTION DATE
//       // DEERZET: "104556", // REJECTION TIME
//       // DEERNAM: "", // DO ( WHO REJECTED)
//       // ZRMK2: "", // "REJECTION REASON REMARKS / DO SUBMIT REMARKS"

//       DFERDAT: "20240711", // DO SUBMIT DATE
//       DEFRZET: "104556", // DO SUBMIT TIEM
//       DEFRNAM: "UN KNOWN", // DO SUBMIT NAME ( DO NAME)
//       DSTATUS: "4", // "4"
//       DPERNR: "600200", //  (DO)

//       FPRNR1: "600400", // FINACE AUTHIRITY ID ( )
//       FPRNAM1: "DEMO NAME", // FINANCE

