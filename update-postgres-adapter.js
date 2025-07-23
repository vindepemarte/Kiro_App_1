const fs = require('fs');
const path = require('path');

// Read the file
const filePath = path.join(__dirname, 'lib', 'postgres-adapter.ts');
let content = fs.readFileSync(filePath, 'utf8');

// Replace all instances of "pool.query" with "this.pool.query"
content = content.replace(/pool\.query/g, 'this.pool.query');

// Write the updated content back to the file
fs.writeFileSync(filePath, content);

console.log('Updated all pool references in postgres-adapter.ts');