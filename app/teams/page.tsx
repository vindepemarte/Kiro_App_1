"use client"

import { TeamManagement } from "@/components/team-management"
import { ResponsiveNavigation } from "@/components/responsive-navigation"
import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function TeamsPage() {
  const { user, loading, error, signOut } = useAuth()
  const router = useRouter()
  const [isClient, setIsClient] = useState(false)

  // Ensure client-side only rendering to prevent hydration issues
  useEffect(() => {
    setIsClient(true)
  }, [])

  // Handle navigation when user becomes null (after logout)
  useEffect(() => {
    if (!loading && !user) {
      router.push('/')
    }
  }, [user, loading, router])

  const handleLogout = async () => {
    try {
      await signOut()
      // Navigation will be handled by useEffect when user becomes null
    } catch (error) {
      console.error('Logout error:', error)
      // Force navigation on error
      setTimeout(() => router.push("/"), 0)
    }
  }

  // Show loading screen while authentication is loading or client hydration
  if (!isClient || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">{!isClient ? "Loading..." : "Setting up your session..."}</p>
        </div>
      </div>
    )
  }

  // Show error screen if authentication failed
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Authentication Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={() => router.push('/')}>
            Return to Home
          </Button>
        </div>
      </div>
    )
  }

  // Redirect to home if not authenticated
  if (!user) {
    router.push('/')
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Responsive Navigation */}
      <ResponsiveNavigation 
        currentPage="teams" 
        onLogout={handleLogout}
      />

      <div className="py-6 md:py-8">
        <TeamManagement />
      </div>
    </div>
  )
}