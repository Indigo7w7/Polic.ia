const mysql = require('mysql2/promise');
require('dotenv').config();

async function run() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('No DATABASE_URL found');
    process.exit(1);
  }
  
  const connection = await mysql.createConnection(url);
  console.log('Connected to DB');
  
  const [rows] = await connection.execute(
    "UPDATE users SET role = 'admin' WHERE email = 'brizq02@gmail.com'"
  );
  
  console.log('Update result:', rows);
  
  const [user] = await connection.execute(
    "SELECT uid, name, email, role, school FROM users WHERE email = 'brizq02@gmail.com'"
  );
  console.log('User status after update:', user);
  
  await connection.end();
}

run().catch(console.error);
