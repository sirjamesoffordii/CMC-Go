import { readFileSync } from 'fs';
import { DOMParser } from 'xmldom';

const svgContent = readFileSync('/home/ubuntu/cmc-go/client/public/map.svg', 'utf-8');
const parser = new DOMParser();
const doc = parser.parseFromString(svgContent, 'image/svg+xml');

const paths = doc.getElementsByTagName('path');
const centroids = {};

// SVG viewBox is 228.86458 x 133.35001 mm
// We want to scale to approximately 900 x 524 pixels (maintaining aspect ratio)
const svgWidth = 228.86458;
const svgHeight = 133.35001;
const displayWidth = 900;
const displayHeight = Math.round(displayWidth * (svgHeight / svgWidth));
const scaleX = displayWidth / svgWidth;
const scaleY = displayHeight / svgHeight;

console.log(`// Display dimensions: ${displayWidth} x ${displayHeight}`);
console.log(`// Scale: ${scaleX.toFixed(2)} x ${scaleY.toFixed(2)}`);

for (let i = 0; i < paths.length; i++) {
  const path = paths[i];
  const label = path.getAttributeNS('http://www.inkscape.org/namespaces/inkscape', 'label') || path.getAttribute('inkscape:label');
  const d = path.getAttribute('d');
  
  if (!label || !d) continue;
  
  // Parse the path d attribute to extract coordinates
  // Handle both absolute and relative commands
  const commands = d.match(/[MLHVCSQTAZmlhvcsqtaz][^MLHVCSQTAZmlhvcsqtaz]*/g) || [];
  
  let currentX = 0, currentY = 0;
  let allX = [], allY = [];
  
  commands.forEach(cmd => {
    const type = cmd[0];
    const coords = cmd.slice(1).trim().match(/[-+]?\d*\.?\d+/g)?.map(Number) || [];
    
    if (type === 'M' || type === 'L') {
      for (let j = 0; j < coords.length; j += 2) {
        currentX = coords[j];
        currentY = coords[j + 1];
        allX.push(currentX);
        allY.push(currentY);
      }
    } else if (type === 'm' || type === 'l') {
      for (let j = 0; j < coords.length; j += 2) {
        currentX += coords[j];
        currentY += coords[j + 1];
        allX.push(currentX);
        allY.push(currentY);
      }
    } else if (type === 'H') {
      currentX = coords[0];
      allX.push(currentX);
      allY.push(currentY);
    } else if (type === 'h') {
      currentX += coords[0];
      allX.push(currentX);
      allY.push(currentY);
    } else if (type === 'V') {
      currentY = coords[0];
      allX.push(currentX);
      allY.push(currentY);
    } else if (type === 'v') {
      currentY += coords[0];
      allX.push(currentX);
      allY.push(currentY);
    } else if (type === 'C') {
      for (let j = 0; j < coords.length; j += 6) {
        currentX = coords[j + 4];
        currentY = coords[j + 5];
        allX.push(currentX);
        allY.push(currentY);
      }
    } else if (type === 'c') {
      for (let j = 0; j < coords.length; j += 6) {
        currentX += coords[j + 4];
        currentY += coords[j + 5];
        allX.push(currentX);
        allY.push(currentY);
      }
    }
  });
  
  if (allX.length > 0 && allY.length > 0) {
    // Calculate centroid as average of all points
    const avgX = allX.reduce((a, b) => a + b, 0) / allX.length;
    const avgY = allY.reduce((a, b) => a + b, 0) / allY.length;
    
    // Scale to display coordinates
    const x = Math.round(avgX * scaleX);
    const y = Math.round(avgY * scaleY);
    
    centroids[label] = { x, y };
  }
}

console.log('');
console.log('// District centroids for pie chart positioning');
console.log('const districtCentroids: Record<string, { x: number; y: number }> = {');
Object.entries(centroids).sort((a, b) => a[0].localeCompare(b[0])).forEach(([label, pos]) => {
  console.log(`  "${label}": { x: ${pos.x}, y: ${pos.y} },`);
});
console.log('};');

console.log('');
console.log('// District list for database seeding');
console.log('const districtIds = [');
Object.keys(centroids).sort().forEach(label => {
  console.log(`  "${label}",`);
});
console.log('];');
