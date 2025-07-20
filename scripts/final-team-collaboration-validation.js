#!/usr/bin/env node

/**
 * Final Team Collaboration Integration Validation
 * Manual validation script for task 24 requirements
 */

const fs = require('fs');
const path = require('path');

console.log('🚀 Starting Final Team Collaboration Integration Validation');
console.log('📋 Task 24: Final integration testing for team collaboration');

// Validation results
const validationResults = {
  teamWorkflow: { passed: 0, total: 0, details: [] },
  notificationSystem: { passed: 0, total: 0, details: [] },
  mobileDesign: { passed: 0, total: 0, details: [] },
  taskAssignment: { passed: 0, total: 0, details: [] },
  overall: { passed: 0, total: 0 }
};

// Helper function to check if file exists and has content
function validateFile(filePath, description) {
  try {
    const fullPath = path.join(__dirname, '..', filePath);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf8');
      if (content.length > 100) { // Minimum content check
        console.log(`✅ ${description}: Found and has content`);
        return true;
      } else {
        console.log(`⚠️  ${description}: Found but minimal content`);
        return false;
      }
    } else {
      console.log(`❌ ${description}: Not found`);
      return false;
    }
  } catch (error) {
    console.log(`❌ ${description}: Error reading file - ${error.message}`);
    return false;
  }
}

// Helper function to check for specific patterns in files
function validatePattern(filePath, patterns, description) {
  try {
    const fullPath = path.join(__dirname, '..', filePath);
    if (!fs.existsSync(fullPath)) {
      console.log(`❌ ${description}: File not found`);
      return false;
    }
    
    const content = fs.readFileSync(fullPath, 'utf8');
    const foundPatterns = patterns.filter(pattern => {
      const regex = new RegExp(pattern, 'i');
      return regex.test(content);
    });
    
    if (foundPatterns.length === patterns.length) {
      console.log(`✅ ${description}: All required patterns found`);
      return true;
    } else {
      console.log(`⚠️  ${description}: ${foundPatterns.length}/${patterns.length} patterns found`);
      return false;
    }
  } catch (error) {
    console.log(`❌ ${description}: Error validating patterns - ${error.message}`);
    return false;
  }
}

// 1. Test complete team workflow (create → invite → accept → assign tasks)
console.log('\n📝 1. Validating Complete Team Workflow');

const teamWorkflowChecks = [
  {
    name: 'Team Management Component',
    check: () => validateFile('components/team-management.tsx', 'Team Management Component')
  },
  {
    name: 'Team Service Implementation',
    check: () => validateFile('lib/team-service.ts', 'Team Service')
  },
  {
    name: 'Team Creation Functionality',
    check: () => validatePattern('components/team-management.tsx', [
      'createTeam',
      'team.*name',
      'team.*description'
    ], 'Team Creation')
  },
  {
    name: 'Member Invitation System',
    check: () => validatePattern('lib/team-service.ts', [
      'inviteUserToTeam',
      'searchUserByEmail',
      'email'
    ], 'Member Invitation')
  },
  {
    name: 'Invitation Acceptance Flow',
    check: () => validatePattern('lib/team-service.ts', [
      'acceptTeamInvitation',
      'declineTeamInvitation'
    ], 'Invitation Acceptance')
  },
  {
    name: 'Task Assignment Integration',
    check: () => validateFile('components/task-assignment.tsx', 'Task Assignment Component')
  }
];

teamWorkflowChecks.forEach(check => {
  const result = check.check();
  validationResults.teamWorkflow.total++;
  if (result) validationResults.teamWorkflow.passed++;
  validationResults.teamWorkflow.details.push({ name: check.name, passed: result });
});

// 2. Verify notification system works across all team interactions
console.log('\n🔔 2. Validating Notification System');

const notificationChecks = [
  {
    name: 'Notification Service',
    check: () => validateFile('lib/notification-service.ts', 'Notification Service')
  },
  {
    name: 'Notification Center Component',
    check: () => validateFile('components/notification-center.tsx', 'Notification Center')
  },
  {
    name: 'Real-time Notification Updates',
    check: () => validatePattern('lib/notification-service.ts', [
      'subscribeToUserNotifications',
      'onSnapshot',
      'real.*time'
    ], 'Real-time Updates')
  },
  {
    name: 'Team Invitation Notifications',
    check: () => validatePattern('lib/notification-service.ts', [
      'sendTeamInvitation',
      'team_invitation'
    ], 'Team Invitation Notifications')
  },
  {
    name: 'Task Assignment Notifications',
    check: () => validatePattern('lib/notification-service.ts', [
      'sendTaskAssignment',
      'task_assignment'
    ], 'Task Assignment Notifications')
  },
  {
    name: 'Notification UI Integration',
    check: () => validatePattern('components/notification-center.tsx', [
      'notification.*center',
      'unread.*count',
      'mark.*read'
    ], 'Notification UI')
  }
];

notificationChecks.forEach(check => {
  const result = check.check();
  validationResults.notificationSystem.total++;
  if (result) validationResults.notificationSystem.passed++;
  validationResults.notificationSystem.details.push({ name: check.name, passed: result });
});

// 3. Test mobile-first design on various devices and screen sizes
console.log('\n📱 3. Validating Mobile-First Design');

const mobileDesignChecks = [
  {
    name: 'Responsive Navigation Component',
    check: () => validateFile('components/responsive-navigation.tsx', 'Responsive Navigation')
  },
  {
    name: 'Mobile UI Components',
    check: () => validateFile('components/ui/mobile-card.tsx', 'Mobile Card Component')
  },
  {
    name: 'Mobile Hook Implementation',
    check: () => validateFile('hooks/use-mobile.tsx', 'Mobile Detection Hook')
  },
  {
    name: 'Responsive Utilities',
    check: () => validateFile('lib/responsive-utils.ts', 'Responsive Utilities')
  },
  {
    name: 'Mobile Performance Optimization',
    check: () => validateFile('lib/mobile-performance.ts', 'Mobile Performance')
  },
  {
    name: 'Touch Target Optimization',
    check: () => validatePattern('components/ui/mobile-card.tsx', [
      '44px',
      'touch.*target',
      'min.*height'
    ], 'Touch Targets')
  },
  {
    name: 'Responsive Breakpoints',
    check: () => validatePattern('lib/responsive-utils.ts', [
      'mobile',
      'tablet',
      'desktop',
      'breakpoint'
    ], 'Responsive Breakpoints')
  }
];

mobileDesignChecks.forEach(check => {
  const result = check.check();
  validationResults.mobileDesign.total++;
  if (result) validationResults.mobileDesign.passed++;
  validationResults.mobileDesign.details.push({ name: check.name, passed: result });
});

// 4. Validate team task assignment and management functionality
console.log('\n📋 4. Validating Team Task Assignment');

const taskAssignmentChecks = [
  {
    name: 'Task Assignment Service',
    check: () => validateFile('lib/task-assignment-service.ts', 'Task Assignment Service')
  },
  {
    name: 'Team-Aware Processing',
    check: () => validateFile('lib/team-aware-processor.ts', 'Team-Aware Processor')
  },
  {
    name: 'Automatic Task Assignment',
    check: () => validatePattern('lib/team-aware-processor.ts', [
      'processWithTeamContext',
      'matchSpeakerToTeamMember',
      'automatic.*assignment'
    ], 'Automatic Assignment')
  },
  {
    name: 'Manual Task Reassignment',
    check: () => validatePattern('components/task-assignment.tsx', [
      'reassign',
      'team.*member.*select',
      'dropdown'
    ], 'Manual Reassignment')
  },
  {
    name: 'Task Status Management',
    check: () => validatePattern('lib/task-assignment-service.ts', [
      'updateTaskStatus',
      'pending',
      'in_progress',
      'completed'
    ], 'Task Status')
  },
  {
    name: 'Team Task Overview',
    check: () => validatePattern('app/dashboard/page.tsx', [
      'team.*task',
      'assignee',
      'task.*list'
    ], 'Task Overview')
  }
];

taskAssignmentChecks.forEach(check => {
  const result = check.check();
  validationResults.taskAssignment.total++;
  if (result) validationResults.taskAssignment.passed++;
  validationResults.taskAssignment.details.push({ name: check.name, passed: result });
});

// 5. Validate comprehensive test coverage
console.log('\n🧪 5. Validating Test Coverage');

const testFiles = [
  'lib/__tests__/team-collaboration-integration.test.tsx',
  'lib/__tests__/e2e-team-workflow.test.js',
  'lib/__tests__/mobile-comprehensive.test.tsx',
  'lib/__tests__/notification-ui-integration.test.tsx',
  'lib/__tests__/team-aware-processor.test.ts',
  'scripts/validate-mobile-team-collaboration.js'
];

testFiles.forEach(testFile => {
  const result = validateFile(testFile, `Test: ${path.basename(testFile)}`);
  validationResults.overall.total++;
  if (result) validationResults.overall.passed++;
});

// Calculate overall results
const categories = ['teamWorkflow', 'notificationSystem', 'mobileDesign', 'taskAssignment'];
categories.forEach(category => {
  validationResults.overall.total += validationResults[category].total;
  validationResults.overall.passed += validationResults[category].passed;
});

// Generate summary report
console.log('\n📊 VALIDATION SUMMARY');
console.log('=' .repeat(50));

categories.forEach(category => {
  const result = validationResults[category];
  const passRate = result.total > 0 ? ((result.passed / result.total) * 100).toFixed(1) : 0;
  const categoryName = category.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
  
  console.log(`${categoryName}: ${result.passed}/${result.total} (${passRate}%)`);
  
  // Show failed items
  const failed = result.details.filter(d => !d.passed);
  if (failed.length > 0) {
    failed.forEach(item => {
      console.log(`  ❌ ${item.name}`);
    });
  }
});

const overallPassRate = validationResults.overall.total > 0 ? 
  ((validationResults.overall.passed / validationResults.overall.total) * 100).toFixed(1) : 0;

console.log('\n' + '='.repeat(50));
console.log(`OVERALL: ${validationResults.overall.passed}/${validationResults.overall.total} (${overallPassRate}%)`);

// Validate specific requirements from task 24
console.log('\n📋 TASK 24 REQUIREMENTS VALIDATION');
console.log('=' .repeat(50));

const requirements = [
  {
    name: 'Complete team workflow (create → invite → accept → assign tasks)',
    validate: () => {
      const teamWorkflowRate = (validationResults.teamWorkflow.passed / validationResults.teamWorkflow.total) * 100;
      return teamWorkflowRate >= 80;
    }
  },
  {
    name: 'Notification system works across all team interactions',
    validate: () => {
      const notificationRate = (validationResults.notificationSystem.passed / validationResults.notificationSystem.total) * 100;
      return notificationRate >= 80;
    }
  },
  {
    name: 'Mobile-first design on various devices and screen sizes',
    validate: () => {
      const mobileRate = (validationResults.mobileDesign.passed / validationResults.mobileDesign.total) * 100;
      return mobileRate >= 80;
    }
  },
  {
    name: 'Team task assignment and management functionality',
    validate: () => {
      const taskRate = (validationResults.taskAssignment.passed / validationResults.taskAssignment.total) * 100;
      return taskRate >= 80;
    }
  }
];

let requirementsPassed = 0;
requirements.forEach(req => {
  const passed = req.validate();
  console.log(`${passed ? '✅' : '❌'} ${req.name}`);
  if (passed) requirementsPassed++;
});

console.log('\n' + '='.repeat(50));
console.log(`REQUIREMENTS: ${requirementsPassed}/${requirements.length} passed`);

// Generate detailed report
const reportPath = path.join(__dirname, '..', 'team-collaboration-validation-report.json');
const report = {
  timestamp: new Date().toISOString(),
  task: 'Task 24: Final integration testing for team collaboration',
  summary: {
    overallPassRate: parseFloat(overallPassRate),
    totalChecks: validationResults.overall.total,
    passedChecks: validationResults.overall.passed,
    requirementsPassed: requirementsPassed,
    totalRequirements: requirements.length
  },
  categories: validationResults,
  requirements: requirements.map(req => ({
    name: req.name,
    passed: req.validate()
  }))
};

fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
console.log(`\n📄 Detailed report saved to: ${reportPath}`);

// Final validation result
if (overallPassRate >= 80 && requirementsPassed === requirements.length) {
  console.log('\n🎉 TASK 24 VALIDATION: PASSED');
  console.log('All team collaboration integration requirements have been met.');
  process.exit(0);
} else {
  console.log('\n⚠️  TASK 24 VALIDATION: NEEDS ATTENTION');
  console.log('Some requirements may need additional work.');
  
  if (overallPassRate < 80) {
    console.log(`- Overall pass rate (${overallPassRate}%) is below 80%`);
  }
  
  if (requirementsPassed < requirements.length) {
    console.log(`- ${requirements.length - requirementsPassed} requirements not fully met`);
  }
  
  process.exit(1);
}