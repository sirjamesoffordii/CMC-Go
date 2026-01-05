import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';

dotenv.config();

async function resetDatabase() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  
  try {
    console.log('Dropping all tables...');
    
    // Disable foreign key checks
    await connection.query('SET FOREIGN_KEY_CHECKS = 0');
    
    // Get all tables in the database
    const [rows] = await connection.query(
      'SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE()'
    );
    
    const tables = rows.map(row => row.TABLE_NAME);
    console.log(`Found ${tables.length} tables to drop:`, tables);
    
    // Drop all tables
    for (const table of tables) {
      try {
        await connection.query(`DROP TABLE IF EXISTS \`${table}\``);
        console.log(`✓ Dropped table: ${table}`);
      } catch (err) {
        console.log(`  Error dropping ${table}: ${err.message}`);
      }
    }
    
    // Re-enable foreign key checks
    await connection.query('SET FOREIGN_KEY_CHECKS = 1');
    
    console.log('\n✓ All tables dropped successfully!');
    console.log('Now run: pnpm db:push');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await connection.end();
  }
}

resetDatabase();
