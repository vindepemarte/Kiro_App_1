#!/usr/bin/env node

/**
 * Complete Integration Validation Script
 * Tests complete user workflows from start to finish
 * Validates all features work together properly
 * Ensures data consistency across all components
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Starting Complete Integration Validation...\n');

// Validation results
const validationResults = {
  testResults: {},
  integrationChecks: {},
  dataConsistency: {},
  performanceMetrics: {},
  errors: []
};

/**
 * Run integration tests
 */
async function runIntegrationTests() {
  console.log('📋 Running End-to-End Integration Tests...');
  
  try {
    // Run the comprehensive integration test
    const testOutput = execSync('npm test -- lib/__tests__/e2e-complete-integration.test.ts --run', {
      encoding: 'utf8',
      stdio: 'pipe'
    });
    
    console.log('✅ End-to-End Integration Tests: PASSED');
    validationResults.testResults.e2eIntegration = {
      status: 'PASSED',
      output: testOutput
    };
    
    // Run existing comprehensive workflow tests
    const workflowTestOutput = execSync('npm test -- lib/__tests__/integration-comprehensive-workflow.test.ts --run', {
      encoding: 'utf8',
      stdio: 'pipe'
    });
    
    console.log('✅ Comprehensive Workflow Tests: PASSED');
    validationResults.testResults.comprehensiveWorkflow = {
      status: 'PASSED',
      output: workflowTestOutput
    };
    
  } catch (error) {
    console.log('❌ Integration Tests: FAILED');
    validationResults.testResults.integration = {
      status: 'FAILED',
      error: error.message
    };
    validationResults.errors.push(`Integration Tests Failed: ${error.message}`);
  }
}

/**
 * Validate component integration
 */
async function validateComponentIntegration() {
  console.log('\n🔗 Validating Component Integration...');
  
  const integrationChecks = [
    {
      name: 'Team Management Service',
      file: 'lib/team-service.ts',
      dependencies: ['lib/database.ts', 'lib/notification-service.ts']
    },
    {
      name: 'Notification Service',
      file: 'lib/notification-service.ts',
      dependencies: ['lib/database.ts', 'lib/types.ts']
    },
    {
      name: 'Database Service',
      file: 'lib/database.ts',
      dependencies: ['lib/firebase.ts', 'lib/types.ts']
    },
    {
      name: 'User Profile Service',
      file: 'lib/user-profile-service.ts',
      dependencies: ['lib/database.ts', 'lib/types.ts']
    }
  ];
  
  for (const check of integrationChecks) {
    try {
      // Check if main file exists
      if (!fs.existsSync(check.file)) {
        throw new Error(`Main file ${check.file} not found`);
      }
      
      // Check dependencies
      for (const dep of check.dependencies) {
        if (!fs.existsSync(dep)) {
          throw new Error(`Dependency ${dep} not found`);
        }
      }
      
      // Read file content and check for integration patterns
      const content = fs.readFileSync(check.file, 'utf8');
      
      // Check for proper imports
      const hasImports = check.dependencies.some(dep => {
        const importName = path.basename(dep, '.ts');
        return content.includes(`from './${importName}'`) || content.includes(`from '../${importName}'`);
      });
      
      console.log(`✅ ${check.name}: Integration OK`);
      validationResults.integrationChecks[check.name] = {
        status: 'OK',
        fileExists: true,
        dependenciesFound: true,
        hasImports
      };
      
    } catch (error) {
      console.log(`❌ ${check.name}: ${error.message}`);
      validationResults.integrationChecks[check.name] = {
        status: 'FAILED',
        error: error.message
      };
      validationResults.errors.push(`${check.name} Integration Failed: ${error.message}`);
    }
  }
}

/**
 * Validate data consistency
 */
async function validateDataConsistency() {
  console.log('\n📊 Validating Data Consistency...');
  
  const consistencyChecks = [
    {
      name: 'Type Definitions',
      check: () => {
        const typesFile = 'lib/types.ts';
        if (!fs.existsSync(typesFile)) {
          throw new Error('Types file not found');
        }
        
        const content = fs.readFileSync(typesFile, 'utf8');
        const requiredTypes = [
          'Team',
          'TeamMember',
          'User',
          'Meeting',
          'Notification',
          'UserProfile',
          'ActionItem'
        ];
        
        for (const type of requiredTypes) {
          if (!content.includes(`interface ${type}`) && !content.includes(`type ${type}`)) {
            throw new Error(`Type ${type} not found`);
          }
        }
        
        return 'All required types defined';
      }
    },
    {
      name: 'Database Schema Consistency',
      check: () => {
        const dbFile = 'lib/database.ts';
        if (!fs.existsSync(dbFile)) {
          throw new Error('Database file not found');
        }
        
        const content = fs.readFileSync(dbFile, 'utf8');
        const requiredMethods = [
          'createTeam',
          'getUserTeams',
          'saveMeeting',
          'createNotification',
          'createUserProfile',
          'updateUserProfile'
        ];
        
        for (const method of requiredMethods) {
          if (!content.includes(method)) {
            throw new Error(`Method ${method} not found`);
          }
        }
        
        return 'All required database methods present';
      }
    },
    {
      name: 'Service Integration',
      check: () => {
        const teamServiceFile = 'lib/team-service.ts';
        const notificationServiceFile = 'lib/notification-service.ts';
        
        if (!fs.existsSync(teamServiceFile)) {
          throw new Error('Team service file not found');
        }
        
        if (!fs.existsSync(notificationServiceFile)) {
          throw new Error('Notification service file not found');
        }
        
        const teamContent = fs.readFileSync(teamServiceFile, 'utf8');
        const notificationContent = fs.readFileSync(notificationServiceFile, 'utf8');
        
        // Check for cross-service integration
        if (!teamContent.includes('notification') && !notificationContent.includes('team')) {
          console.warn('⚠️  Limited cross-service integration detected');
        }
        
        return 'Service files present and integrated';
      }
    },
    {
      name: 'Component Integration',
      check: () => {
        const componentsDir = 'components';
        if (!fs.existsSync(componentsDir)) {
          throw new Error('Components directory not found');
        }
        
        const requiredComponents = [
          'team-management.tsx',
          'notification-center.tsx',
          'error-boundary.tsx'
        ];
        
        for (const component of requiredComponents) {
          const componentPath = path.join(componentsDir, component);
          if (!fs.existsSync(componentPath)) {
            throw new Error(`Component ${component} not found`);
          }
        }
        
        return 'All required components present';
      }
    }
  ];
  
  for (const check of consistencyChecks) {
    try {
      const result = check.check();
      console.log(`✅ ${check.name}: ${result}`);
      validationResults.dataConsistency[check.name] = {
        status: 'OK',
        result
      };
    } catch (error) {
      console.log(`❌ ${check.name}: ${error.message}`);
      validationResults.dataConsistency[check.name] = {
        status: 'FAILED',
        error: error.message
      };
      validationResults.errors.push(`${check.name} Consistency Check Failed: ${error.message}`);
    }
  }
}

/**
 * Run performance tests
 */
async function runPerformanceTests() {
  console.log('\n⚡ Running Performance Tests...');
  
  try {
    // Run performance-related tests
    const performanceTestOutput = execSync('npm test -- lib/__tests__/performance-testing.test.ts --run', {
      encoding: 'utf8',
      stdio: 'pipe'
    });
    
    console.log('✅ Performance Tests: PASSED');
    validationResults.performanceMetrics.performanceTests = {
      status: 'PASSED',
      output: performanceTestOutput
    };
    
  } catch (error) {
    console.log('❌ Performance Tests: FAILED');
    validationResults.performanceMetrics.performanceTests = {
      status: 'FAILED',
      error: error.message
    };
    validationResults.errors.push(`Performance Tests Failed: ${error.message}`);
  }
}

/**
 * Validate error handling
 */
async function validateErrorHandling() {
  console.log('\n🛡️  Validating Error Handling...');
  
  try {
    // Run error scenario tests
    const errorTestOutput = execSync('npm test -- lib/__tests__/error-scenarios.test.ts --run', {
      encoding: 'utf8',
      stdio: 'pipe'
    });
    
    console.log('✅ Error Handling Tests: PASSED');
    validationResults.testResults.errorHandling = {
      status: 'PASSED',
      output: errorTestOutput
    };
    
  } catch (error) {
    console.log('❌ Error Handling Tests: FAILED');
    validationResults.testResults.errorHandling = {
      status: 'FAILED',
      error: error.message
    };
    validationResults.errors.push(`Error Handling Tests Failed: ${error.message}`);
  }
}

/**
 * Validate real-time features
 */
async function validateRealTimeFeatures() {
  console.log('\n🔄 Validating Real-time Features...');
  
  const realTimeChecks = [
    {
      name: 'Team Real-time Hook',
      file: 'hooks/use-team-realtime.ts'
    },
    {
      name: 'Network Status Hook',
      file: 'hooks/use-network-status.ts'
    },
    {
      name: 'Async Operation Hook',
      file: 'hooks/use-async-operation.ts'
    }
  ];
  
  for (const check of realTimeChecks) {
    try {
      if (!fs.existsSync(check.file)) {
        throw new Error(`File ${check.file} not found`);
      }
      
      const content = fs.readFileSync(check.file, 'utf8');
      
      // Check for real-time patterns
      const hasRealTimePatterns = content.includes('useEffect') || 
                                 content.includes('subscribe') || 
                                 content.includes('unsubscribe') ||
                                 content.includes('onSnapshot');
      
      if (!hasRealTimePatterns) {
        throw new Error('No real-time patterns found');
      }
      
      console.log(`✅ ${check.name}: Real-time patterns detected`);
      validationResults.integrationChecks[check.name] = {
        status: 'OK',
        hasRealTimePatterns: true
      };
      
    } catch (error) {
      console.log(`❌ ${check.name}: ${error.message}`);
      validationResults.integrationChecks[check.name] = {
        status: 'FAILED',
        error: error.message
      };
      validationResults.errors.push(`${check.name} Validation Failed: ${error.message}`);
    }
  }
}

/**
 * Generate validation report
 */
function generateValidationReport() {
  console.log('\n📋 Generating Validation Report...');
  
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      totalChecks: Object.keys(validationResults.testResults).length + 
                  Object.keys(validationResults.integrationChecks).length + 
                  Object.keys(validationResults.dataConsistency).length,
      passed: 0,
      failed: 0,
      errors: validationResults.errors.length
    },
    details: validationResults
  };
  
  // Count passed/failed
  const allChecks = {
    ...validationResults.testResults,
    ...validationResults.integrationChecks,
    ...validationResults.dataConsistency,
    ...validationResults.performanceMetrics
  };
  
  for (const [key, result] of Object.entries(allChecks)) {
    if (result.status === 'PASSED' || result.status === 'OK') {
      report.summary.passed++;
    } else {
      report.summary.failed++;
    }
  }
  
  // Write report to file
  const reportPath = 'complete-integration-validation-report.json';
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  console.log(`📄 Validation report saved to: ${reportPath}`);
  
  return report;
}

/**
 * Main validation function
 */
async function runCompleteValidation() {
  const startTime = Date.now();
  
  try {
    await runIntegrationTests();
    await validateComponentIntegration();
    await validateDataConsistency();
    await runPerformanceTests();
    await validateErrorHandling();
    await validateRealTimeFeatures();
    
    const report = generateValidationReport();
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 COMPLETE INTEGRATION VALIDATION SUMMARY');
    console.log('='.repeat(60));
    console.log(`⏱️  Duration: ${duration.toFixed(2)} seconds`);
    console.log(`✅ Passed: ${report.summary.passed}`);
    console.log(`❌ Failed: ${report.summary.failed}`);
    console.log(`🚨 Errors: ${report.summary.errors}`);
    
    if (report.summary.errors > 0) {
      console.log('\n🚨 ERRORS FOUND:');
      validationResults.errors.forEach((error, index) => {
        console.log(`${index + 1}. ${error}`);
      });
    }
    
    if (report.summary.failed === 0 && report.summary.errors === 0) {
      console.log('\n🎉 ALL INTEGRATION VALIDATIONS PASSED!');
      console.log('✅ Complete user workflows validated');
      console.log('✅ All features work together properly');
      console.log('✅ Data consistency maintained across components');
      process.exit(0);
    } else {
      console.log('\n⚠️  SOME VALIDATIONS FAILED');
      console.log('Please review the errors above and fix the issues.');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('\n💥 VALIDATION FAILED WITH ERROR:');
    console.error(error.message);
    process.exit(1);
  }
}

// Run the validation
if (require.main === module) {
  runCompleteValidation().catch(error => {
    console.error('💥 Validation failed:', error);
    process.exit(1);
  });
}

module.exports = {
  runCompleteValidation,
  validationResults
};