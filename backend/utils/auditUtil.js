/**
 * Compares two objects and returns a delta object containing only the fields that changed.
 * Handles additions, modifications, and deletions.
 */
function getAuditDelta(oldData = {}, newData = {}) {
  const changes = {};
  
  // Combine all unique keys from both objects
  const allKeys = new Set([...Object.keys(oldData), ...Object.keys(newData)]);

  for (const key of allKeys) {
    const oldVal = oldData[key];
    const newVal = newData[key];

    // Simple strict equality check (works for strings, numbers, booleans)
    if (oldVal !== newVal) {
      changes[key] = {
        oldValue: oldVal !== undefined ? oldVal : null,
        newValue: newVal !== undefined ? newVal : null
      };
    }
  }

  return changes;
}

/**
 * Main utility function to insert an audit log into PostgreSQL.
 * Pass your active database client/pool as the first argument.
 */
async function trackAudit(dbClient, { moduleName, tableName, referenceNo, action, userId, oldData = {}, newData = {} }) {
  try {
    let delta = null;

    if (action === 'UPDATE') {
      delta = getAuditDelta(oldData, newData);
      // If nothing changed during an update, skip inserting a log entirely
      if (Object.keys(delta).length === 0) {
        return { success: true, skipped: true, message: 'No changes detected.' };
      }
    } else if (action === 'INSERT') {
      // For inserts, map every property to a clean {oldValue: null, newValue: value} format
      delta = {};
      for (const key of Object.keys(newData)) {
        delta[key] = { oldValue: null, newValue: newData[key] };
      }
    } else if (action === 'DELETE') {
      // For deletes, map every property to {oldValue: value, newValue: null}
      delta = {};
      for (const key of Object.keys(oldData)) {
        delta[key] = { oldValue: oldData[key], newValue: null };
      }
    }

    const query = `
      INSERT INTO audit_logs (module_name, table_name, reference_no, action, changed_by, changes)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id;
    `;

    const values = [
      moduleName,
      tableName,
      referenceNo,
      action,
      userId,
      JSON.stringify(delta) // Serializes beautifully into Postgres JSONB
    ];

    const result = await dbClient.query(query, values);
    return { success: true, logId: result.rows[0].id };

  } catch (error) {
    console.error(`[Audit Log Error] Failed to write audit trail for ${referenceNo}:`, error);
    // Don't throw the error if you don't want an audit failure to crash your main business logic
    throw error; 
  }
}

module.exports = {
  trackAudit
};


// CREATE TABLE audit_logs (
//     id SERIAL PRIMARY KEY,
//     user_id VARCHAR(255) NOT NULL,       -- Who made the change
//     action VARCHAR(50) NOT NULL,         -- 'INSERT', 'UPDATE', or 'DELETE'
//     table_name VARCHAR(100) NOT NULL,    -- Which table was changed (e.g., 'users')
//     record_id VARCHAR(255) NOT NULL,     -- The ID of the row that changed (e.g., '6001')
//     changes JSONB NOT NULL,              -- The delta object {name: {oldValue:..., newValue:...}}
//     created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
// );


// const { trackAudit } = require('./auditUtil');

// async function createProduct(req, res) {
//   const newProduct = { id: "PROD-999", name: "Wireless Mouse", price: 25.00 };
  
//   // 1. Insert into your main table
//   await db.query('INSERT INTO products ...', [newProduct]);

//   // 2. Track the audit log (Passing the new data)
//   await trackAudit(db, {
//     moduleName: 'Inventory',
//     tableName: 'products',
//     referenceNo: newProduct.id,
//     action: 'INSERT',
//     userId: req.user.id, // ID of the logged-in user
//     newData: newProduct
//   });
// }

// const { trackAudit } = require('./auditUtil');

// async function updateProduct(req, res) {
//   const productId = "PROD-999";
//   const updatedData = { name: "Wireless Mouse V2", price: 30.00 };

//   // 1. Fetch old data before updating
//   const original = await db.query('SELECT name, price FROM products WHERE id = $1', [productId]);
//   const oldProduct = original.rows[0];

//   // 2. Update your main table
//   await db.query('UPDATE products SET ... WHERE id = $1', [productId]);

//   // 3. Track the audit log (Utility compares old vs new dynamically)
//   await trackAudit(db, {
//     moduleName: 'Inventory',
//     tableName: 'products',
//     referenceNo: productId,
//     action: 'UPDATE',
//     userId: req.user.id,
//     oldData: oldProduct,
//     newData: updatedData
//   });
// }