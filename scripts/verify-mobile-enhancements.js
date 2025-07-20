#!/usr/bin/env node

/**
 * Mobile Enhancement Verification Script
 * Comprehensive testing and optimization verification for mobile interfaces
 */

const fs = require('fs')
const path = require('path')

// ANSI color codes for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
}

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

function logSection(title) {
  log(`\n${colors.bold}=== ${title} ===${colors.reset}`)
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green')
}

function logError(message) {
  log(`❌ ${message}`, 'red')
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow')
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue')
}

// Device size configurations for testing
const DEVICE_SIZES = {
  mobile: {
    small: { width: 320, height: 568, name: 'iPhone SE' },
    medium: { width: 375, height: 667, name: 'iPhone 8' },
    large: { width: 414, height: 896, name: 'iPhone 11 Pro Max' },
  },
  tablet: {
    portrait: { width: 768, height: 1024, name: 'iPad Portrait' },
    landscape: { width: 1024, height: 768, name: 'iPad Landscape' },
  },
  desktop: {
    small: { width: 1280, height: 720, name: 'Small Laptop' },
    medium: { width: 1920, height: 1080, name: 'Full HD' },
    large: { width: 2560, height: 1440, name: '2K Display' },
    xl: { width: 3840, height: 2160, name: '4K Display' },
  }
}

// Touch target requirements
const TOUCH_TARGET = {
  MINIMUM: 44, // iOS/Android minimum
  RECOMMENDED: 48, // Material Design recommendation
  SPACING: 8 // Minimum spacing between targets
}

class MobileEnhancementVerifier {
  constructor() {
    this.results = {
      responsive: { passed: 0, failed: 0, tests: [] },
      touchTargets: { passed: 0, failed: 0, tests: [] },
      accessibility: { passed: 0, failed: 0, tests: [] },
      performance: { passed: 0, failed: 0, tests: [] },
      teamCollaboration: { passed: 0, failed: 0, tests: [] }
    }
  }

  // Verify responsive design implementation
  verifyResponsiveDesign() {
    logSection('Responsive Design Verification')
    
    const responsiveFiles = [
      'components/responsive-navigation.tsx',
      'components/ui/mobile-card.tsx',
      'components/ui/responsive-grid.tsx',
      'hooks/use-mobile.tsx'
    ]

    responsiveFiles.forEach(file => {
      const filePath = path.join(process.cwd(), file)
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8')
        
        // Check for responsive breakpoints
        const hasBreakpoints = content.includes('md:') && content.includes('lg:')
        if (hasBreakpoints) {
          logSuccess(`${file} implements responsive breakpoints`)
          this.results.responsive.passed++
        } else {
          logError(`${file} missing responsive breakpoints`)
          this.results.responsive.failed++
        }
        
        // Check for mobile-first approach
        const hasMobileFirst = content.includes('grid-cols-1') || content.includes('flex-col')
        if (hasMobileFirst) {
          logSuccess(`${file} uses mobile-first approach`)
          this.results.responsive.passed++
        } else {
          logWarning(`${file} may not be mobile-first`)
          this.results.responsive.failed++
        }
        
        this.results.responsive.tests.push({
          file,
          breakpoints: hasBreakpoints,
          mobileFirst: hasMobileFirst
        })
      } else {
        logError(`Missing responsive file: ${file}`)
        this.results.responsive.failed++
      }
    })
  }

  // Verify touch target implementations
  verifyTouchTargets() {
    logSection('Touch Target Verification')
    
    const componentFiles = [
      'components/responsive-navigation.tsx',
      'components/task-assignment-dropdown.tsx',
      'components/ui/mobile-card.tsx'
    ]

    componentFiles.forEach(file => {
      const filePath = path.join(process.cwd(), file)
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8')
        
        // Check for minimum touch target sizes
        const hasMinHeight = content.includes('min-h-[44px]') || content.includes('h-12') || content.includes('h-14')
        const hasMinWidth = content.includes('min-w-[44px]') || content.includes('w-12') || content.includes('w-14')
        
        if (hasMinHeight && hasMinWidth) {
          logSuccess(`${file} implements proper touch target sizes`)
          this.results.touchTargets.passed++
        } else {
          logError(`${file} missing proper touch target sizes`)
          this.results.touchTargets.failed++
        }
        
        // Check for touch-friendly spacing
        const hasSpacing = content.includes('space-x-') || content.includes('gap-') || content.includes('p-')
        if (hasSpacing) {
          logSuccess(`${file} implements touch-friendly spacing`)
          this.results.touchTargets.passed++
        } else {
          logWarning(`${file} may lack adequate touch spacing`)
          this.results.touchTargets.failed++
        }
        
        this.results.touchTargets.tests.push({
          file,
          minHeight: hasMinHeight,
          minWidth: hasMinWidth,
          spacing: hasSpacing
        })
      }
    })
  }

  // Verify accessibility implementations
  verifyAccessibility() {
    logSection('Accessibility Verification')
    
    const accessibilityFiles = [
      'components/responsive-navigation.tsx',
      'components/notification-center.tsx',
      'components/task-assignment-dropdown.tsx'
    ]

    accessibilityFiles.forEach(file => {
      const filePath = path.join(process.cwd(), file)
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8')
        
        // Check for ARIA labels
        const hasAriaLabels = content.includes('aria-label') || content.includes('aria-labelledby')
        if (hasAriaLabels) {
          logSuccess(`${file} implements ARIA labels`)
          this.results.accessibility.passed++
        } else {
          logError(`${file} missing ARIA labels`)
          this.results.accessibility.failed++
        }
        
        // Check for keyboard navigation support
        const hasKeyboardSupport = content.includes('onKeyDown') || content.includes('tabIndex')
        if (hasKeyboardSupport) {
          logSuccess(`${file} supports keyboard navigation`)
          this.results.accessibility.passed++
        } else {
          logWarning(`${file} may lack keyboard navigation`)
          this.results.accessibility.failed++
        }
        
        // Check for focus management
        const hasFocusManagement = content.includes('focus') || content.includes('Focus')
        if (hasFocusManagement) {
          logSuccess(`${file} implements focus management`)
          this.results.accessibility.passed++
        } else {
          logWarning(`${file} may lack focus management`)
          this.results.accessibility.failed++
        }
        
        this.results.accessibility.tests.push({
          file,
          ariaLabels: hasAriaLabels,
          keyboardSupport: hasKeyboardSupport,
          focusManagement: hasFocusManagement
        })
      }
    })
  }

  // Verify performance optimizations
  verifyPerformanceOptimizations() {
    logSection('Performance Optimization Verification')
    
    // Check for performance utilities
    const performanceFile = 'lib/mobile-performance.ts'
    const performanceFilePath = path.join(process.cwd(), performanceFile)
    
    if (fs.existsSync(performanceFilePath)) {
      const content = fs.readFileSync(performanceFilePath, 'utf8')
      
      // Check for debounce implementation
      const hasDebounce = content.includes('useDebounce')
      if (hasDebounce) {
        logSuccess('Debounce utility implemented for performance')
        this.results.performance.passed++
      } else {
        logError('Missing debounce utility')
        this.results.performance.failed++
      }
      
      // Check for throttle implementation
      const hasThrottle = content.includes('useThrottle')
      if (hasThrottle) {
        logSuccess('Throttle utility implemented for performance')
        this.results.performance.passed++
      } else {
        logError('Missing throttle utility')
        this.results.performance.failed++
      }
      
      // Check for lazy loading
      const hasLazyLoading = content.includes('useIntersectionObserver') || content.includes('useLazyImage')
      if (hasLazyLoading) {
        logSuccess('Lazy loading utilities implemented')
        this.results.performance.passed++
      } else {
        logError('Missing lazy loading utilities')
        this.results.performance.failed++
      }
      
      // Check for memory monitoring
      const hasMemoryMonitoring = content.includes('useMemoryMonitor')
      if (hasMemoryMonitoring) {
        logSuccess('Memory monitoring implemented')
        this.results.performance.passed++
      } else {
        logWarning('Memory monitoring not implemented')
        this.results.performance.failed++
      }
      
      this.results.performance.tests.push({
        file: performanceFile,
        debounce: hasDebounce,
        throttle: hasThrottle,
        lazyLoading: hasLazyLoading,
        memoryMonitoring: hasMemoryMonitoring
      })
    } else {
      logError(`Missing performance optimization file: ${performanceFile}`)
      this.results.performance.failed++
    }
  }

  // Verify team collaboration mobile features
  verifyTeamCollaborationMobile() {
    logSection('Team Collaboration Mobile Features Verification')
    
    const teamFiles = [
      'components/team-management.tsx',
      'components/task-assignment-dropdown.tsx',
      'components/notification-center.tsx'
    ]

    teamFiles.forEach(file => {
      const filePath = path.join(process.cwd(), file)
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8')
        
        // Check for mobile-optimized layouts
        const hasMobileLayout = content.includes('md:') || content.includes('lg:') || content.includes('sm:')
        if (hasMobileLayout) {
          logSuccess(`${file} implements mobile-optimized layout`)
          this.results.teamCollaboration.passed++
        } else {
          logError(`${file} missing mobile-optimized layout`)
          this.results.teamCollaboration.failed++
        }
        
        // Check for touch-friendly interactions
        const hasTouchInteractions = content.includes('onClick') && (content.includes('min-h-') || content.includes('h-12'))
        if (hasTouchInteractions) {
          logSuccess(`${file} implements touch-friendly interactions`)
          this.results.teamCollaboration.passed++
        } else {
          logWarning(`${file} may lack touch-friendly interactions`)
          this.results.teamCollaboration.failed++
        }
        
        this.results.teamCollaboration.tests.push({
          file,
          mobileLayout: hasMobileLayout,
          touchInteractions: hasTouchInteractions
        })
      } else {
        logWarning(`Team collaboration file not found: ${file}`)
        this.results.teamCollaboration.failed++
      }
    })
  }

  // Verify test coverage
  verifyTestCoverage() {
    logSection('Test Coverage Verification')
    
    const testFiles = [
      'lib/__tests__/mobile-comprehensive.test.tsx',
      'lib/__tests__/accessibility-mobile.test.tsx',
      'lib/__tests__/responsive-components.test.tsx'
    ]

    let testCoverage = 0
    testFiles.forEach(file => {
      const filePath = path.join(process.cwd(), file)
      if (fs.existsSync(filePath)) {
        logSuccess(`Test file exists: ${file}`)
        testCoverage++
      } else {
        logError(`Missing test file: ${file}`)
      }
    })

    if (testCoverage === testFiles.length) {
      logSuccess('All mobile test files are present')
    } else {
      logError(`Missing ${testFiles.length - testCoverage} test files`)
    }
  }

  // Generate comprehensive report
  generateReport() {
    logSection('Mobile Enhancement Verification Report')
    
    const categories = Object.keys(this.results)
    let totalPassed = 0
    let totalFailed = 0
    
    categories.forEach(category => {
      const result = this.results[category]
      totalPassed += result.passed
      totalFailed += result.failed
      
      const total = result.passed + result.failed
      const percentage = total > 0 ? Math.round((result.passed / total) * 100) : 0
      
      log(`\n${category.toUpperCase()}:`)
      log(`  Passed: ${result.passed}`)
      log(`  Failed: ${result.failed}`)
      log(`  Success Rate: ${percentage}%`, percentage >= 80 ? 'green' : percentage >= 60 ? 'yellow' : 'red')
    })
    
    const overallTotal = totalPassed + totalFailed
    const overallPercentage = overallTotal > 0 ? Math.round((totalPassed / overallTotal) * 100) : 0
    
    log(`\nOVERALL RESULTS:`)
    log(`  Total Passed: ${totalPassed}`)
    log(`  Total Failed: ${totalFailed}`)
    log(`  Overall Success Rate: ${overallPercentage}%`, overallPercentage >= 80 ? 'green' : overallPercentage >= 60 ? 'yellow' : 'red')
    
    // Recommendations
    log(`\nRECOMMENDATIONS:`)
    if (this.results.responsive.failed > 0) {
      logWarning('Improve responsive design implementation')
    }
    if (this.results.touchTargets.failed > 0) {
      logWarning('Ensure all interactive elements meet touch target requirements')
    }
    if (this.results.accessibility.failed > 0) {
      logWarning('Enhance accessibility features for better mobile experience')
    }
    if (this.results.performance.failed > 0) {
      logWarning('Implement performance optimizations for mobile devices')
    }
    if (this.results.teamCollaboration.failed > 0) {
      logWarning('Optimize team collaboration features for mobile interfaces')
    }
    
    if (overallPercentage >= 80) {
      logSuccess('Mobile enhancements are well implemented!')
    } else if (overallPercentage >= 60) {
      logWarning('Mobile enhancements need some improvements')
    } else {
      logError('Mobile enhancements require significant work')
    }
    
    return overallPercentage >= 80
  }

  // Run all verifications
  async run() {
    log(`${colors.bold}Mobile Enhancement Verification${colors.reset}`)
    log('Verifying responsive design, touch targets, accessibility, and performance...\n')
    
    this.verifyResponsiveDesign()
    this.verifyTouchTargets()
    this.verifyAccessibility()
    this.verifyPerformanceOptimizations()
    this.verifyTeamCollaborationMobile()
    this.verifyTestCoverage()
    
    const success = this.generateReport()
    
    if (success) {
      log('\n🎉 Mobile enhancement verification completed successfully!', 'green')
      process.exit(0)
    } else {
      log('\n❌ Mobile enhancement verification failed. Please address the issues above.', 'red')
      process.exit(1)
    }
  }
}

// Run the verification
if (require.main === module) {
  const verifier = new MobileEnhancementVerifier()
  verifier.run().catch(error => {
    logError(`Verification failed: ${error.message}`)
    process.exit(1)
  })
}

module.exports = MobileEnhancementVerifier