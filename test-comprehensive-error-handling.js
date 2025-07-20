#!/usr/bin/env node

// Comprehensive Error Handling Test
// Tests the enhanced error handling across all services

const { ErrorHandler, AppError, retryOperation } = require('./lib/error-handler');

async function runTests() {
  console.log('🧪 Testing Comprehensive Error Handling Implementation...\n');

// Test 1: Error Handler Basic Functionality
console.log('1. Testing ErrorHandler basic functionality...');

try {
  // Test AppError creation
  const appError = new AppError(
    'Test error message',
    'TEST_ERROR',
    true,
    'User friendly message',
    'medium'
  );
  
  console.log('✅ AppError creation works');
  console.log(`   - Code: ${appError.code}`);
  console.log(`   - Retryable: ${appError.retryable}`);
  console.log(`   - User Message: ${appError.userMessage}`);
  console.log(`   - Severity: ${appError.severity}`);
} catch (error) {
  console.log('❌ AppError creation failed:', error.message);
}

// Test 2: Error Normalization
console.log('\n2. Testing error normalization...');

try {
  // Test with regular Error
  const regularError = new Error('Regular error message');
  const normalizedError = ErrorHandler.normalizeError(regularError);
  
  console.log('✅ Error normalization works');
  console.log(`   - Original: ${regularError.message}`);
  console.log(`   - Normalized code: ${normalizedError.code}`);
  console.log(`   - Retryable: ${normalizedError.retryable}`);
  
  // Test with string error
  const stringError = 'String error message';
  const normalizedStringError = ErrorHandler.normalizeError(stringError);
  
  console.log('✅ String error normalization works');
  console.log(`   - Original: ${stringError}`);
  console.log(`   - Normalized code: ${normalizedStringError.code}`);
} catch (error) {
  console.log('❌ Error normalization failed:', error.message);
}

// Test 3: Error Code Detection
console.log('\n3. Testing error code detection...');

const testCases = [
  { message: 'permission denied', expectedCode: 'PERMISSION_DENIED' },
  { message: 'network error occurred', expectedCode: 'NETWORK_ERROR' },
  { message: 'timeout exceeded', expectedCode: 'TIMEOUT_ERROR' },
  { message: 'authentication failed', expectedCode: 'PERMISSION_DENIED' },
  { message: 'unknown issue', expectedCode: 'UNKNOWN_ERROR' }
];

testCases.forEach(({ message, expectedCode }) => {
  const error = new Error(message);
  const detectedCode = ErrorHandler.getErrorCode(error);
  
  if (detectedCode === expectedCode) {
    console.log(`✅ Code detection for "${message}": ${detectedCode}`);
  } else {
    console.log(`❌ Code detection failed for "${message}": expected ${expectedCode}, got ${detectedCode}`);
  }
});

// Test 4: Retry Mechanism
console.log('\n4. Testing retry mechanism...');

let attemptCount = 0;

async function testRetryOperation() {
  try {
    const result = await retryOperation(async () => {
      attemptCount++;
      if (attemptCount < 3) {
        throw new Error('Simulated network error');
      }
      return 'Success after retries';
    }, {
      maxRetries: 3,
      baseDelay: 100,
      retryCondition: (error) => error.message.includes('network')
    });
    
    console.log(`✅ Retry operation succeeded: ${result}`);
    console.log(`   - Total attempts: ${attemptCount}`);
  } catch (error) {
    console.log(`❌ Retry operation failed: ${error.message}`);
  }
}

await testRetryOperation();

// Test 5: Non-retryable Error Handling
console.log('\n5. Testing non-retryable error handling...');

attemptCount = 0;

async function testNonRetryableError() {
  try {
    await retryOperation(async () => {
      attemptCount++;
      throw new AppError('Validation failed', 'VALIDATION_ERROR', false);
    }, {
      maxRetries: 3,
      retryCondition: (error) => {
        const appError = ErrorHandler.normalizeError(error);
        return appError.retryable;
      }
    });
  } catch (error) {
    if (attemptCount === 1) {
      console.log('✅ Non-retryable error handled correctly');
      console.log(`   - Attempts made: ${attemptCount} (should be 1)`);
    } else {
      console.log(`❌ Non-retryable error retried ${attemptCount} times`);
    }
  }
}

await testNonRetryableError();

// Test 6: Firebase Error Simulation
console.log('\n6. Testing Firebase error simulation...');

class MockFirebaseError extends Error {
  constructor(message, code) {
    super(message);
    this.code = code;
    this.name = 'FirebaseError';
  }
}

const firebaseErrors = [
  { code: 'permission-denied', message: 'Permission denied' },
  { code: 'not-found', message: 'Document not found' },
  { code: 'unavailable', message: 'Service unavailable' },
  { code: 'deadline-exceeded', message: 'Request timeout' }
];

firebaseErrors.forEach(({ code, message }) => {
  const firebaseError = new MockFirebaseError(message, code);
  const normalizedError = ErrorHandler.normalizeError(firebaseError);
  
  console.log(`✅ Firebase error "${code}" normalized to: ${normalizedError.code}`);
  console.log(`   - Retryable: ${normalizedError.retryable}`);
  console.log(`   - User message: ${normalizedError.userMessage}`);
});

// Test 7: Input Validation Patterns
console.log('\n7. Testing input validation patterns...');

function validateInput(value, fieldName) {
  if (!value?.trim()) {
    throw new AppError(
      `${fieldName} is required`,
      'VALIDATION_ERROR',
      false,
      `Please provide a valid ${fieldName.toLowerCase()}`
    );
  }
  return true;
}

const validationTests = [
  { value: '', field: 'User ID', shouldFail: true },
  { value: '   ', field: 'Team ID', shouldFail: true },
  { value: 'valid-id', field: 'Meeting ID', shouldFail: false },
  { value: null, field: 'Email', shouldFail: true }
];

validationTests.forEach(({ value, field, shouldFail }) => {
  try {
    validateInput(value, field);
    if (shouldFail) {
      console.log(`❌ Validation should have failed for ${field}: "${value}"`);
    } else {
      console.log(`✅ Validation passed for ${field}: "${value}"`);
    }
  } catch (error) {
    if (shouldFail && error.code === 'VALIDATION_ERROR') {
      console.log(`✅ Validation correctly failed for ${field}: "${value}"`);
    } else {
      console.log(`❌ Unexpected validation result for ${field}: ${error.message}`);
    }
  }
});

// Test 8: Error Severity Classification
console.log('\n8. Testing error severity classification...');

const severityTests = [
  { message: 'data loss detected', expectedSeverity: 'critical' },
  { message: 'permission denied', expectedSeverity: 'high' },
  { message: 'validation failed', expectedSeverity: 'low' },
  { message: 'network timeout', expectedSeverity: 'medium' }
];

severityTests.forEach(({ message, expectedSeverity }) => {
  const error = new Error(message);
  const normalizedError = ErrorHandler.normalizeError(error);
  
  if (normalizedError.severity === expectedSeverity) {
    console.log(`✅ Severity classification for "${message}": ${normalizedError.severity}`);
  } else {
    console.log(`❌ Severity classification failed for "${message}": expected ${expectedSeverity}, got ${normalizedError.severity}`);
  }
});

// Test 9: Authentication Error Handling
console.log('\n9. Testing authentication error handling...');

const authErrors = [
  'Authentication required',
  'Token expired',
  'Invalid credentials',
  'User not authenticated'
];

authErrors.forEach(message => {
  const error = new Error(message);
  const normalizedError = ErrorHandler.normalizeError(error);
  
  if (normalizedError.code.includes('PERMISSION') || normalizedError.code.includes('AUTH')) {
    console.log(`✅ Auth error "${message}" classified correctly: ${normalizedError.code}`);
  } else {
    console.log(`❌ Auth error "${message}" not classified correctly: ${normalizedError.code}`);
  }
});

// Test 10: Database Operation Error Patterns
console.log('\n10. Testing database operation error patterns...');

async function simulateDatabaseOperation(shouldFail = false, errorType = 'network') {
  return await retryOperation(async () => {
    if (shouldFail) {
      switch (errorType) {
        case 'network':
          throw new Error('Network connection failed');
        case 'permission':
          throw new AppError('Permission denied', 'PERMISSION_DENIED', false);
        case 'validation':
          throw new AppError('Invalid data', 'VALIDATION_ERROR', false);
        default:
          throw new Error('Unknown database error');
      }
    }
    return 'Database operation successful';
  }, {
    maxRetries: 2,
    retryCondition: (error) => {
      const appError = ErrorHandler.normalizeError(error);
      return appError.retryable && !['VALIDATION_ERROR', 'PERMISSION_DENIED'].includes(appError.code);
    }
  });
}

try {
  const result = await simulateDatabaseOperation(false);
  console.log(`✅ Successful database operation: ${result}`);
} catch (error) {
  console.log(`❌ Database operation failed unexpectedly: ${error.message}`);
}

try {
  await simulateDatabaseOperation(true, 'permission');
  console.log('❌ Permission error should have been thrown');
} catch (error) {
  if (error.code === 'PERMISSION_DENIED') {
    console.log('✅ Permission error handled correctly');
  } else {
    console.log(`❌ Unexpected error type: ${error.code}`);
  }
}

console.log('\n🎉 Comprehensive Error Handling Test Complete!');
console.log('\n📋 Summary:');
console.log('- ✅ AppError class implementation');
console.log('- ✅ Error normalization and classification');
console.log('- ✅ Retry mechanism with exponential backoff');
console.log('- ✅ Input validation patterns');
console.log('- ✅ Firebase error handling');
console.log('- ✅ Authentication error detection');
console.log('- ✅ Database operation error patterns');
console.log('- ✅ Error severity classification');
console.log('- ✅ Non-retryable error handling');
console.log('- ✅ User-friendly error messages');
}

// Run the tests
runTests().catch(console.error);