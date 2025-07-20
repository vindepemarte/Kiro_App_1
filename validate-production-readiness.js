#!/usr/bin/env node

// Production readiness validation script
// Validates that all monitoring and logging systems are properly configured

const fs = require('fs');
const path = require('path');

console.log('🔍 Validating Production Readiness...\n');

const results = {
  passed: 0,
  failed: 0,
  warnings: 0,
  details: []
};

function checkPassed(message) {
  console.log(`✅ ${message}`);
  results.passed++;
  results.details.push({ type: 'pass', message });
}

function checkFailed(message) {
  console.log(`❌ ${message}`);
  results.failed++;
  results.details.push({ type: 'fail', message });
}

function checkWarning(message) {
  console.log(`⚠️  ${message}`);
  results.warnings++;
  results.details.push({ type: 'warning', message });
}

// Check if monitoring files exist
console.log('📁 Checking monitoring service files...');

const monitoringFiles = [
  'lib/logger.ts',
  'lib/performance-monitor.ts',
  'lib/error-tracker.ts',
  'lib/health-monitor.ts',
  'components/production-monitor.tsx',
  'app/api/health/route.ts'
];

monitoringFiles.forEach(file => {
  if (fs.existsSync(file)) {
    checkPassed(`Monitoring file exists: ${file}`);
  } else {
    checkFailed(`Missing monitoring file: ${file}`);
  }
});

// Check environment configuration
console.log('\n🔧 Checking environment configuration...');

const envFile = '.env.local';
const envTemplate = '.env.template';

if (fs.existsSync(envTemplate)) {
  checkPassed('Environment template exists');
} else {
  checkWarning('No environment template found');
}

// Check package.json for monitoring dependencies
console.log('\n📦 Checking package dependencies...');

try {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  
  // Check for required dependencies
  const requiredDeps = [
    '@radix-ui/react-tabs',
    '@radix-ui/react-alert',
    'lucide-react'
  ];
  
  requiredDeps.forEach(dep => {
    if (packageJson.dependencies[dep] || packageJson.devDependencies[dep]) {
      checkPassed(`Required dependency found: ${dep}`);
    } else {
      checkWarning(`Optional dependency missing: ${dep}`);
    }
  });
  
} catch (error) {
  checkFailed('Could not read package.json');
}

// Check TypeScript configuration
console.log('\n📝 Checking TypeScript configuration...');

if (fs.existsSync('tsconfig.json')) {
  checkPassed('TypeScript configuration exists');
  
  try {
    const tsConfig = JSON.parse(fs.readFileSync('tsconfig.json', 'utf8'));
    if (tsConfig.compilerOptions && tsConfig.compilerOptions.strict) {
      checkPassed('Strict TypeScript mode enabled');
    } else {
      checkWarning('Consider enabling strict TypeScript mode for better error catching');
    }
  } catch (error) {
    checkWarning('Could not parse tsconfig.json');
  }
} else {
  checkFailed('TypeScript configuration missing');
}

// Check test files
console.log('\n🧪 Checking test coverage...');

const testFiles = [
  'lib/__tests__/production-monitoring.test.ts'
];

testFiles.forEach(file => {
  if (fs.existsSync(file)) {
    checkPassed(`Test file exists: ${file}`);
  } else {
    checkWarning(`Test file missing: ${file}`);
  }
});

// Check build configuration
console.log('\n🏗️  Checking build configuration...');

if (fs.existsSync('next.config.mjs')) {
  checkPassed('Next.js configuration exists');
} else {
  checkWarning('Next.js configuration missing');
}

if (fs.existsSync('scripts/inject-env.js')) {
  checkPassed('Environment injection script exists');
} else {
  checkFailed('Environment injection script missing');
}

// Check monitoring integration in existing files
console.log('\n🔗 Checking monitoring integration...');

try {
  const errorHandlerContent = fs.readFileSync('lib/error-handler.ts', 'utf8');
  
  if (errorHandlerContent.includes('integrateWithMonitoring')) {
    checkPassed('Error handler integrated with monitoring');
  } else {
    checkWarning('Error handler may not be fully integrated with monitoring');
  }
  
  if (errorHandlerContent.includes('getErrorTracker') && errorHandlerContent.includes('getLogger')) {
    checkPassed('Error handler imports monitoring services');
  } else {
    checkWarning('Error handler may be missing monitoring service imports');
  }
  
} catch (error) {
  checkWarning('Could not verify error handler integration');
}

// Check API health endpoint
console.log('\n🏥 Checking health endpoint...');

const healthEndpoint = 'app/api/health/route.ts';
if (fs.existsSync(healthEndpoint)) {
  checkPassed('Health API endpoint exists');
  
  try {
    const healthContent = fs.readFileSync(healthEndpoint, 'utf8');
    if (healthContent.includes('GET') && healthContent.includes('HEAD')) {
      checkPassed('Health endpoint supports GET and HEAD methods');
    } else {
      checkWarning('Health endpoint may not support all required methods');
    }
  } catch (error) {
    checkWarning('Could not verify health endpoint implementation');
  }
} else {
  checkFailed('Health API endpoint missing');
}

// Check production monitoring component
console.log('\n📊 Checking monitoring dashboard...');

const monitoringComponent = 'components/production-monitor.tsx';
if (fs.existsSync(monitoringComponent)) {
  checkPassed('Production monitoring dashboard exists');
  
  try {
    const componentContent = fs.readFileSync(monitoringComponent, 'utf8');
    if (componentContent.includes('SystemHealth') && componentContent.includes('PerformanceReport')) {
      checkPassed('Monitoring dashboard includes health and performance data');
    } else {
      checkWarning('Monitoring dashboard may be incomplete');
    }
  } catch (error) {
    checkWarning('Could not verify monitoring dashboard implementation');
  }
} else {
  checkFailed('Production monitoring dashboard missing');
}

// Security checks
console.log('\n🔒 Checking security configuration...');

if (fs.existsSync('firestore.rules')) {
  checkPassed('Firestore security rules exist');
} else {
  checkWarning('Firestore security rules missing');
}

// Check for sensitive data exposure
const sensitivePatterns = [
  /api[_-]?key\s*[:=]\s*['"][^'"]{10,}['"]/i,
  /secret\s*[:=]\s*['"][^'"]{10,}['"]/i,
  /password\s*[:=]\s*['"][^'"]{5,}['"]/i
];

const filesToCheck = ['lib/config.ts', 'scripts/inject-env.js'];
filesToCheck.forEach(file => {
  if (fs.existsSync(file)) {
    const content = fs.readFileSync(file, 'utf8');
    let foundSensitive = false;
    
    sensitivePatterns.forEach(pattern => {
      if (pattern.test(content)) {
        foundSensitive = true;
      }
    });
    
    if (foundSensitive) {
      checkWarning(`Potential sensitive data in ${file} - ensure proper environment variable usage`);
    } else {
      checkPassed(`No hardcoded sensitive data found in ${file}`);
    }
  }
});

// Performance checks
console.log('\n⚡ Checking performance configuration...');

try {
  const nextConfig = fs.readFileSync('next.config.mjs', 'utf8');
  if (nextConfig.includes('compress') || nextConfig.includes('optimization')) {
    checkPassed('Next.js performance optimizations configured');
  } else {
    checkWarning('Consider adding performance optimizations to Next.js config');
  }
} catch (error) {
  checkWarning('Could not verify Next.js performance configuration');
}

// Final summary
console.log('\n📋 Production Readiness Summary');
console.log('================================');
console.log(`✅ Passed: ${results.passed}`);
console.log(`❌ Failed: ${results.failed}`);
console.log(`⚠️  Warnings: ${results.warnings}`);

const totalChecks = results.passed + results.failed + results.warnings;
const successRate = totalChecks > 0 ? (results.passed / totalChecks * 100).toFixed(1) : 0;

console.log(`\n📊 Success Rate: ${successRate}%`);

if (results.failed === 0) {
  console.log('\n🎉 Production readiness validation PASSED!');
  console.log('Your application is ready for production deployment.');
  
  if (results.warnings > 0) {
    console.log('\n💡 Consider addressing the warnings above for optimal production performance.');
  }
} else {
  console.log('\n🚨 Production readiness validation FAILED!');
  console.log('Please address the failed checks before deploying to production.');
}

// Generate detailed report
const report = {
  timestamp: new Date().toISOString(),
  summary: {
    passed: results.passed,
    failed: results.failed,
    warnings: results.warnings,
    successRate: parseFloat(successRate)
  },
  details: results.details,
  recommendations: []
};

// Add recommendations based on results
if (results.failed > 0) {
  report.recommendations.push('Address all failed checks before production deployment');
}

if (results.warnings > 5) {
  report.recommendations.push('Consider addressing warnings to improve production stability');
}

if (results.passed < 10) {
  report.recommendations.push('Implement additional monitoring and logging features');
}

// Write report to file
fs.writeFileSync('production-readiness-report.json', JSON.stringify(report, null, 2));
console.log('\n📄 Detailed report saved to: production-readiness-report.json');

// Exit with appropriate code
process.exit(results.failed > 0 ? 1 : 0);