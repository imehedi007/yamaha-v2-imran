const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

async function run() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'yamaha_ai',
  });

  try {
    console.log('Running migrations...');
    
    // Add hash_id to generations if it doesn't exist
    try {
      await pool.query('ALTER TABLE generations ADD COLUMN hash_id VARCHAR(50) UNIQUE');
      console.log('Added hash_id to generations');
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME') {
        console.log('hash_id already exists in generations');
      } else {
        throw e;
      }
    }

    // Create app_settings table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS app_settings (
        setting_key VARCHAR(100) PRIMARY KEY,
        setting_value VARCHAR(255) NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    console.log('Ensured app_settings table exists');

    // Insert default rate limits if they don't exist
    await pool.query(`
      INSERT IGNORE INTO app_settings (setting_key, setting_value) 
      VALUES 
        ('max_hourly_generations', '5'),
        ('max_daily_generations', '10')
    `);
    console.log('Inserted default rate limits');

    // Backfill existing generations with a hash_id
    const [rows] = await pool.query('SELECT id FROM generations WHERE hash_id IS NULL');
    const crypto = require('crypto');
    for (const row of rows) {
      const hash = crypto.randomBytes(16).toString('hex');
      await pool.query('UPDATE generations SET hash_id = ? WHERE id = ?', [hash, row.id]);
    }
    console.log(`Backfilled ${rows.length} existing generations with hash_id`);

    console.log('Migration complete!');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    pool.end();
  }
}

run();
