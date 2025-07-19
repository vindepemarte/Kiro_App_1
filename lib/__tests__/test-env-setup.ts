/**
 * Test Environment Setup
 * Configures environment variables and global variables for testing
 */

// Set up environment variables for testing
process.env.NEXT_PUBLIC_FIREBASE_API_KEY = 'AIzaSyDemoKey123456789abcdefghijklmnopqr'
process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN = 'meeting-ai-mvp.firebaseapp.com'
process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = 'meeting-ai-mvp'
process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET = 'meeting-ai-mvp.appspot.com'
process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID = '123456789012'
process.env.NEXT_PUBLIC_FIREBASE_APP_ID = '1:123456789012:web:abcdef123456789012345'
process.env.NEXT_PUBLIC_GEMINI_API_KEY = 'AIzaSyDemoGeminiKey123456789abcdefghijklmn'
process.env.NEXT_PUBLIC_GEMINI_MODEL = 'gemini-2.0-flash'
process.env.NEXT_PUBLIC_APP_ID = 'meeting-ai-mvp'

// Set up global variables for testing
global.__app_id = 'meeting-ai-mvp'
global.__firebase_config = {
  apiKey: 'AIzaSyDemoKey123456789abcdefghijklmnopqr',
  authDomain: 'meeting-ai-mvp.firebaseapp.com',
  projectId: 'meeting-ai-mvp',
  storageBucket: 'meeting-ai-mvp.appspot.com',
  messagingSenderId: '123456789012',
  appId: '1:123456789012:web:abcdef123456789012345'
}
global.__initial_auth_token = undefined

// Mock File class for Node.js environment
if (typeof File === 'undefined') {
  global.File = class MockFile {
    name: string
    size: number
    type: string
    lastModified: number
    content: string

    constructor(content: string[] | string, name: string, options: { type?: string } = {}) {
      this.name = name
      this.content = Array.isArray(content) ? content.join('') : content
      this.size = this.content.length
      this.type = options.type || 'text/plain'
      this.lastModified = Date.now()
    }

    text(): Promise<string> {
      return Promise.resolve(this.content)
    }

    arrayBuffer(): Promise<ArrayBuffer> {
      const encoder = new TextEncoder()
      return Promise.resolve(encoder.encode(this.content).buffer)
    }
  } as any
}

// Mock FileReader for Node.js environment
if (typeof FileReader === 'undefined') {
  global.FileReader = class MockFileReader {
    result: string | null = null
    error: Error | null = null
    readyState: number = 0
    onload: ((event: any) => void) | null = null
    onerror: ((event: any) => void) | null = null

    readAsText(file: any) {
      setTimeout(() => {
        this.readyState = 2
        this.result = file.content || ''
        if (this.onload) {
          this.onload({ target: this })
        }
      }, 0)
    }
  } as any
}

export {}