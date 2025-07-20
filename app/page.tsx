"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Brain, Clock, Users, CheckCircle, ArrowRight, Zap, Shield, BarChart3, Menu } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import {
  handleAuthError,
  showSuccess
} from "@/lib/error-handler"
import { authService } from "@/lib/auth"
import { useMobile } from "@/hooks/use-mobile"
import { ResponsiveContainer } from "@/components/ui/responsive-grid"

export default function LandingPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)
  const [isClient, setIsClient] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const router = useRouter()
  const { user, loading, error, initializeAuth, reauthenticate } = useAuth()
  const isMobile = useMobile()

  // Ensure client-side only rendering to prevent hydration issues
  useEffect(() => {
    setIsClient(true)
  }, [])

  // Handle automatic navigation when user state changes
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
          <p className="text-gray-600">{!isClient ? "Loading..." : "Setting up your session..."}</p>
        </div>
      </div>
    )
  }

  // Show global auth error with retry option
  if (error && !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="mb-4">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.314 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Authentication Error</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={() => initializeAuth()} className="w-full">
              Try Again
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Don't render if user is authenticated (navigation will happen via useEffect)
  if (user) {
    return null
  }

  const handleAuth = async (type: "login" | "signup" | "anonymous") => {
    setIsLoading(true)
    setAuthError(null)

    try {
      if (type === "anonymous") {
        // Use anonymous authentication
        await reauthenticate()
        showSuccess("Successfully signed in anonymously", "Welcome!")
      } else {
        // For login/signup, we'll use anonymous auth for MVP
        // This follows requirement 1.3: IF __initial_auth_token is not available THEN authenticate using signInAnonymously
        await reauthenticate()
        showSuccess(`Successfully ${type === 'login' ? 'signed in' : 'created account'}`, "Welcome!")
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 md:py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Brain className={`text-blue-600 ${isMobile ? 'h-7 w-7' : 'h-8 w-8'}`} />
            <span className={`font-bold text-gray-900 ${isMobile ? 'text-xl' : 'text-2xl'}`}>MeetingAI</span>
            <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700 border-blue-200">
              Preview
            </Badge>
          </div>
          
          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-6">
            <a href="#features" className="text-gray-600 hover:text-gray-900 transition-colors">
              Features
            </a>
            <a href="#pricing" className="text-gray-600 hover:text-gray-900 transition-colors">
              Pricing
            </a>
            <Button variant="outline" onClick={() => router.push('/auth')}>
              Login
            </Button>
          </nav>

          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="sm"
            className="md:hidden h-10 w-10 p-0"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle mobile menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </div>

        {/* Mobile Navigation Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t bg-white">
            <nav className="container mx-auto px-4 py-4 space-y-4">
              <a 
                href="#features" 
                className="block text-gray-600 hover:text-gray-900 transition-colors py-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                Features
              </a>
              <a 
                href="#pricing" 
                className="block text-gray-600 hover:text-gray-900 transition-colors py-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                Pricing
              </a>
              <Button 
                variant="outline" 
                className="w-full h-12 mt-4"
                onClick={() => {
                  setMobileMenuOpen(false)
                  router.push('/auth')
                }}
              >
                Login
              </Button>
            </nav>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section className={`px-4 ${isMobile ? 'py-12' : 'py-20'}`}>
        <ResponsiveContainer maxWidth="2xl" padding={{ mobile: 4, tablet: 6, desktop: 8 }}>
          <div className="text-center">
            <Badge className="mb-4 bg-blue-100 text-blue-800 hover:bg-blue-100">
              <Zap className="h-4 w-4 mr-1" />
              Powered by AI
            </Badge>
            <h1 className={`font-bold text-gray-900 mb-6 leading-tight ${
              isMobile ? 'text-3xl' : 'text-5xl md:text-6xl'
            }`}>
              Transform Meetings into
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
                {" "}
                Actionable Tasks
              </span>
              <span className="block">with AI</span>
            </h1>
            <p className={`text-gray-600 mb-8 max-w-2xl mx-auto ${
              isMobile ? 'text-lg' : 'text-xl'
            }`}>
              Stop losing track of meeting decisions. Upload your transcripts and get instant summaries with clear action
              items, assigned owners, and suggested deadlines.
            </p>

            {/* Auth Section */}
            <Card className={`mx-auto mb-12 shadow-lg ${isMobile ? 'max-w-sm' : 'max-w-md'}`}>
            <CardHeader>
              <CardTitle>Get Started Today</CardTitle>
              <CardDescription>Join thousands of teams already using MeetingAI</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="signup" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="signup">Sign Up</TabsTrigger>
                  <TabsTrigger value="login">Login</TabsTrigger>
                </TabsList>
                <TabsContent value="signup" className="space-y-4">
                  <Input
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  <Input
                    type="password"
                    placeholder="Create password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <Button className="w-full" onClick={() => router.push('/auth?mode=signup')} disabled={isLoading}>
                    Create Account
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </TabsContent>
                <TabsContent value="login" className="space-y-4">
                  <Input
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  <Input
                    type="password"
                    placeholder="Enter password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <Button className="w-full" onClick={() => router.push('/auth')} disabled={isLoading}>
                    Sign In
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </TabsContent>
              </Tabs>
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
                  Continue with Google
                </Button>

                <Button
                  variant="outline"
                  className="w-full bg-transparent"
                  onClick={() => handleAuth("anonymous")}
                  disabled={isLoading}
                >
                  {isLoading ? "Setting Up..." : "Continue Anonymously"}
                </Button>
              </div>
              {authError && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm text-red-600">{authError}</p>
                  {authError.includes('configuration') && (
                    <p className="text-xs text-red-500 mt-1">
                      Please check your Firebase configuration in the environment variables.
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

            {/* Feature Highlights */}
            <div className={`grid gap-6 max-w-3xl mx-auto ${isMobile ? 'grid-cols-1' : 'md:grid-cols-3'}`}>
              <div className="text-center">
                <Clock className={`text-blue-600 mx-auto mb-4 ${isMobile ? 'h-10 w-10' : 'h-12 w-12'}`} />
                <h3 className={`font-semibold mb-2 ${isMobile ? 'text-base' : 'text-lg'}`}>Save Hours</h3>
                <p className={`text-gray-600 ${isMobile ? 'text-sm' : 'text-base'}`}>
                  Instantly process hour-long meetings into concise summaries
                </p>
              </div>
              <div className="text-center">
                <Users className={`text-purple-600 mx-auto mb-4 ${isMobile ? 'h-10 w-10' : 'h-12 w-12'}`} />
                <h3 className={`font-semibold mb-2 ${isMobile ? 'text-base' : 'text-lg'}`}>Boost Accountability</h3>
                <p className={`text-gray-600 ${isMobile ? 'text-sm' : 'text-base'}`}>
                  Clear action items with suggested owners and deadlines
                </p>
              </div>
              <div className="text-center">
                <CheckCircle className={`text-green-600 mx-auto mb-4 ${isMobile ? 'h-10 w-10' : 'h-12 w-12'}`} />
                <h3 className={`font-semibold mb-2 ${isMobile ? 'text-base' : 'text-lg'}`}>Never Miss a Task</h3>
                <p className={`text-gray-600 ${isMobile ? 'text-sm' : 'text-base'}`}>
                  Comprehensive tracking of all meeting outcomes
                </p>
              </div>
            </div>
          </div>
        </ResponsiveContainer>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Powerful Features</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Everything you need to turn chaotic meetings into organized action plans
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <Brain className="h-10 w-10 text-blue-600 mb-2" />
                <CardTitle>AI-Powered Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Advanced AI understands context and extracts meaningful insights from your meeting transcripts.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardHeader>
                <Shield className="h-10 w-10 text-green-600 mb-2" />
                <CardTitle>Secure & Private</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Your meeting data is encrypted and secure. We never share or sell your information.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardHeader>
                <BarChart3 className="h-10 w-10 text-purple-600 mb-2" />
                <CardTitle>Analytics Dashboard</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">Track meeting productivity and action item completion rates over time.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Simple, Transparent Pricing</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Get started with MeetingAI completely free during our preview period
            </p>
          </div>

          <div className="max-w-4xl mx-auto">
            <Card className="border-0 shadow-xl bg-white relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-blue-600 to-purple-600"></div>
              <CardHeader className="text-center pb-8 pt-8">
                <div className="flex items-center justify-center space-x-2 mb-4">
                  <Badge className="bg-green-100 text-green-800 px-4 py-2 text-sm font-semibold">
                    🎉 Preview Access - FREE
                  </Badge>
                </div>
                <CardTitle className="text-3xl font-bold text-gray-900 mb-2">
                  Everything Included
                </CardTitle>
                <CardDescription className="text-lg text-gray-600">
                  Full access to all features while we're in preview mode
                </CardDescription>
              </CardHeader>
              <CardContent className="px-8 pb-8">
                <div className="grid md:grid-cols-2 gap-8">
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-4">✨ What's Included:</h4>
                    <ul className="space-y-3 text-gray-600">
                      <li className="flex items-center">
                        <CheckCircle className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
                        Unlimited meeting processing
                      </li>
                      <li className="flex items-center">
                        <CheckCircle className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
                        AI-powered summaries & action items
                      </li>
                      <li className="flex items-center">
                        <CheckCircle className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
                        Task completion tracking
                      </li>
                      <li className="flex items-center">
                        <CheckCircle className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
                        Export & sharing capabilities
                      </li>
                      <li className="flex items-center">
                        <CheckCircle className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
                        Calendar integration
                      </li>
                      <li className="flex items-center">
                        <CheckCircle className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
                        Secure cloud storage
                      </li>
                    </ul>
                  </div>
                  <div className="text-center">
                    <div className="mb-6">
                      <div className="text-6xl font-bold text-gray-900 mb-2">$0</div>
                      <div className="text-gray-500 line-through text-lg">$29/month</div>
                      <div className="text-sm text-gray-600 mt-2">
                        Free during preview period
                      </div>
                    </div>
                    <Button size="lg" className="w-full mb-4" onClick={() => router.push('/auth')}>
                      Start Using MeetingAI Free
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                    <p className="text-xs text-gray-500">
                      No credit card required • Cancel anytime
                    </p>
                  </div>
                </div>

                <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <Zap className="h-4 w-4 text-blue-600" />
                      </div>
                    </div>
                    <div>
                      <h5 className="font-semibold text-blue-900 mb-1">Preview Period Benefits</h5>
                      <p className="text-sm text-blue-700">
                        As a preview user, you'll get lifetime access to premium features at a special discount when we launch.
                        Your feedback helps us build the perfect meeting AI tool!
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Coming Soon Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-purple-100 text-purple-800 px-4 py-2">
              🚀 Coming Soon
            </Badge>
            <h2 className="text-4xl font-bold text-gray-900 mb-4">The Future of Meeting Intelligence</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              We're building the next generation of Transcript AI that will work seamlessly with our MeetingAI platform
            </p>
          </div>

          <div className="max-w-5xl mx-auto">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-6">Transcript AI Integration</h3>
                <div className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center mt-1">
                      <div className="w-2 h-2 bg-purple-600 rounded-full"></div>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">Real-time Transcription</h4>
                      <p className="text-gray-600">Live meeting transcription with speaker identification and timestamps</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center mt-1">
                      <div className="w-2 h-2 bg-purple-600 rounded-full"></div>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">Smart Meeting Recording</h4>
                      <p className="text-gray-600">Automatic recording with intelligent noise reduction and audio enhancement</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center mt-1">
                      <div className="w-2 h-2 bg-purple-600 rounded-full"></div>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">Multi-language Support</h4>
                      <p className="text-gray-600">Support for 50+ languages with real-time translation capabilities</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center mt-1">
                      <div className="w-2 h-2 bg-purple-600 rounded-full"></div>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">Seamless Integration</h4>
                      <p className="text-gray-600">Direct integration with Zoom, Teams, Google Meet, and other platforms</p>
                    </div>
                  </div>
                </div>

                <div className="mt-8">
                  <Button variant="outline" size="lg" className="mr-4">
                    Join Waitlist
                  </Button>
                  <Button variant="ghost" className="text-purple-600 hover:text-purple-700">
                    Learn More →
                  </Button>
                </div>
              </div>

              <div className="relative">
                <div className="bg-gradient-to-br from-purple-100 to-blue-100 rounded-2xl p-8 relative overflow-hidden">
                  <div className="absolute top-4 right-4 w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                  <div className="absolute top-4 left-4 text-xs text-gray-500">● REC</div>

                  <div className="space-y-4 mt-8">
                    <div className="bg-white rounded-lg p-3 shadow-sm">
                      <div className="flex items-center space-x-2 mb-2">
                        <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold">J</div>
                        <span className="text-sm font-medium">John Smith</span>
                        <span className="text-xs text-gray-500">10:32 AM</span>
                      </div>
                      <p className="text-sm text-gray-700">"Let's schedule a follow-up meeting for next Tuesday to review the quarterly results."</p>
                    </div>

                    <div className="bg-white rounded-lg p-3 shadow-sm">
                      <div className="flex items-center space-x-2 mb-2">
                        <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-white text-xs font-bold">S</div>
                        <span className="text-sm font-medium">Sarah Johnson</span>
                        <span className="text-xs text-gray-500">10:33 AM</span>
                      </div>
                      <p className="text-sm text-gray-700">"I'll send out the calendar invite and prepare the presentation slides."</p>
                    </div>

                    <div className="bg-purple-50 rounded-lg p-3 border border-purple-200">
                      <div className="flex items-center space-x-2 mb-2">
                        <Brain className="h-4 w-4 text-purple-600" />
                        <span className="text-sm font-medium text-purple-800">AI Insight</span>
                      </div>
                      <p className="text-xs text-purple-700">Action item detected: Schedule follow-up meeting (Owner: Sarah, Due: Next Tuesday)</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="container mx-auto px-4 text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <Brain className="h-6 w-6" />
            <span className="text-xl font-bold">MeetingAI</span>
          </div>
          <p className="text-gray-400">© 2025 MeetingAI. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
