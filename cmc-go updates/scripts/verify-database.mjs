import mysql from 'mysql2/promise';

// Expected schema structure
const expectedTables = {
  users: ['id', 'openId', 'name', 'email', 'loginMethod', 'role', 'createdAt', 'updatedAt', 'lastSignedIn'],
  regions: ['id', 'name', 'color', 'description', 'lastEditedBy', 'lastEditedAt', 'createdAt'],
  districts: ['id', 'name', 'svgPathId', 'regionId', 'color', 'contactName', 'contactEmail', 'contactPhone', 'lastEditedBy', 'lastEditedAt', 'createdAt'],
  campuses: ['id', 'name', 'districtId', 'city', 'state', 'contactName', 'contactEmail', 'contactPhone', 'lastEditedBy', 'lastEditedAt', 'createdAt'],
  people: ['id', 'personId', 'name', 'primaryRole', 'primaryCampusId', 'primaryDistrictId', 'primaryRegionId', 'nationalCategory', 'status', 'depositPaid', 'statusLastUpdated', 'statusLastUpdatedBy', 'needs', 'notes', 'spouse', 'kids', 'guests', 'childrenAges', 'lastEditedBy', 'lastEditedAt', 'createdAt'],
  assignments: ['id', 'personId', 'role', 'campusId', 'districtId', 'regionId', 'isPrimary', 'createdAt'],
  settings: ['id', 'key', 'value', 'updatedAt'],
  needs: ['id', 'personId', 'type', 'description', 'amount', 'isActive', 'resolvedAt', 'resolvedBy', 'createdAt']
};

async function verifyDatabase() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  
  console.log('=== Database Schema Verification ===\n');
  
  let allGood = true;
  
  for (const [tableName, expectedColumns] of Object.entries(expectedTables)) {
    try {
      const [rows] = await conn.execute(`DESCRIBE ${tableName}`);
      const actualColumns = rows.map(r => r.Field);
      
      const missing = expectedColumns.filter(col => !actualColumns.includes(col));
      const extra = actualColumns.filter(col => !expectedColumns.includes(col));
      
      if (missing.length === 0 && extra.length === 0) {
        console.log(`✅ ${tableName}: All ${expectedColumns.length} columns present`);
      } else {
        allGood = false;
        console.log(`❌ ${tableName}:`);
        if (missing.length > 0) {
          console.log(`   Missing columns: ${missing.join(', ')}`);
        }
        if (extra.length > 0) {
          console.log(`   Extra columns: ${extra.join(', ')}`);
        }
      }
    } catch (error) {
      allGood = false;
      console.log(`❌ ${tableName}: Table does not exist!`);
    }
  }
  
  // Check row counts
  console.log('\n=== Table Row Counts ===\n');
  for (const tableName of Object.keys(expectedTables)) {
    try {
      const [rows] = await conn.execute(`SELECT COUNT(*) as count FROM ${tableName}`);
      console.log(`${tableName}: ${rows[0].count} rows`);
    } catch (error) {
      console.log(`${tableName}: Error counting rows`);
    }
  }
  
  await conn.end();
  
  console.log('\n=== Summary ===');
  if (allGood) {
    console.log('✅ All tables and columns match the expected schema!');
  } else {
    console.log('❌ Some tables or columns are missing or different from expected schema.');
  }
  
  return allGood;
}

verifyDatabase().catch(console.error);
