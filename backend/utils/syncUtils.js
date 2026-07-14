const { query, poolQuery } = require("../config/pgDbConfig");
// const pool = require("../config/pgDBConfigSync");


exports.getColumnDataType = async (client, schemaName, tableName, columnName) => {
  try {
    const query = `
      SELECT data_type
      FROM information_schema.columns
      WHERE table_schema = $1
      AND table_name = $2
      AND column_name = $3
    `;

    const res = await poolQuery({ client, query, values: [schemaName, tableName, columnName] });

    if (res.length > 0) {
      return res[0].data_type;
    } else {
      return null;
    }
  } catch (err) {
    console.error("Error executing query", err.stack);
  }
};

exports.getColumnPrimaryKey = async (client, schemaName, tableName) => {
  try {
    const query = `
      SELECT kcu.column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
      WHERE tc.constraint_type = 'PRIMARY KEY'
      AND tc.table_name = $1
      AND tc.table_schema = $2 
	    AND kcu.column_name = 'id';
    `;

    // const { rows } = await pool.query(query, [tableName, schemaName]);

    const rows = await poolQuery({ client, query, values: [tableName, schemaName] });

    // Return the array of primary key column names
    return rows.map((row) => row.column_name);
  } catch (error) {
    console.error("Error fetching primary key columns:", error);
    throw error;
  }
};

exports.adjustSequences = async (client, tableName) => {
  try {
    // Get sequence names associated with the table
    const sequencesQuery = `
      SELECT c.relname AS sequence_name
      FROM pg_class c
      JOIN pg_depend d ON d.objid = c.oid
      JOIN pg_attribute a ON a.attnum = d.refobjsubid
      WHERE d.refobjid = (
        SELECT oid
        FROM pg_class
        WHERE relname = $1
      )
      AND c.relkind = 'S';
    `;

    // const { rows: sequences } = await pool.query(sequencesQuery, [tableName]);
    const { rows: sequences } = await query({ query: sequencesQuery, values: [tableName] });

    for (const sequence of sequences) {
      // Get the maximum value from the table for the column associated with the sequence
      const maxIdQuery = `
        SELECT MAX(id) AS max_id
        FROM ${tableName};
      `;
      const { rows: maxIdResult } = await query({query:maxIdQuery, values: []});
      const maxId = maxIdResult[0].max_id;

      if (maxId !== null) {
        // Adjust the sequence to be set after the maximum ID
        const setvalQuery = `
          SELECT setval($1, $2);
        `;
        await query({query: setvalQuery,  values: [sequence.sequence_name, maxId + 1]});


      } else {
        console.error(`No rows found in the ${tableName} table.`);
      }
    }
  } catch (error) {
    console.error(`Error adjusting sequences for table ${tableName}:`, error.message);
    throw error;
  }
};
