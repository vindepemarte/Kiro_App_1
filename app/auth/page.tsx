"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Brain, ArrowLeft, AlertCircle, Eye, EyeOff } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { authService } from "@/lib/auth"
import { handleAuthError, showSuccess } from "@/lib/error-handler"

function AuthPageContent() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)
  const [isClient, setIsClient] = useState(false)
  
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, loading } = useAuth()
  
  const mode = searchParams.get('mode') || 'login'
  const isSignUp = mode === 'signup'

  // Ensure client-side only rendering
  useEffect(() => {
    setIsClient(true)
  }, [])

  // Redirect if already authenticated
  useEffect(() => {
    if (user && !loading) {
      router.push("/dashboard")
    }
  }, [user, loading, router])

  // Show loading state during initial auth or client hydration
  if (!isClient || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  // Don't render if user is authenticated
  if (user) {
    return null
  }

  const handleEmailAuth = async (type: 'login' | 'signup') => {
    setIsLoading(true)
    setAuthError(null)

    // Basic validation
    if (!email || !password) {
      setAuthError('Please fill in all fields')
      setIsLoading(false)
      return
    }

    if (type === 'signup' && password !== confirmPassword) {
      setAuthError('Passwords do not match')
      setIsLoading(false)
      return
    }

    if (password.length < 6) {
      setAuthError('Password must be at least 6 characters')
      setIsLoading(false)
      return
    }

    try {
      if (type === 'signup') {
        await authService.createAccountWithEmail(email, password)
        showSuccess("Account created successfully!", "Welcome to MeetingAI")
      } else {
        await authService.signInWithEmail(email, password)
        showSuccess("Successfully signed in!", "Welcome back")
      }
      // Navigation will happen automatically via the user state change effect
    } catch (error) {
      const handledError = handleAuthError(error)
      setAuthError(handledError.userMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleAuth = async () => {
    setIsLoading(true)
    setAuthError(null)

    try {
      await authService.signInWithGoogle()
      showSuccess("Successfully signed in with Google!", "Welcome")
      // Navigation will happen automatically via the user state change effect
    } catch (error) {
      const handledError = handleAuthError(error)
      setAuthError(handledError.userMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAnonymousAuth = async () => {
    setIsLoading(true)
    setAuthError(null)

    try {
      await authService.signInAnonymously()
      showSuccess("Successfully signed in anonymously!", "Welcome")
      // Navigation will happen automatically via the user state change effect
    } catch (error) {
      const handledError = handleAuthError(error)
      setAuthError(handledError.userMessage)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Brain className="h-8 w-8 text-blue-600" />
            <span className="text-2xl font-bold text-gray-900">MeetingAI</span>
          </div>
          <Button variant="ghost" onClick={() => router.push('/')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Button>
        </div>
      </header>

      {/* Auth Form */}
      <div className="flex items-center justify-center min-h-[calc(100vh-80px)] px-4 py-12">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">
              {isSignUp ? 'Create Account' : 'Welcome Back'}
            </CardTitle>
            <CardDescription>
              {isSignUp 
                ? 'Sign up to start transforming your meetings with AI' 
                : 'Sign in to your MeetingAI account'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={isSignUp ? 'signup' : 'login'} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger 
                  value="login" 
                  onClick={() => router.push('/auth?mode=login')}
                >
                  Sign In
                </TabsTrigger>
                <TabsTrigger 
                  value="signup"
                  onClick={() => router.push('/auth?mode=signup')}
                >
                  Sign Up
                </TabsTrigger>
              </TabsList>

              <TabsContent value="login" className="space-y-4 mt-6">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={isLoading}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                      disabled={isLoading}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
                <Button 
                  className="w-full" 
                  onClick={() => handleEmailAuth('login')} 
                  disabled={isLoading}
                >
                  {isLoading ? "Signing In..." : "Sign In"}
                </Button>
              </TabsContent>

              <TabsContent value="signup" className="space-y-4 mt-6">
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <div className="relative">
                    <Input
                      id="signup-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Create a password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={isLoading}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                      disabled={isLoading}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm Password</Label>
                  <Input
                    id="confirm-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Confirm your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
                <Button 
                  className="w-full" 
                  onClick={() => handleEmailAuth('signup')} 
                  disabled={isLoading}
                >
                  {isLoading ? "Creating Account..." : "Create Account"}
                </Button>
              </TabsContent>
            </Tabs>

            {/* Error Display */}
            {authError && (
              <Alert variant="destructive" className="mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{authError}</AlertDescription>
              </Alert>
            )}

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-gray-500">Or continue with</span>
              </div>
            </div>

            {/* Social Auth */}
            <div className="space-y-3">
              <Button
                variant="outline"
                className="w-full"
                onClick={handleGoogleAuth}
                disabled={isLoading}
              >
                <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                {isLoading ? "Connecting..." : "Continue with Google"}
              </Button>

              <Button
                variant="outline"
                className="w-full"
                onClick={handleAnonymousAuth}
                disabled={isLoading}
              >
                {isLoading ? "Setting Up..." : "Continue Anonymously"}
              </Button>
            </div>

            {/* Terms */}
            <p className="text-xs text-gray-500 text-center mt-6">
              By continuing, you agree to our Terms of Service and Privacy Policy.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function AuthPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading authentication...</p>
        </div>
      </div>
    }>
      <AuthPageContent />
    </Suspense>
  )
}