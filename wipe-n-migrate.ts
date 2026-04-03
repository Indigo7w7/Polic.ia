import { poolConnection } from './src/database/db';

async function run() {
  try {
    console.log("Wiping existing content...");
    await poolConnection.query(`DELETE FROM learning_content`);
    await poolConnection.query(`DELETE FROM learning_areas`);
    
    console.log("Altering schema...");
    try {
      await poolConnection.query(`ALTER TABLE learning_content ADD COLUMN topic VARCHAR(255) NOT NULL DEFAULT 'GENERAL'`);
      console.log("Added topic column");
    } catch (e: any) {
      if (!e.message.includes("Duplicate column name")) throw e;
      console.log("topic column already exists");
    }
    
    try {
       await poolConnection.query(`ALTER TABLE learning_content ADD COLUMN order_in_topic INT DEFAULT 0`);
       console.log("Added order_in_topic column");
    } catch(e: any) {
      if (!e.message.includes("Duplicate column name")) throw e;
      console.log("order_in_topic column already exists");
    }

    console.log("Done.");
  } catch (e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}
run();
