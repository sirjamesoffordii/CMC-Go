import mysql from 'mysql2/promise';

// Districts data mapped to regions with SVG path IDs matching the actual map
// These are the inkscape:label values from map.svg
const districtsData = [
  // Northwest
  { name: 'Alaska', svgPathId: 'Alaska', regionName: 'Northwest' },
  { name: 'Washington', svgPathId: 'Washington', regionName: 'Northwest' },
  { name: 'Oregon', svgPathId: 'Oregon', regionName: 'Northwest' },
  { name: 'Hawaii', svgPathId: 'Hawaii', regionName: 'Northwest' },
  
  // Big Sky
  { name: 'Montana', svgPathId: 'Montana', regionName: 'Big Sky' },
  { name: 'South Idaho', svgPathId: 'SouthIdaho', regionName: 'Big Sky' },
  { name: 'Wyoming', svgPathId: 'Wyoming', regionName: 'Big Sky' },
  { name: 'Utah', svgPathId: 'Utah', regionName: 'Big Sky' },
  { name: 'Northern Cal-Nevada', svgPathId: 'NorthernCal-Nevada', regionName: 'Big Sky' },
  
  // Great Plains North
  { name: 'North Dakota', svgPathId: 'NorthDakota', regionName: 'Great Plains North' },
  { name: 'South Dakota', svgPathId: 'SouthDakota', regionName: 'Great Plains North' },
  { name: 'Nebraska', svgPathId: 'Nebraska', regionName: 'Great Plains North' },
  { name: 'Minnesota', svgPathId: 'Minnesota', regionName: 'Great Plains North' },
  { name: 'Iowa', svgPathId: 'Iowa', regionName: 'Great Plains North' },
  { name: 'Wisconsin-North Michigan', svgPathId: 'Wisconsin-NorthMichigan', regionName: 'Great Plains North' },
  
  // Great Lakes
  { name: 'Michigan', svgPathId: 'Michigan', regionName: 'Great Lakes' },
  { name: 'Illinois', svgPathId: 'Illinois', regionName: 'Great Lakes' },
  { name: 'Indiana', svgPathId: 'Indiana', regionName: 'Great Lakes' },
  { name: 'Ohio', svgPathId: 'Ohio', regionName: 'Great Lakes' },
  
  // Northeast
  { name: 'Northern New England', svgPathId: 'NorthernNewEnglend', regionName: 'Northeast' },
  { name: 'Southern New England', svgPathId: 'SouthernNewEngland', regionName: 'Northeast' },
  { name: 'New York', svgPathId: 'NewYork', regionName: 'Northeast' },
  
  // Great Plains South
  { name: 'Kansas', svgPathId: 'Kansas', regionName: 'Great Plains South' },
  { name: 'Northern Missouri', svgPathId: 'NorthernMissouri', regionName: 'Great Plains South' },
  { name: 'Southern Missouri', svgPathId: 'SouthernMissouri', regionName: 'Great Plains South' },
  { name: 'Oklahoma', svgPathId: 'Oklahoma', regionName: 'Great Plains South' },
  { name: 'Arkansas', svgPathId: 'Arkansas', regionName: 'Great Plains South' },
  
  // Southwest
  { name: 'Southern California', svgPathId: 'SouthernCalifornia', regionName: 'Southwest' },
  { name: 'Arizona', svgPathId: 'Arizona', regionName: 'Southwest' },
  { name: 'New Mexico', svgPathId: 'NewMexico', regionName: 'Southwest' },
  { name: 'Colorado', svgPathId: 'Colorado', regionName: 'Southwest' },
  
  // South Central
  { name: 'North Texas', svgPathId: 'NorthTexas', regionName: 'South Central' },
  { name: 'South Texas', svgPathId: 'SouthTexas', regionName: 'South Central' },
  { name: 'West Texas', svgPathId: 'WestTexas', regionName: 'South Central' },
  { name: 'Louisiana', svgPathId: 'Louisiana', regionName: 'South Central' },
  { name: 'Mississippi', svgPathId: 'Mississippi', regionName: 'South Central' },
  
  // Southeast
  { name: 'Kentucky', svgPathId: 'Kentucky', regionName: 'Southeast' },
  { name: 'Tennessee', svgPathId: 'Tennessee', regionName: 'Southeast' },
  { name: 'Alabama', svgPathId: 'Alabama', regionName: 'Southeast' },
  { name: 'Georgia', svgPathId: 'Georgia', regionName: 'Southeast' },
  { name: 'South Carolina', svgPathId: 'SouthCarolina', regionName: 'Southeast' },
  { name: 'North Carolina', svgPathId: 'NorthCarolina', regionName: 'Southeast' },
  
  // Mid-Atlantic
  { name: 'Appalachian', svgPathId: 'Appalachian', regionName: 'Mid-Atlantic' },
  { name: 'Potomac', svgPathId: 'Potomac', regionName: 'Mid-Atlantic' },
  { name: 'New Jersey', svgPathId: 'NewJersey', regionName: 'Mid-Atlantic' },
  { name: 'Penn-Del', svgPathId: 'Penn-Del', regionName: 'Mid-Atlantic' },
  
  // Florida
  { name: 'Peninsular Florida', svgPathId: 'PeninsularFlorida', regionName: 'Florida' },
  { name: 'West Florida', svgPathId: 'WestFlorida', regionName: 'Florida' }
];

async function reseedDistricts() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  
  try {
    // Get region IDs
    const [regions] = await connection.query('SELECT id, name FROM regions');
    const regionMap = new Map(regions.map(r => [r.name, r.id]));
    
    console.log('Regions in database:', Array.from(regionMap.keys()));
    
    // Clear existing districts
    console.log('\nClearing existing districts...');
    await connection.query('DELETE FROM districts');
    
    console.log('\nSeeding districts with correct SVG path IDs...');
    
    // Insert districts
    for (const district of districtsData) {
      const regionId = regionMap.get(district.regionName);
      if (!regionId) {
        console.error(`✗ Region not found for district: ${district.name} (region: ${district.regionName})`);
        continue;
      }
      
      const [result] = await connection.query(
        'INSERT INTO districts (name, svgPathId, regionId) VALUES (?, ?, ?)',
        [district.name, district.svgPathId, regionId]
      );
      console.log(`✓ Created district: ${district.name} (svgPathId: ${district.svgPathId}) → ${district.regionName}`);
    }
    
    console.log(`\n✓ Database reseeded successfully with ${districtsData.length} districts!`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await connection.end();
  }
}

reseedDistricts();
