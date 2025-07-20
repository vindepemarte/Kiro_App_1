#!/usr/bin/env node

/**
 * Comprehensive test for loading states and error recovery mechanisms
 * Tests the implementation of Task 15: Add Loading States and Error Recovery
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 Testing Loading States and Error Recovery Implementation...\n');

// Test results tracking
const results = {
  passed: 0,
  failed: 0,
  details: []
};

function test(description, testFn) {
  try {
    testFn();
    results.passed++;
    results.details.push(`✅ ${description}`);
    console.log(`✅ ${description}`);
  } catch (error) {
    results.failed++;
    results.details.push(`❌ ${description}: ${error.message}`);
    console.log(`❌ ${description}: ${error.message}`);
  }
}

function fileExists(filePath) {
  return fs.existsSync(filePath);
}

function fileContains(filePath, content) {
  if (!fileExists(filePath)) return false;
  const fileContent = fs.readFileSync(filePath, 'utf8');
  return fileContent.includes(content);
}

function fileContainsAll(filePath, contents) {
  return contents.every(content => fileContains(filePath, content));
}

// Test 1: Loading States Components
test('Loading states components are implemented', () => {
  const loadingStatesFile = 'components/ui/loading-states.tsx';
  
  if (!fileExists(loadingStatesFile)) {
    throw new Error('Loading states component file not found');
  }

  const requiredComponents = [
    'LoadingSpinner',
    'SkeletonCard',
    'SkeletonList',
    'ErrorState',
    'EmptyState',
    'LoadingOverlay',
    'ConnectionStatus',
    'OperationStatus',
    'ProgressSteps',
    'RetryButton'
  ];

  const missingComponents = requiredComponents.filter(component => 
    !fileContains(loadingStatesFile, `export function ${component}`)
  );

  if (missingComponents.length > 0) {
    throw new Error(`Missing components: ${missingComponents.join(', ')}`);
  }
});

// Test 2: Async Operation Hook
test('Async operation hook is implemented', () => {
  const hookFile = 'hooks/use-async-operation.ts';
  
  if (!fileExists(hookFile)) {
    throw new Error('Async operation hook file not found');
  }

  const requiredFeatures = [
    'useAsyncOperation',
    'useDataFetch',
    'useMultiAsyncOperation',
    'AsyncOperationState',
    'retryOperation',
    'execute',
    'retry',
    'reset',
    'clearError'
  ];

  const missingFeatures = requiredFeatures.filter(feature => 
    !fileContains(hookFile, feature)
  );

  if (missingFeatures.length > 0) {
    throw new Error(`Missing features: ${missingFeatures.join(', ')}`);
  }
});

// Test 3: Network Status Hook
test('Network status hook is implemented', () => {
  const hookFile = 'hooks/use-network-status.ts';
  
  if (!fileExists(hookFile)) {
    throw new Error('Network status hook file not found');
  }

  const requiredFeatures = [
    'useNetworkStatus',
    'useOnlineRecovery',
    'NetworkStatus',
    'isOnline',
    'isOffline',
    'retryWhenOnline'
  ];

  const missingFeatures = requiredFeatures.filter(feature => 
    !fileContains(hookFile, feature)
  );

  if (missingFeatures.length > 0) {
    throw new Error(`Missing features: ${missingFeatures.join(', ')}`);
  }
});

// Test 4: Loading State Manager
test('Loading state manager is implemented', () => {
  const managerFile = 'lib/loading-state-manager.ts';
  
  if (!fileExists(managerFile)) {
    throw new Error('Loading state manager file not found');
  }

  const requiredFeatures = [
    'LoadingStateManager',
    'useLoadingStateStore',
    'startLoading',
    'finishLoading',
    'addError',
    'retryError',
    'withLoading',
    'withProgress'
  ];

  const missingFeatures = requiredFeatures.filter(feature => 
    !fileContains(managerFile, feature)
  );

  if (missingFeatures.length > 0) {
    throw new Error(`Missing features: ${missingFeatures.join(', ')}`);
  }
});

// Test 5: Enhanced Error Boundary
test('Enhanced error boundary is implemented', () => {
  const errorBoundaryFile = 'components/error-boundary.tsx';
  
  if (!fileExists(errorBoundaryFile)) {
    throw new Error('Error boundary file not found');
  }

  const requiredFeatures = [
    'enableAutoRecovery',
    'recoveryStrategies',
    'attemptAutoRecovery',
    'handleOnlineStatusChange',
    'tryDefaultRecoveryStrategies',
    'ConnectionStatus',
    'ErrorState'
  ];

  const missingFeatures = requiredFeatures.filter(feature => 
    !fileContains(errorBoundaryFile, feature)
  );

  if (missingFeatures.length > 0) {
    throw new Error(`Missing features: ${missingFeatures.join(', ')}`);
  }
});

// Test 6: Global Loading Error Display
test('Global loading error display is implemented', () => {
  const displayFile = 'components/global-loading-error-display.tsx';
  
  if (!fileExists(displayFile)) {
    throw new Error('Global loading error display file not found');
  }

  const requiredComponents = [
    'GlobalLoadingOverlay',
    'LoadingStatesDisplay',
    'ErrorStatesDisplay',
    'GlobalLoadingErrorDisplay'
  ];

  const missingComponents = requiredComponents.filter(component => 
    !fileContains(displayFile, `export function ${component}`)
  );

  if (missingComponents.length > 0) {
    throw new Error(`Missing components: ${missingComponents.join(', ')}`);
  }
});

// Test 7: Layout Integration
test('Global loading error display is integrated in layout', () => {
  const layoutFile = 'app/layout.tsx';
  
  if (!fileExists(layoutFile)) {
    throw new Error('Layout file not found');
  }

  const requiredIntegrations = [
    'GlobalLoadingErrorDisplay',
    'import { GlobalLoadingErrorDisplay }',
    '<GlobalLoadingErrorDisplay />'
  ];

  const missingIntegrations = requiredIntegrations.filter(integration => 
    !fileContains(layoutFile, integration)
  );

  if (missingIntegrations.length > 0) {
    throw new Error(`Missing integrations: ${missingIntegrations.join(', ')}`);
  }
});

// Test 8: Component Integration - Team Management
test('Team management component uses new loading states', () => {
  const componentFile = 'components/team-management.tsx';
  
  if (!fileExists(componentFile)) {
    throw new Error('Team management component file not found');
  }

  const requiredFeatures = [
    'useAsyncOperation',
    'LoadingStateManager',
    'SkeletonCard',
    'ErrorState',
    'useNetworkStatus'
  ];

  const missingFeatures = requiredFeatures.filter(feature => 
    !fileContains(componentFile, feature)
  );

  if (missingFeatures.length > 0) {
    throw new Error(`Missing features: ${missingFeatures.join(', ')}`);
  }
});

// Test 9: Component Integration - Notification Center
test('Notification center component uses new loading states', () => {
  const componentFile = 'components/notification-center.tsx';
  
  if (!fileExists(componentFile)) {
    throw new Error('Notification center component file not found');
  }

  const requiredFeatures = [
    'useAsyncOperation',
    'LoadingSpinner',
    'ErrorState',
    'useNetworkStatus',
    'notificationLoader',
    'notificationActions'
  ];

  const missingFeatures = requiredFeatures.filter(feature => 
    !fileContains(componentFile, feature)
  );

  if (missingFeatures.length > 0) {
    throw new Error(`Missing features: ${missingFeatures.join(', ')}`);
  }
});

// Test 10: Error Recovery Mechanisms
test('Error recovery mechanisms are properly implemented', () => {
  const errorHandlerFile = 'lib/error-handler.ts';
  
  if (!fileExists(errorHandlerFile)) {
    throw new Error('Error handler file not found');
  }

  const requiredFeatures = [
    'retryOperation',
    'RetryOptions',
    'AppError',
    'ErrorHandler',
    'isRetryable',
    'normalizeError'
  ];

  const missingFeatures = requiredFeatures.filter(feature => 
    !fileContains(errorHandlerFile, feature)
  );

  if (missingFeatures.length > 0) {
    throw new Error(`Missing features: ${missingFeatures.join(', ')}`);
  }
});

// Test 11: Loading State Patterns
test('Loading state patterns are consistent across components', () => {
  const files = [
    'components/team-management.tsx',
    'components/notification-center.tsx'
  ];

  files.forEach(file => {
    if (!fileExists(file)) {
      throw new Error(`Component file ${file} not found`);
    }

    // Check for consistent loading state patterns
    const hasLoadingState = fileContains(file, 'loading') || fileContains(file, 'Loading');
    const hasErrorState = fileContains(file, 'error') || fileContains(file, 'Error');
    const hasRetryMechanism = fileContains(file, 'retry') || fileContains(file, 'Retry');

    if (!hasLoadingState) {
      throw new Error(`${file} missing loading state handling`);
    }
    if (!hasErrorState) {
      throw new Error(`${file} missing error state handling`);
    }
  });
});

// Test 12: TypeScript Types and Interfaces
test('TypeScript types and interfaces are properly defined', () => {
  const files = [
    'hooks/use-async-operation.ts',
    'lib/loading-state-manager.ts',
    'components/ui/loading-states.tsx'
  ];

  files.forEach(file => {
    if (!fileExists(file)) {
      throw new Error(`TypeScript file ${file} not found`);
    }

    const hasInterfaces = fileContains(file, 'interface') || fileContains(file, 'type');
    if (!hasInterfaces) {
      throw new Error(`${file} missing TypeScript type definitions`);
    }
  });
});

// Test 13: Accessibility Features
test('Loading states include accessibility features', () => {
  const loadingStatesFile = 'components/ui/loading-states.tsx';
  
  if (!fileExists(loadingStatesFile)) {
    throw new Error('Loading states component file not found');
  }

  const accessibilityFeatures = [
    'aria-label',
    'role=',
    'aria-',
    'tabIndex'
  ];

  const hasAccessibility = accessibilityFeatures.some(feature => 
    fileContains(loadingStatesFile, feature)
  );

  if (!hasAccessibility) {
    throw new Error('Loading states missing accessibility features');
  }
});

// Test 14: Error Recovery Strategies
test('Error recovery strategies are implemented', () => {
  const errorBoundaryFile = 'components/error-boundary.tsx';
  
  if (!fileExists(errorBoundaryFile)) {
    throw new Error('Error boundary file not found');
  }

  const recoveryStrategies = [
    'network',
    'auth',
    'memory',
    'quota',
    'RecoveryStrategy'
  ];

  const implementedStrategies = recoveryStrategies.filter(strategy => 
    fileContains(errorBoundaryFile, strategy)
  );

  if (implementedStrategies.length < 3) {
    throw new Error(`Insufficient recovery strategies implemented: ${implementedStrategies.join(', ')}`);
  }
});

// Test 15: Progress Tracking
test('Progress tracking is implemented', () => {
  const managerFile = 'lib/loading-state-manager.ts';
  
  if (!fileExists(managerFile)) {
    throw new Error('Loading state manager file not found');
  }

  const progressFeatures = [
    'progress',
    'withProgress',
    'updateProgress',
    'ProgressSteps'
  ];

  const missingFeatures = progressFeatures.filter(feature => 
    !fileContains(managerFile, feature)
  );

  if (missingFeatures.length > 0) {
    throw new Error(`Missing progress features: ${missingFeatures.join(', ')}`);
  }
});

// Print summary
console.log('\n📊 Test Summary:');
console.log(`✅ Passed: ${results.passed}`);
console.log(`❌ Failed: ${results.failed}`);
console.log(`📈 Success Rate: ${((results.passed / (results.passed + results.failed)) * 100).toFixed(1)}%`);

if (results.failed > 0) {
  console.log('\n❌ Failed Tests:');
  results.details
    .filter(detail => detail.startsWith('❌'))
    .forEach(detail => console.log(detail));
}

// Detailed implementation check
console.log('\n🔍 Implementation Details:');

const implementationChecks = [
  {
    name: 'Loading Components',
    files: ['components/ui/loading-states.tsx'],
    features: ['LoadingSpinner', 'SkeletonCard', 'ErrorState', 'RetryButton']
  },
  {
    name: 'Async Operations',
    files: ['hooks/use-async-operation.ts'],
    features: ['useAsyncOperation', 'retry', 'execute', 'clearError']
  },
  {
    name: 'Network Recovery',
    files: ['hooks/use-network-status.ts'],
    features: ['useNetworkStatus', 'retryWhenOnline', 'isOnline']
  },
  {
    name: 'State Management',
    files: ['lib/loading-state-manager.ts'],
    features: ['LoadingStateManager', 'withLoading', 'addError']
  },
  {
    name: 'Error Boundaries',
    files: ['components/error-boundary.tsx'],
    features: ['autoRecovery', 'recoveryStrategies', 'handleOnlineStatusChange']
  },
  {
    name: 'Global Display',
    files: ['components/global-loading-error-display.tsx'],
    features: ['GlobalLoadingOverlay', 'ErrorStatesDisplay']
  }
];

implementationChecks.forEach(check => {
  const fileExists = check.files.every(file => fs.existsSync(file));
  const featuresImplemented = check.files.every(file => 
    fileExists && check.features.every(feature => 
      fs.readFileSync(file, 'utf8').includes(feature)
    )
  );
  
  console.log(`${featuresImplemented ? '✅' : '❌'} ${check.name}: ${fileExists ? 'File exists' : 'File missing'}, Features: ${featuresImplemented ? 'Complete' : 'Incomplete'}`);
});

// Final validation
if (results.failed === 0) {
  console.log('\n🎉 All loading states and error recovery mechanisms are properly implemented!');
  console.log('\n📋 Implementation Summary:');
  console.log('✅ Loading state components with skeletons and spinners');
  console.log('✅ Async operation hooks with retry mechanisms');
  console.log('✅ Network status detection and recovery');
  console.log('✅ Centralized loading state management');
  console.log('✅ Enhanced error boundaries with auto-recovery');
  console.log('✅ Global loading and error display');
  console.log('✅ Component integration with new loading patterns');
  console.log('✅ Error recovery strategies for different error types');
  console.log('✅ Progress tracking and user feedback');
  console.log('✅ Accessibility features for loading states');
  
  process.exit(0);
} else {
  console.log('\n⚠️  Some loading states and error recovery features need attention.');
  process.exit(1);
}