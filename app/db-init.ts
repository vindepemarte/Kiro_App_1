// This file is used to initialize the database service at runtime
// It's imported in the root layout.tsx file

export async function initializeDatabase() {
  if (typeof window !== 'undefined') {
    // Only run on the server
    return;
  }
  
  try {
    // Call the initialization API route
    await fetch('http://localhost:3001/api/init-db');
  } catch (error) {
    console.error('Failed to initialize database:', error);
  }
}

// Export a dummy function that can be called from the client
// This ensures the file is included in the bundle
export function dummyFunction() {
  return 'Database initialization module loaded';
}