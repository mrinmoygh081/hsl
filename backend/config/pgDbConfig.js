/* eslint-disable no-undef */
const { Pool, types } = require("pg");


// 🔥 FIX: Prevent pg from converting DATE/TIMESTAMP into JS Date (which causes timezone shift)

// DATE → return as string "YYYY-MM-DD"
types.setTypeParser(1082, (val) => val);

// TIMESTAMP (without tz) → return raw string
types.setTypeParser(1114, (val) => val);

// TIMESTAMPTZ → return raw ISO string (keep Z)
types.setTypeParser(1184, (val) => val);

/**
 * PostgreSQL database configuration
 * Uses environment variables with fallback defaults
 */
const pgDbConfig = {
  user: process.env.PG_DB_USER || "postgres",
  host: process.env.PG_DB_HOST || "localhost",
  database: process.env.PG_DB_DATABASE_NAME || "grse_btn",
  password: process.env.PG_DB_PASSWORD || "postgres",
  port: process.env.PG_DB_PORT || 5432,
  max: process.env.PG_DB_MAX_CONNECTIONS || 20,
  idleTimeoutMillis: process.env.PG_DB_IDLE_TIMEOUT || 30000,
  connectionTimeoutMillis: process.env.PG_DB_CONNECTION_TIMEOUT || 2000,
};

/**
 * Create a single PostgreSQL connection pool
 * This pool is reused across the entire application
 */
const pool = new Pool(pgDbConfig);

/**
 * Execute a query using the pool
 * Returns full pg result (rows + metadata)
 *
 * @example
 * const result = await query({
 *   query: "SELECT * FROM users WHERE id = $1",
 *   values: [1]
 * });
 */
const query = async ({ query, values = [] }) => {
  try {
    return await pool.query(query, values);
  } catch (error) {
    console.error("DB query error:", error);
    throw error;
  }
};

/**
 * Execute a query using the pool
 * Returns only rows
 *
 * @example
 * const users = await getQuery({
 *   query: "SELECT * FROM users"
 * });
 */
const getQuery = async ({ query, values = [] }) => {
  try {
    const { rows } = await pool.query(query, values);
    return rows;
  } catch (error) {
    console.error("DB getQuery error:", error);
    throw error;
  }
};

/**
 * Get a dedicated client from the pool
 * Used for transactions or multiple queries
 *
 * ⚠️ Always call client.release() after use
 *
 * @example
 * const client = await poolClient();
 * try {
 *   await client.query("BEGIN");
 *   await client.query("INSERT INTO table ...");
 *   await client.query("COMMIT");
 * } catch (e) {
 *   await client.query("ROLLBACK");
 * } finally {
 *   client.release();
 * }
 */
const poolClient = async () => {
  try {
    return await pool.connect();
  } catch (error) {
    console.error("DB poolClient error:", error);
    throw error;
  }
};

/**
 * Execute a query using a provided client
 * Returns only rows
 *
 * @example
 * const rows = await poolQuery({
 *   client,
 *   query: "SELECT * FROM orders"
 * });
 */
const poolQuery = async ({ client, query, values = [] }) => {
  try {
    const { rows } = await client.query(query, values);
    return rows;
  } catch (error) {
    console.error("DB poolQuery error:", error);
    throw error;
  }
};

/**
 * Execute a query using a provided client
 * Returns full pg result
 *
 * @example
 * const result = await executeQuery({
 *   client,
 *   query: "UPDATE users SET active = false"
 * });
 * console.log(result.rowCount);
 */
const executeQuery = async ({ client, query, values = [] }) => {
  try {
    return await client.query(query, values);
  } catch (error) {
    console.error("DB executeQuery error:", error);
    throw error;
  }
};

/**
 * Run multiple database operations inside a transaction
 *
 * Automatically handles:
 * - BEGIN
 * - COMMIT
 * - ROLLBACK
 * - client release
 *
 * @example
 * await withTransaction(async (client) => {
 *   await poolQuery({ client, query: q1, values: v1 });
 *   await poolQuery({ client, query: q2, values: v2 });
 * });
 */
const withTransaction = async (callback) => {
  const client = await poolClient();
  try {
    await client.query("BEGIN");
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("DB transaction error:", error);
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Gracefully close the database pool
 * Called during application shutdown
 *
 * @example
 * process.on("SIGINT", shutdown);
 */
const shutdown = async () => {
  await pool.end();
  console.log("Database pool closed");
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

module.exports = {
  query,
  getQuery,
  poolClient,
  poolQuery,
  executeQuery,
  withTransaction,
};
