require('dotenv').config({ path: '.env.local' });
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  console.log('Connecting to database...');
  const pool = mysql.createPool({
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true // Important to allow multiple SQL statements if needed
  });

  try {
    const schemaPath = path.join(__dirname, '../src/lib/server/schema.sql');
    if (!fs.existsSync(schemaPath)) {
      throw new Error(`Schema file not found at ${schemaPath}`);
    }

    const schemaSql = fs.readFileSync(schemaPath, 'utf8');

    // Split the SQL file by semicolons to execute statements sequentially
    // We ignore empty statements to prevent MySQL errors
    const statements = schemaSql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);

    console.log(`Found ${statements.length} SQL statements to execute.`);

    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      try {
        await pool.query(stmt);
        console.log(`[Success] Statement ${i + 1}/${statements.length}`);
      } catch (err) {
        console.error(`[Error] Failed at Statement ${i + 1}/${statements.length}`);
        console.error(`Query: ${stmt.substring(0, 100)}...`);
        console.error(err.message);
        throw err; // Stop migration on first error
      }
    }

    console.log('✅ Database migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
  } finally {
    await pool.end();
  }
}

runMigration();
