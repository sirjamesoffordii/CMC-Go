import mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';

dotenv.config();

async function addMissingTables() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  
  try {
    console.log('Adding missing tables...');
    
    // Create settings table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS settings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        \`key\` VARCHAR(255) NOT NULL UNIQUE,
        value TEXT,
        updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ Created settings table');
    
    // Create needs table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS needs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        personId VARCHAR(64) NOT NULL,
        type ENUM('financial', 'other') NOT NULL DEFAULT 'other',
        description TEXT,
        amount INT,
        isActive BOOLEAN NOT NULL DEFAULT TRUE,
        resolvedAt TIMESTAMP NULL,
        resolvedBy VARCHAR(255),
        createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ Created needs table');
    
    // Add svgPathId column to districts if it doesn't exist
    try {
      await connection.query(`
        ALTER TABLE districts ADD COLUMN svgPathId VARCHAR(64) AFTER name
      `);
      console.log('✓ Added svgPathId column to districts');
      
      // Update svgPathId to match name for existing districts
      await connection.query(`
        UPDATE districts SET svgPathId = name WHERE svgPathId IS NULL
      `);
      console.log('✓ Updated svgPathId values');
    } catch (err) {
      if (err.code === 'ER_DUP_FIELDNAME') {
        console.log('  svgPathId column already exists');
      } else {
        console.log('  Error adding svgPathId:', err.message);
      }
    }
    
    console.log('\n✓ All missing tables added successfully!');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await connection.end();
  }
}

addMissingTables();
