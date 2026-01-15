#!/usr/bin/env node
/**
 * Ingest Excel seed data into the CMC Go database.
 * Following structure rules:
 * - "People (Unique)" is source of truth for people (one row per person)
 * - "Assignments" defines roles (person may appear multiple times)
 * - Use "Person ID" as primary key everywhere
 * - Do NOT create duplicate people
 * - National roles belong to "National" category, not tied to campuses/districts/regions
 * - Campuses with zero assignments are intentionally student-led
 * - No students in this dataset
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const XLSX = require('xlsx');
const mysql = require('mysql2/promise');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env') });

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL not found in environment');
  process.exit(1);
}

const EXCEL_PATH = '/home/ubuntu/upload/CMC_Go_Seed_REAL_Campuses_1105_UniquePeople_Assignments_FINAL.xlsx';

async function main() {
  console.log('Connecting to database...');
  const conn = await mysql.createConnection(DATABASE_URL);
  
  console.log('Loading Excel file...');
  const workbook = XLSX.readFile(EXCEL_PATH);
  
  // ============ LOAD CAMPUSES ============
  console.log('\n=== Loading Campuses ===');
  const campusSheet = workbook.Sheets['Campuses (305)'];
  const campuses = XLSX.utils.sheet_to_json(campusSheet);
  console.log(`Found ${campuses.length} campuses in Excel`);
  
  const campusNameToId = new Map();
  
  for (const campus of campuses) {
    const campusName = campus['Campus'];
    const districtId = campus['District'];
    
    if (!campusName || !districtId) continue;
    
    const [result] = await conn.execute(
      'INSERT INTO campuses (name, districtId) VALUES (?, ?)',
      [campusName, districtId]
    );
    campusNameToId.set(campusName, result.insertId);
  }
  console.log(`Loaded ${campusNameToId.size} campuses`);
  
  // ============ LOAD PEOPLE ============
  console.log('\n=== Loading People ===');
  const peopleSheet = workbook.Sheets['People (Unique)'];
  const people = XLSX.utils.sheet_to_json(peopleSheet);
  console.log(`Found ${people.length} people in Excel`);
  
  const statusMap = {
    'Going': 'Going',
    'Maybe': 'Maybe',
    'Not Going': 'Not Going',
    'Not invited yet': 'Not invited yet'
  };
  
  let peopleCount = 0;
  for (const person of people) {
    const personId = person['Person ID'];
    const name = person['Name'];
    
    if (!personId || !name) continue;
    
    const primaryCampusName = person['Primary Campus'];
    const primaryCampusId = primaryCampusName ? campusNameToId.get(primaryCampusName) : null;
    
    const rawStatus = person['Status'];
    const status = statusMap[rawStatus] || 'Not invited yet';
    
    let statusLastUpdated = person['Status Last Updated'];
    if (statusLastUpdated) {
      // Excel dates are numbers, convert to ISO string
      if (typeof statusLastUpdated === 'number') {
        const date = XLSX.SSF.parse_date_code(statusLastUpdated);
        statusLastUpdated = new Date(date.y, date.m - 1, date.d, date.H || 0, date.M || 0, date.S || 0);
      } else if (typeof statusLastUpdated === 'string') {
        statusLastUpdated = new Date(statusLastUpdated);
      }
    } else {
      statusLastUpdated = null;
    }
    
    await conn.execute(`
      INSERT INTO people (
        personId, name, primaryRole, primaryCampusId, primaryDistrictId, 
        primaryRegion, nationalCategory, status, statusLastUpdated, 
        statusLastUpdatedBy, needs, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      personId,
      name,
      person['Primary Role'] || null,
      primaryCampusId,
      person['Primary District'] || null,
      person['Primary Region'] || null,
      person['National Category'] || null,
      status,
      statusLastUpdated,
      person['Status Last Updated By'] || null,
      person['Needs'] || null,
      person['Notes'] || null
    ]);
    peopleCount++;
  }
  console.log(`Loaded ${peopleCount} people`);
  
  // ============ LOAD ASSIGNMENTS ============
  console.log('\n=== Loading Assignments ===');
  const assignmentSheet = workbook.Sheets['Assignments'];
  const assignments = XLSX.utils.sheet_to_json(assignmentSheet);
  console.log(`Found ${assignments.length} assignments in Excel`);
  
  let assignmentCount = 0;
  for (const assignment of assignments) {
    const personId = assignment['Person ID'];
    const assignmentType = assignment['Assignment Type'];
    const roleTitle = assignment['Role Title'];
    
    if (!personId || !assignmentType || !roleTitle) continue;
    
    const campusName = assignment['Campus'];
    const campusId = campusName ? campusNameToId.get(campusName) : null;
    
    const isPrimary = assignment['Is Primary'] === true || 
                      assignment['Is Primary'] === 'TRUE' || 
                      assignment['Is Primary'] === 'true' ||
                      assignment['Is Primary'] === 1;
    
    await conn.execute(`
      INSERT INTO assignments (
        personId, assignmentType, roleTitle, campusId, districtId, region, isPrimary
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      personId,
      assignmentType,
      roleTitle,
      campusId,
      assignment['District'] || null,
      assignment['Region'] || null,
      isPrimary
    ]);
    assignmentCount++;
  }
  console.log(`Loaded ${assignmentCount} assignments`);
  
  // ============ SUMMARY ============
  console.log('\n=== Summary ===');
  const [[{ count: campusCount }]] = await conn.execute('SELECT COUNT(*) as count FROM campuses');
  console.log(`Total campuses in DB: ${campusCount}`);
  
  const [[{ count: totalPeople }]] = await conn.execute('SELECT COUNT(*) as count FROM people');
  console.log(`Total people in DB: ${totalPeople}`);
  
  const [[{ count: totalAssignments }]] = await conn.execute('SELECT COUNT(*) as count FROM assignments');
  console.log(`Total assignments in DB: ${totalAssignments}`);
  
  const [statusDist] = await conn.execute('SELECT status, COUNT(*) as count FROM people GROUP BY status');
  console.log('Status distribution:');
  for (const row of statusDist) {
    console.log(`  ${row.status}: ${row.count}`);
  }
  
  await conn.end();
  console.log('\nIngestion complete!');
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
