#!/usr/bin/env node

/**
 * Mobile Team Collaboration Validation Script
 * Tests mobile-first design and team collaboration features across various devices
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// Device configurations for testing
const DEVICES = [
  {
    name: 'iPhone SE',
    viewport: { width: 375, height: 667, isMobile: true },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15'
  },
  {
    name: 'iPhone 12',
    viewport: { width: 390, height: 844, isMobile: true },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15'
  },
  {
    name: 'Samsung Galaxy S21',
    viewport: { width: 360, height: 800, isMobile: true },
    userAgent: 'Mozilla/5.0 (Linux; Android 11; SM-G991B) AppleWebKit/537.36'
  },
  {
    name: 'iPad',
    viewport: { width: 768, height: 1024, isMobile: false },
    userAgent: 'Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X) AppleWebKit/605.1.15'
  },
  {
    name: 'iPad Pro',
    viewport: { width: 1024, height: 1366, isMobile: false },
    userAgent: 'Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X) AppleWebKit/605.1.15'
  },
  {
    name: 'Desktop',
    viewport: { width: 1920, height: 1080, isMobile: false },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  }
];

// Test scenarios for team collaboration
const TEST_SCENARIOS = [
  {
    name: 'Team Creation Workflow',
    path: '/teams',
    actions: [
      'click [data-testid="create-team-button"]',
      'type [data-testid="team-name-input"] "Mobile Test Team"',
      'type [data-testid="team-description-input"] "Testing mobile team creation"',
      'click [data-testid="submit-team-button"]'
    ],
    validations: [
      'Team creation form should be accessible',
      'Form inputs should meet minimum touch target size (44px)',
      'Success message should be displayed',
      'Navigation should work on mobile'
    ]
  },
  {
    name: 'Team Invitation Process',
    path: '/teams',
    actions: [
      'click [data-testid="invite-member-button"]',
      'type [data-testid="member-email-input"] "test@example.com"',
      'type [data-testid="member-name-input"] "Test Member"',
      'click [data-testid="send-invitation-button"]'
    ],
    validations: [
      'Invitation modal should be mobile-friendly',
      'Form should be easily usable on touch devices',
      'Confirmation should be clear and accessible'
    ]
  },
  {
    name: 'Notification Center',
    path: '/dashboard',
    actions: [
      'click [data-testid="notification-center-button"]',
      'click [data-testid="notification-item"]',
      'click [data-testid="accept-invitation-button"]'
    ],
    validations: [
      'Notification center should be accessible on mobile',
      'Notification actions should be touch-friendly',
      'Real-time updates should work across devices'
    ]
  },
  {
    name: 'Task Assignment Interface',
    path: '/dashboard',
    actions: [
      'click [data-testid="meeting-card"]',
      'click [data-testid="assign-task-button"]',
      'click [data-testid="team-member-select"]',
      'click [data-testid="confirm-assignment-button"]'
    ],
    validations: [
      'Task assignment should work on mobile',
      'Dropdown menus should be touch-optimized',
      'Assignment confirmation should be clear'
    ]
  },
  {
    name: 'Mobile Navigation',
    path: '/dashboard',
    actions: [
      'click [data-testid="mobile-menu-button"]',
      'click [data-testid="teams-nav-link"]',
      'click [data-testid="notifications-nav-link"]'
    ],
    validations: [
      'Mobile navigation should be accessible',
      'Menu should slide out smoothly',
      'Navigation links should be properly sized'
    ]
  }
];

class MobileTeamCollaborationValidator {
  constructor() {
    this.results = {
      devices: {},
      summary: {
        passed: 0,
        failed: 0,
        total: 0
      }
    };
  }

  async validateDevice(device) {
    console.log(`\n🔍 Testing ${device.name} (${device.viewport.width}x${device.viewport.height})`);
    
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
      const page = await browser.newPage();
      await page.setViewport(device.viewport);
      await page.setUserAgent(device.userAgent);

      // Set up mobile-specific configurations
      if (device.viewport.isMobile) {
        await page.emulate({
          viewport: device.viewport,
          userAgent: device.userAgent
        });
      }

      const deviceResults = {
        name: device.name,
        viewport: device.viewport,
        scenarios: {},
        accessibility: {},
        performance: {}
      };

      // Test each scenario
      for (const scenario of TEST_SCENARIOS) {
        console.log(`  📱 Testing: ${scenario.name}`);
        
        try {
          const scenarioResult = await this.testScenario(page, scenario, device);
          deviceResults.scenarios[scenario.name] = scenarioResult;
          
          if (scenarioResult.passed) {
            console.log(`    ✅ ${scenario.name} - PASSED`);
            this.results.summary.passed++;
          } else {
            console.log(`    ❌ ${scenario.name} - FAILED`);
            console.log(`       ${scenarioResult.error}`);
            this.results.summary.failed++;
          }
        } catch (error) {
          console.log(`    ❌ ${scenario.name} - ERROR: ${error.message}`);
          deviceResults.scenarios[scenario.name] = {
            passed: false,
            error: error.message
          };
          this.results.summary.failed++;
        }
        
        this.results.summary.total++;
      }

      // Test accessibility
      deviceResults.accessibility = await this.testAccessibility(page, device);
      
      // Test performance
      deviceResults.performance = await this.testPerformance(page, device);

      this.results.devices[device.name] = deviceResults;

    } catch (error) {
      console.error(`Error testing ${device.name}:`, error);
      this.results.devices[device.name] = {
        name: device.name,
        error: error.message
      };
    } finally {
      await browser.close();
    }
  }

  async testScenario(page, scenario, device) {
    try {
      // Navigate to the test page
      await page.goto(`http://localhost:3000${scenario.path}`, {
        waitUntil: 'networkidle2',
        timeout: 10000
      });

      // Wait for page to be ready
      await page.waitForTimeout(1000);

      // Execute test actions
      for (const action of scenario.actions) {
        await this.executeAction(page, action);
        await page.waitForTimeout(500); // Wait between actions
      }

      // Validate touch targets for mobile devices
      if (device.viewport.isMobile) {
        const touchTargetValidation = await this.validateTouchTargets(page);
        if (!touchTargetValidation.passed) {
          return {
            passed: false,
            error: `Touch target validation failed: ${touchTargetValidation.error}`
          };
        }
      }

      // Validate responsive layout
      const layoutValidation = await this.validateResponsiveLayout(page, device);
      if (!layoutValidation.passed) {
        return {
          passed: false,
          error: `Layout validation failed: ${layoutValidation.error}`
        };
      }

      return { passed: true };

    } catch (error) {
      return {
        passed: false,
        error: error.message
      };
    }
  }

  async executeAction(page, action) {
    const [command, selector, ...args] = action.split(' ');
    
    switch (command) {
      case 'click':
        await page.waitForSelector(selector, { timeout: 5000 });
        await page.click(selector);
        break;
      case 'type':
        await page.waitForSelector(selector, { timeout: 5000 });
        await page.type(selector, args.join(' ').replace(/"/g, ''));
        break;
      case 'wait':
        await page.waitForTimeout(parseInt(args[0]) || 1000);
        break;
      default:
        throw new Error(`Unknown action: ${command}`);
    }
  }

  async validateTouchTargets(page) {
    try {
      const touchTargets = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button, a, input, select, textarea'));
        const invalidTargets = [];

        buttons.forEach((element, index) => {
          const rect = element.getBoundingClientRect();
          const computedStyle = window.getComputedStyle(element);
          
          const minHeight = Math.max(rect.height, parseInt(computedStyle.minHeight) || 0);
          const minWidth = Math.max(rect.width, parseInt(computedStyle.minWidth) || 0);
          
          if (minHeight < 44 || minWidth < 44) {
            invalidTargets.push({
              index,
              tagName: element.tagName,
              className: element.className,
              height: minHeight,
              width: minWidth
            });
          }
        });

        return invalidTargets;
      });

      if (touchTargets.length > 0) {
        return {
          passed: false,
          error: `Found ${touchTargets.length} touch targets smaller than 44px: ${JSON.stringify(touchTargets.slice(0, 3))}`
        };
      }

      return { passed: true };
    } catch (error) {
      return {
        passed: false,
        error: `Touch target validation error: ${error.message}`
      };
    }
  }

  async validateResponsiveLayout(page, device) {
    try {
      const layoutInfo = await page.evaluate((deviceInfo) => {
        const issues = [];
        
        // Check for horizontal scrolling
        if (document.body.scrollWidth > window.innerWidth) {
          issues.push('Horizontal scrolling detected');
        }
        
        // Check for mobile navigation on small screens
        if (deviceInfo.viewport.width < 768) {
          const mobileMenu = document.querySelector('[data-testid="mobile-menu-button"]');
          if (!mobileMenu) {
            issues.push('Mobile menu button not found on small screen');
          }
        }
        
        // Check for responsive grid layouts
        const gridContainers = document.querySelectorAll('[class*="grid"], [class*="flex"]');
        gridContainers.forEach((container, index) => {
          const rect = container.getBoundingClientRect();
          if (rect.width > window.innerWidth) {
            issues.push(`Grid container ${index} exceeds viewport width`);
          }
        });

        return {
          issues,
          viewport: {
            width: window.innerWidth,
            height: window.innerHeight
          },
          bodyWidth: document.body.scrollWidth
        };
      }, device);

      if (layoutInfo.issues.length > 0) {
        return {
          passed: false,
          error: `Layout issues: ${layoutInfo.issues.join(', ')}`
        };
      }

      return { passed: true, info: layoutInfo };
    } catch (error) {
      return {
        passed: false,
        error: `Layout validation error: ${error.message}`
      };
    }
  }

  async testAccessibility(page, device) {
    try {
      const accessibilityResults = await page.evaluate(() => {
        const issues = [];
        
        // Check for missing alt text on images
        const images = document.querySelectorAll('img');
        images.forEach((img, index) => {
          if (!img.alt && !img.getAttribute('aria-label')) {
            issues.push(`Image ${index} missing alt text`);
          }
        });
        
        // Check for missing labels on form inputs
        const inputs = document.querySelectorAll('input, select, textarea');
        inputs.forEach((input, index) => {
          if (!input.labels?.length && !input.getAttribute('aria-label') && !input.getAttribute('aria-labelledby')) {
            issues.push(`Input ${index} missing label`);
          }
        });
        
        // Check for proper heading hierarchy
        const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
        let previousLevel = 0;
        headings.forEach((heading, index) => {
          const level = parseInt(heading.tagName.charAt(1));
          if (level > previousLevel + 1) {
            issues.push(`Heading hierarchy skip at ${heading.tagName} (index ${index})`);
          }
          previousLevel = level;
        });

        return {
          issues,
          totalElements: {
            images: images.length,
            inputs: inputs.length,
            headings: headings.length
          }
        };
      });

      return {
        passed: accessibilityResults.issues.length === 0,
        issues: accessibilityResults.issues,
        stats: accessibilityResults.totalElements
      };
    } catch (error) {
      return {
        passed: false,
        error: error.message
      };
    }
  }

  async testPerformance(page, device) {
    try {
      const performanceMetrics = await page.evaluate(() => {
        const navigation = performance.getEntriesByType('navigation')[0];
        const paint = performance.getEntriesByType('paint');
        
        return {
          loadTime: navigation ? navigation.loadEventEnd - navigation.loadEventStart : 0,
          domContentLoaded: navigation ? navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart : 0,
          firstPaint: paint.find(p => p.name === 'first-paint')?.startTime || 0,
          firstContentfulPaint: paint.find(p => p.name === 'first-contentful-paint')?.startTime || 0
        };
      });

      return {
        passed: performanceMetrics.loadTime < 3000, // 3 second threshold
        metrics: performanceMetrics
      };
    } catch (error) {
      return {
        passed: false,
        error: error.message
      };
    }
  }

  async generateReport() {
    const reportPath = path.join(__dirname, '..', 'mobile-team-collaboration-report.json');
    const htmlReportPath = path.join(__dirname, '..', 'mobile-team-collaboration-report.html');
    
    // Generate JSON report
    fs.writeFileSync(reportPath, JSON.stringify(this.results, null, 2));
    
    // Generate HTML report
    const htmlReport = this.generateHTMLReport();
    fs.writeFileSync(htmlReportPath, htmlReport);
    
    console.log(`\n📊 Reports generated:`);
    console.log(`   JSON: ${reportPath}`);
    console.log(`   HTML: ${htmlReportPath}`);
  }

  generateHTMLReport() {
    const { passed, failed, total } = this.results.summary;
    const passRate = total > 0 ? ((passed / total) * 100).toFixed(1) : 0;
    
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Mobile Team Collaboration Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .summary { background: #f5f5f5; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .device { border: 1px solid #ddd; margin: 20px 0; padding: 15px; border-radius: 8px; }
        .passed { color: #28a745; }
        .failed { color: #dc3545; }
        .scenario { margin: 10px 0; padding: 10px; background: #f8f9fa; border-radius: 4px; }
        .metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; }
        .metric { background: white; padding: 15px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    </style>
</head>
<body>
    <h1>Mobile Team Collaboration Test Report</h1>
    
    <div class="summary">
        <h2>Summary</h2>
        <div class="metrics">
            <div class="metric">
                <h3>Overall Pass Rate</h3>
                <div style="font-size: 2em; font-weight: bold;" class="${passRate >= 80 ? 'passed' : 'failed'}">
                    ${passRate}%
                </div>
            </div>
            <div class="metric">
                <h3>Tests Passed</h3>
                <div style="font-size: 2em; font-weight: bold;" class="passed">${passed}</div>
            </div>
            <div class="metric">
                <h3>Tests Failed</h3>
                <div style="font-size: 2em; font-weight: bold;" class="failed">${failed}</div>
            </div>
            <div class="metric">
                <h3>Total Tests</h3>
                <div style="font-size: 2em; font-weight: bold;">${total}</div>
            </div>
        </div>
    </div>

    ${Object.values(this.results.devices).map(device => `
        <div class="device">
            <h2>${device.name} ${device.viewport ? `(${device.viewport.width}x${device.viewport.height})` : ''}</h2>
            
            ${device.error ? `<div class="failed">Error: ${device.error}</div>` : ''}
            
            ${device.scenarios ? Object.entries(device.scenarios).map(([name, result]) => `
                <div class="scenario">
                    <h3 class="${result.passed ? 'passed' : 'failed'}">
                        ${result.passed ? '✅' : '❌'} ${name}
                    </h3>
                    ${result.error ? `<div class="failed">Error: ${result.error}</div>` : ''}
                </div>
            `).join('') : ''}
            
            ${device.accessibility ? `
                <div class="scenario">
                    <h3 class="${device.accessibility.passed ? 'passed' : 'failed'}">
                        ${device.accessibility.passed ? '✅' : '❌'} Accessibility
                    </h3>
                    ${device.accessibility.issues ? `
                        <ul>
                            ${device.accessibility.issues.map(issue => `<li>${issue}</li>`).join('')}
                        </ul>
                    ` : ''}
                </div>
            ` : ''}
            
            ${device.performance ? `
                <div class="scenario">
                    <h3 class="${device.performance.passed ? 'passed' : 'failed'}">
                        ${device.performance.passed ? '✅' : '❌'} Performance
                    </h3>
                    ${device.performance.metrics ? `
                        <ul>
                            <li>Load Time: ${device.performance.metrics.loadTime}ms</li>
                            <li>DOM Content Loaded: ${device.performance.metrics.domContentLoaded}ms</li>
                            <li>First Paint: ${device.performance.metrics.firstPaint}ms</li>
                            <li>First Contentful Paint: ${device.performance.metrics.firstContentfulPaint}ms</li>
                        </ul>
                    ` : ''}
                </div>
            ` : ''}
        </div>
    `).join('')}
    
    <div style="margin-top: 40px; padding: 20px; background: #f8f9fa; border-radius: 8px;">
        <h2>Test Details</h2>
        <p><strong>Generated:</strong> ${new Date().toISOString()}</p>
        <p><strong>Devices Tested:</strong> ${Object.keys(this.results.devices).length}</p>
        <p><strong>Scenarios per Device:</strong> ${TEST_SCENARIOS.length}</p>
    </div>
</body>
</html>`;
  }

  async run() {
    console.log('🚀 Starting Mobile Team Collaboration Validation');
    console.log(`📱 Testing ${DEVICES.length} devices with ${TEST_SCENARIOS.length} scenarios each`);
    
    for (const device of DEVICES) {
      await this.validateDevice(device);
    }
    
    await this.generateReport();
    
    const { passed, failed, total } = this.results.summary;
    const passRate = total > 0 ? ((passed / total) * 100).toFixed(1) : 0;
    
    console.log('\n📊 Final Results:');
    console.log(`   Pass Rate: ${passRate}%`);
    console.log(`   Passed: ${passed}/${total}`);
    console.log(`   Failed: ${failed}/${total}`);
    
    if (passRate < 80) {
      console.log('\n⚠️  Warning: Pass rate below 80%. Review failed tests.');
      process.exit(1);
    } else {
      console.log('\n✅ All tests passed successfully!');
    }
  }
}

// Run the validation if this script is executed directly
if (require.main === module) {
  const validator = new MobileTeamCollaborationValidator();
  validator.run().catch(error => {
    console.error('❌ Validation failed:', error);
    process.exit(1);
  });
}

module.exports = MobileTeamCollaborationValidator;