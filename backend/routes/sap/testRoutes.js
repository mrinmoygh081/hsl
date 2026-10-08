/* eslint-disable no-undef */
const router = require("express").Router();
const { resSend } = require("../../lib/resSend");
const Message = require("../../utils/messages");
const { poolClient, query } = require("../../config/pgDbConfig");
const { verifyAccessToken } = require("../../services/jwt.services");

////////////// STRAT TESTING APIS //////////////

router.post("/po", [], async (req, res) => {
  try {
    const client = await poolClient();
    try {

      const qu = `INSERT INTO ekko 
                                (EBELN, BUKRS, BSTYP, BSART, LOEKZ, AEDAT, ERNAM, LIFNR, EKORG, EKGRP)
                            VALUES 
                                ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10), 
                                ($11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
                            ON CONFLICT (EBELN)
                            DO UPDATE SET
                                BUKRS = EXCLUDED.BUKRS, 
                                BSTYP = EXCLUDED.BSTYP, 
                                LOEKZ = EXCLUDED.LOEKZ, 
                                AEDAT = EXCLUDED.AEDAT`;

      const values = [
        "4000234573",
        "5788",
        "S",
        "ABCD",
        "W",
        "20241109",
        "34567656787",
        "50000437",
        "1234",
        "123",
        "4000234574",
        "5789",
        "S",
        "EFGH",
        "X",
        "20241101",
        "34567656788",
        "50000438",
        "1235",
        "124",
      ];

      try {
        await query({ query: qu, values: values });
      } catch (error) {
        console.error(error);
      }

      resSend(res, true, 200, Message.USER_AUTHENTICATION_SUCCESS, "response");
    } catch (error) {
      resSend(res, false, 500, Message.SERVER_ERROR, error);
    } finally {
      client.release();
    }
  } catch (error) {
    resSend(res, false, 500, Message.DB_CONN_ERROR, JSON.stringify(error));
  }
});

router.post("/exucuteQuery", [verifyAccessToken], async (req, res) => {
  try {
    const { body } = req;
    const { q, val, userId } = body;
    if (userId !== process.env.PG_DB_USER) {
      return resSend(res, false, 401, "SEND VALID USER ID", { userId });
    }
    const result = await query({ query: q, values: val });
    resSend(res, true, 200, "Query execute successfully", result);

  } catch (error) {
    resSend(res, false, 500, error.message, JSON.stringify(error));
  }
})

////////////// END OF TEST API //////////////
module.exports = router;
