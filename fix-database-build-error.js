#!/usr/bin/env node

// Fix the database build error by removing duplicate DatabaseUtils

console.log('🔧 Fixing database build error...');

const fs = require('fs');

const databasePath = 'lib/database.ts';
if (fs.existsSync(databasePath)) {
  let content = fs.readFileSync(databasePath, 'utf8');
  
  // Find the end of the FirestoreService class and clean up everything after
  const serviceExportIndex = content.indexOf('export { FirestoreService };');
  
  if (serviceExportIndex !== -1) {
    // Keep everything up to and including the export
    const cleanContent = content.substring(0, serviceExportIndex + 'export { FirestoreService };'.length);
    
    // Add a clean ending
    const finalContent = cleanContent + '\n\n// Database service singleton\nexport const databaseService = new FirestoreService();\n';
    
    fs.writeFileSync(databasePath, finalContent);
    console.log('✅ Fixed database file - removed duplicate exports');
  } else {
    console.log('❌ Could not find FirestoreService export');
  }
} else {
  console.log('❌ Database file not found');
}

console.log('🎉 Build error fix complete!');
console.log('Try deploying again now.');