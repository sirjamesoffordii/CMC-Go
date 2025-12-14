import mysql from 'mysql2/promise';

// Geographic adjacency map (west to east, following US map layout)
const adjacencyMap = {
  // Big Sky: Montana (west) → Wyoming → Colorado → Utah → South Idaho (wraps back)
  'Big Sky': ['Montana', 'Wyoming', 'Colorado', 'Utah', 'SouthIdaho'],
  
  // Great Lakes: Michigan (west) → Ohio → Indiana → Illinois (wraps back)
  'Great Lakes': ['Michigan', 'Ohio', 'Indiana', 'Illinous'],
  
  // Great Plains North: North Dakota (west) → South Dakota → Minnesota → Wisconsin (wraps back)
  'Great Plains North': ['NorthDakota', 'SouthDakota', 'Minnesota', 'Wisconsin'],
  
  // Great Plains South: Nebraska (west) → Kansas → Iowa → North Missouri → South Missouri (wraps back)
  'Great Plains South': ['Nebraska', 'Kansas', 'Iowa', 'NorthMissouri', 'SouthMissouri'],
  
  // Mid-Atlantic: Virginia (west) → North Carolina (wraps back)
  'Mid-Atlantic': ['Virginia', 'NorthCarolina'],
  
  // Mid-Atlantic Extended: Kentucky (west) → Tennessee → West Virginia (wraps back)
  'Mid-Atlantic (Extended)': ['Kentucky', 'Tennessee', 'WestVirginia'],
  
  // Northeast: Pennsylvania (west) → New York → Vermont → New Hampshire → Maine → Massachusetts → Connecticut → New Jersey (wraps back)
  'Northeast': ['Pennsylvania', 'NewYork', 'Vermont', 'NewHampshire', 'Maine', 'Massachusetts', 'Connecticut', 'NewJersey'],
  
  // Northwest: Alaska (west) → Washington → Oregon → North Idaho (wraps back)
  'Northwest': ['Alaska', 'Washington', 'Oregon', 'NorthIdaho'],
  
  // South Central: Oklahoma (west) → Arkansas → Louisiana (wraps back)
  'South Central': ['Oklahoma', 'Arkansas', 'Louisiana'],
  
  // Southeast: Mississippi (west) → Alabama → Georgia → South Carolina → Florida → West Florida (wraps back)
  'Southeast': ['Mississippi', 'Alabama', 'Georgia', 'SouthCarolina', 'Florida', 'WestFlorida'],
  
  // Texico: West Texas → North Texas → South Texas → New Mexico (wraps back)
  'Texico': ['WestTexas', 'NorthTexas', 'SouthTexas', 'NewMexico'],
  
  // West Coast: Hawaii (west) → North California → South California → Nevada → Arizona (wraps back)
  'West Coast': ['Hawaii', 'NorthCalifornia', 'SouthCalifornia', 'Nevada', 'Arizona'],
};

async function updateAdjacency() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);

  console.log('Updating district adjacency relationships...');

  for (const [region, districtOrder] of Object.entries(adjacencyMap)) {
    console.log(`\nProcessing region: ${region}`);
    
    for (let i = 0; i < districtOrder.length; i++) {
      const currentId = districtOrder[i];
      const leftIndex = i === 0 ? districtOrder.length - 1 : i - 1;
      const rightIndex = i === districtOrder.length - 1 ? 0 : i + 1;
      
      const leftNeighbor = districtOrder[leftIndex];
      const rightNeighbor = districtOrder[rightIndex];
      
      await connection.execute(
        'UPDATE districts SET leftNeighbor = ?, rightNeighbor = ? WHERE id = ?',
        [leftNeighbor, rightNeighbor, currentId]
      );
      
      console.log(`  ${currentId}: left=${leftNeighbor}, right=${rightNeighbor}`);
    }
  }

  console.log('\n✓ Adjacency relationships updated successfully!');
  await connection.end();
}

updateAdjacency().catch(console.error);
