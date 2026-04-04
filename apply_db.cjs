const mysql = require('mysql2/promise');

(async () => {
    const url = process.env.DATABASE_URL || process.env.MYSQL_URL;
    const pool = url ? mysql.createPool(url) : mysql.createPool({
        host: process.env.MYSQLHOST,
        user: process.env.MYSQLUSER,
        password: process.env.MYSQLPASSWORD,
        database: process.env.MYSQLDATABASE
    });

    console.log('[DB-PATCH] Starting manual schema migration...');

    try {
        // Change #1: Add 'topic' column
        await pool.query("ALTER TABLE learning_content ADD COLUMN IF NOT EXISTS topic VARCHAR(255) NOT NULL DEFAULT 'GENERAL'");
        console.log('[DB-PATCH] OK: Column "topic" verified.');
    } catch (e) {
        if (e.message.includes('Duplicate column name')) {
             console.log('[DB-PATCH] Column "topic" already exists.');
        } else {
             console.error('[DB-PATCH] ERROR adding "topic":', e.message);
        }
    }

    try {
        // Change #2: Add 'order_in_topic' column
        await pool.query("ALTER TABLE learning_content ADD COLUMN IF NOT EXISTS order_in_topic INT DEFAULT 0");
        console.log('[DB-PATCH] OK: Column "order_in_topic" verified.');
    } catch (e) {
        if (e.message.includes('Duplicate column name')) {
             console.log('[DB-PATCH] Column "order_in_topic" already exists.');
        } else {
             console.error('[DB-PATCH] ERROR adding "order_in_topic":', e.message);
        }
    }

    console.log('[DB-PATCH] Manual migration attempt finished.');
    process.exit(0);
})();
