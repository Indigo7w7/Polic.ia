const mysql = require('mysql2/promise');

async function run() {
  const url = process.env.DATABASE_URL || process.env.MYSQL_URL;
  const pool = url ? mysql.createPool(url) : mysql.createPool({
    host: 'mysql-production-0751.up.railway.app',
    user: 'root',
    password: 'GBmQnlZxuGuYqzxbFNjAjyODtYACZSWm',
    database: 'railway',
    port: 3306
  });
  console.log('--- DB PATCH START ---');

  try {
    console.log('Checking "topic" column...');
    await pool.query("ALTER TABLE learning_content ADD COLUMN IF NOT EXISTS topic VARCHAR(255) NOT NULL DEFAULT 'GENERAL'");
    console.log('✅ "topic" verified.');
  } catch (err) {
    if (err.message.includes('Duplicate column name')) {
      console.log('Column "topic" already exists.');
    } else {
      console.error('❌ Topic error:', err.message);
    }
  }

  try {
    console.log('Checking "order_in_topic" column...');
    await pool.query("ALTER TABLE learning_content ADD COLUMN IF NOT EXISTS order_in_topic INT DEFAULT 0");
    console.log('✅ "order_in_topic" verified.');
  } catch (err) {
     if (err.message.includes('Duplicate column name')) {
      console.log('Column "order_in_topic" already exists.');
    } else {
      console.error('❌ Order error:', err.message);
    }
  }

  console.log('--- DB PATCH FINISHED ---');
  process.exit(0);
}

run();
