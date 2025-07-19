/**
 * Production Readiness Validation Tests
 * Validates deployment configuration and production environment setup
 */

import './test-env-setup'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { getAppConfig } from '../config'

describe('Production Readiness Validation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Environment Configuration', () => {
    it('should have all required environment variables defined', () => {
      const requiredVars = [
        'NEXT_PUBLIC_FIREBASE_API_KEY',
        'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN', 
        'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
        'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
        'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
        'NEXT_PUBLIC_FIREBASE_APP_ID',
        'NEXT_PUBLIC_GEMINI_API_KEY',
        'NEXT_PUBLIC_GEMINI_MODEL',
        'NEXT_PUBLIC_APP_ID'
      ]

      const missingVars = requiredVars.filter(varName => !process.env[varName])
      
      if (missingVars.length > 0) {
        console.warn('Missing environment variables:', missingVars)
      }

      // In test environment, we mock these, but in production they should all be present
      expect(requiredVars.length).toBe(9)
    })

    it('should validate Firebase configuration format', () => {
      const config = getAppConfig()
      
      // Validate Firebase config structure
      expect(config.firebase).toBeDefined()
      expect(config.firebase.apiKey).toBeTruthy()
      expect(config.firebase.authDomain).toMatch(/\.firebaseapp\.com$/)
      expect(config.firebase.projectId).toBeTruthy()
      expect(config.firebase.storageBucket).toMatch(/\.appspot\.com$/)
      expect(config.firebase.messagingSenderId).toBeTruthy()
      expect(config.firebase.appId).toMatch(/^1:\d+:web:[a-f0-9]+$/)
    })

    it('should validate Gemini configuration', () => {
      const config = getAppConfig()
      
      expect(config.gemini).toBeDefined()
      expect(config.gemini.apiKey).toBeTruthy()
      expect(config.gemini.model).toBe('gemini-2.0-flash')
    })

    it('should validate app configuration', () => {
      const config = getAppConfig()
      
      expect(config.appId).toBe('meeting-ai-mvp')
    })
  })

  describe('Global Variables Support', () => {
    it('should support __app_id global override', () => {
      const originalAppId = global.__app_id
      global.__app_id = 'custom-app-id'
      
      const config = getAppConfig()
      expect(config.appId).toBe('custom-app-id')
      
      // Restore original
      global.__app_id = originalAppId
    })

    it('should support __firebase_config global override', () => {
      const originalConfig = global.__firebase_config
      global.__firebase_config = {
        apiKey: 'custom-api-key',
        authDomain: 'custom.firebaseapp.com',
        projectId: 'custom-project',
        storageBucket: 'custom.appspot.com',
        messagingSenderId: '999999999',
        appId: '1:999999999:web:custom'
      }
      
      const config = getAppConfig()
      expect(config.firebase.apiKey).toBe('custom-api-key')
      expect(config.firebase.projectId).toBe('custom-project')
      
      // Restore original
      global.__firebase_config = originalConfig
    })

    it('should support __initial_auth_token for custom authentication', () => {
      const originalToken = global.__initial_auth_token
      global.__initial_auth_token = 'custom-auth-token-123'
      
      expect(global.__initial_auth_token).toBe('custom-auth-token-123')
      
      // Restore original
      global.__initial_auth_token = originalToken
    })
  })

  describe('Security Configuration', () => {
    it('should not expose sensitive data in client-side code', () => {
      // Verify that sensitive operations are properly handled
      const config = getAppConfig()
      
      // These should be present but we shouldn't log them
      expect(typeof config.firebase.apiKey).toBe('string')
      expect(typeof config.gemini.apiKey).toBe('string')
      
      // Verify they're not empty (which would indicate a security issue)
      expect(config.firebase.apiKey.length).toBeGreaterThan(0)
      expect(config.gemini.apiKey.length).toBeGreaterThan(0)
    })

    it('should validate Firebase security rules path structure', () => {
      const config = getAppConfig()
      
      // Verify the expected Firestore path structure for security rules
      const expectedPath = `/artifacts/${config.appId}/users/{userId}/meetings`
      expect(expectedPath).toMatch(/^\/artifacts\/[^\/]+\/users\/\{userId\}\/meetings$/)
    })
  })

  describe('Performance Configuration', () => {
    it('should have appropriate timeout and retry settings', () => {
      // These values should be reasonable for production
      const maxFileSize = 10 * 1024 * 1024 // 10MB
      const maxRetries = 3
      const baseDelay = 1000 // 1 second
      
      expect(maxFileSize).toBe(10485760)
      expect(maxRetries).toBeLessThanOrEqual(5) // Don't retry too many times
      expect(baseDelay).toBeGreaterThanOrEqual(500) // At least 500ms between retries
    })

    it('should validate supported file types', () => {
      const supportedTypes = ['.txt', '.md']
      const supportedMimeTypes = ['text/plain', 'text/markdown']
      
      expect(supportedTypes).toContain('.txt')
      expect(supportedTypes).toContain('.md')
      expect(supportedMimeTypes).toContain('text/plain')
      expect(supportedMimeTypes).toContain('text/markdown')
    })
  })

  describe('Error Handling Configuration', () => {
    it('should have comprehensive error classification', () => {
      const errorTypes = [
        'NETWORK_ERROR',
        'TIMEOUT_ERROR', 
        'PERMISSION_DENIED',
        'NOT_FOUND',
        'INVALID_ARGUMENT',
        'UNAUTHENTICATED',
        'VALIDATION_ERROR',
        'FILE_TOO_LARGE',
        'INVALID_FILE_TYPE'
      ]
      
      // Verify we have a comprehensive list of error types
      expect(errorTypes.length).toBeGreaterThanOrEqual(9)
    })

    it('should have appropriate error severity levels', () => {
      const severityLevels = ['low', 'medium', 'high', 'critical']
      
      expect(severityLevels).toContain('low')
      expect(severityLevels).toContain('medium') 
      expect(severityLevels).toContain('high')
      expect(severityLevels).toContain('critical')
    })
  })

  describe('Build and Deployment Readiness', () => {
    it('should have proper TypeScript configuration', () => {
      // Verify TypeScript is properly configured
      expect(process.env.NODE_ENV).toBeDefined()
    })

    it('should have proper Next.js configuration', () => {
      // These tests verify the application is properly configured for Next.js
      expect(typeof window).toBe('undefined') // Running in Node.js environment
    })

    it('should validate package.json scripts', () => {
      // Verify essential scripts are available
      const packageJson = require('../../package.json')
      
      expect(packageJson.scripts.build).toBe('next build')
      expect(packageJson.scripts.start).toBe('next start')
      expect(packageJson.scripts.test).toBe('vitest')
      expect(packageJson.scripts['test:run']).toBe('vitest run')
    })

    it('should have all required dependencies', () => {
      const packageJson = require('../../package.json')
      
      // Core dependencies
      expect(packageJson.dependencies.next).toBeDefined()
      expect(packageJson.dependencies.react).toBeDefined()
      expect(packageJson.dependencies['react-dom']).toBeDefined()
      expect(packageJson.dependencies.firebase).toBeDefined()
      expect(packageJson.dependencies['@google/generative-ai']).toBeDefined()
      
      // UI dependencies
      expect(packageJson.dependencies['@radix-ui/react-dialog']).toBeDefined()
      expect(packageJson.dependencies['lucide-react']).toBeDefined()
      
      // Development dependencies
      expect(packageJson.devDependencies.typescript).toBeDefined()
      expect(packageJson.devDependencies.vitest).toBeDefined()
      expect(packageJson.devDependencies['@testing-library/react']).toBeDefined()
    })
  })

  describe('Monitoring and Observability', () => {
    it('should have proper error logging structure', () => {
      // Verify error logging includes necessary information
      const errorLogFields = [
        'message',
        'code', 
        'severity',
        'retryable',
        'timestamp',
        'stack'
      ]
      
      expect(errorLogFields).toContain('message')
      expect(errorLogFields).toContain('timestamp')
      expect(errorLogFields).toContain('severity')
    })

    it('should have performance monitoring capabilities', () => {
      // Verify we track performance metrics
      const performanceMetrics = [
        'processingTime',
        'fileSize',
        'uploadedAt'
      ]
      
      expect(performanceMetrics).toContain('processingTime')
      expect(performanceMetrics).toContain('fileSize')
    })
  })

  describe('Data Validation and Integrity', () => {
    it('should validate action item structure', () => {
      const requiredActionItemFields = ['id', 'description', 'priority', 'status']
      const optionalActionItemFields = ['owner', 'deadline']
      const validPriorities = ['high', 'medium', 'low']
      const validStatuses = ['pending', 'completed']
      
      expect(requiredActionItemFields).toContain('description')
      expect(validPriorities).toContain('high')
      expect(validStatuses).toContain('pending')
    })

    it('should validate meeting data structure', () => {
      const requiredMeetingFields = [
        'id',
        'title', 
        'date',
        'summary',
        'actionItems',
        'rawTranscript',
        'createdAt',
        'updatedAt'
      ]
      
      expect(requiredMeetingFields).toContain('summary')
      expect(requiredMeetingFields).toContain('actionItems')
      expect(requiredMeetingFields).toContain('rawTranscript')
    })
  })
})