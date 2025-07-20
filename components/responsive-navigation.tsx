"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import { Brain, Menu, User, LogOut, Home, BarChart3, Settings, Bell, Users } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { useMobile } from "@/hooks/use-mobile"
import { NotificationCenter, useNotificationCount } from "@/components/notification-center"

interface ResponsiveNavigationProps {
  currentPage?: string
  onLogout?: () => void
  className?: string
}

export function ResponsiveNavigation({ 
  currentPage = "dashboard", 
  onLogout,
  className = "" 
}: ResponsiveNavigationProps) {
  const { user } = useAuth()
  const isMobile = useMobile()
  const [isOpen, setIsOpen] = useState(false)
  const [notificationCenterOpen, setNotificationCenterOpen] = useState(false)
  const unreadCount = useNotificationCount()

  // Close mobile menu when screen size changes to desktop
  useEffect(() => {
    if (!isMobile && isOpen) {
      setIsOpen(false)
    }
  }, [isMobile, isOpen])

  const navigationItems = [
    { id: "dashboard", label: "Dashboard", icon: Home, href: "/dashboard" },
    { id: "teams", label: "Teams", icon: Users, href: "/teams" },
    { id: "analytics", label: "Analytics", icon: BarChart3, href: "/analytics" },
    { id: "notifications", label: "Notifications", icon: Bell, href: "/notifications" },
    { id: "settings", label: "Settings", icon: Settings, href: "/settings" },
  ]

  const handleNavigation = (href: string) => {
    setIsOpen(false)
    window.location.href = href
  }

  const handleLogoutClick = () => {
    setIsOpen(false)
    onLogout?.()
  }

  // Mobile Navigation
  if (isMobile) {
    return (
      <div>
        <header className={`bg-white border-b sticky top-0 z-50 ${className}`}>
          <div className={`
            flex items-center justify-between px-4 py-3
            sm:px-6 sm:py-4
            md:px-4 md:py-3
            lg:px-6 lg:py-4
          `}>
            {/* Logo */}
            <div className="flex items-center space-x-2">
              <Brain className="h-7 w-7 text-blue-600" />
              <span className="text-xl font-bold text-gray-900">MeetingAI</span>
              <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700 border-blue-200">
                Preview
              </Badge>
            </div>

            {/* Mobile Actions */}
            <div className="flex items-center space-x-2">
              {/* Notification Button */}
              <Button
                variant="ghost"
                size="sm"
                className="h-12 w-12 p-0 min-h-[44px] min-w-[44px] relative"
                onClick={() => setNotificationCenterOpen(true)}
                aria-label="Open notifications"
              >
                <Bell className="h-6 w-6" />
                {unreadCount > 0 && (
                  <Badge 
                    variant="destructive" 
                    className="absolute -top-1 -right-1 h-5 w-5 p-0 text-xs flex items-center justify-center"
                  >
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </Badge>
                )}
              </Button>

              {/* Mobile Menu */}
              <Sheet open={isOpen} onOpenChange={setIsOpen}>
                <SheetTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-12 w-12 p-0 min-h-[44px] min-w-[44px]"
                    aria-label="Open navigation menu"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        setIsOpen(true)
                      }
                    }}
                  >
                    <Menu className="h-6 w-6" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-full max-w-sm p-0">
                <div className="flex flex-col h-full">
                  {/* Header */}
                  <div className="p-6 border-b bg-gray-50">
                    <div className="flex items-center space-x-2 mb-4">
                      <Brain className="h-6 w-6 text-blue-600" />
                      <span className="text-lg font-bold text-gray-900">MeetingAI</span>
                    </div>
                    {user && (
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <User className="h-4 w-4" />
                        <span className="truncate">
                          {user.isAnonymous 
                            ? 'Anonymous User' 
                            : user.displayName || user.email || `User ${user.uid.slice(0, 8)}`
                          }
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Navigation Items */}
                  <nav className="flex-1 p-4">
                    <div className="space-y-1">
                      {navigationItems.map((item) => {
                        const Icon = item.icon
                        const isActive = currentPage === item.id
                        return (
                          <Button
                            key={item.id}
                            variant={isActive ? "default" : "ghost"}
                            className={`w-full justify-start h-14 text-left text-base min-h-[44px] ${
                              isActive ? "bg-blue-600 text-white shadow-sm" : "text-gray-700 hover:bg-gray-100"
                            }`}
                            onClick={() => handleNavigation(item.href)}
                          >
                            <Icon className="h-5 w-5 mr-4 flex-shrink-0" />
                            <span className="truncate">{item.label}</span>
                          </Button>
                        )
                      })}
                    </div>
                  </nav>

                  {/* Footer */}
                  <div className="p-4 border-t bg-gray-50">
                    <Button
                      variant="outline"
                      className="w-full h-14 justify-start text-gray-700 text-base min-h-[44px] border-gray-300"
                      onClick={handleLogoutClick}
                    >
                      <LogOut className="h-5 w-5 mr-4 flex-shrink-0" />
                      <span>Logout</span>
                    </Button>
                  </div>
                </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </header>

        {/* Bottom Navigation for Mobile */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40 pb-safe"
             style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
          <div className="flex items-center justify-around px-2 py-2">
            {navigationItems.slice(0, 3).map((item) => {
              const Icon = item.icon
              const isActive = currentPage === item.id
              return (
                <Button
                  key={item.id}
                  variant="ghost"
                  className={`flex-1 flex-col h-16 min-h-[44px] px-2 py-2 ${
                    isActive ? "text-blue-600 bg-blue-50" : "text-gray-600"
                  }`}
                  onClick={() => handleNavigation(item.href)}
                >
                  <Icon className="h-5 w-5 mb-1" />
                  <span className="text-xs truncate">{item.label}</span>
                </Button>
              )
            })}
            {/* Notification button in bottom nav */}
            <Button
              variant="ghost"
              className={`flex-1 flex-col h-16 min-h-[44px] px-2 py-2 relative ${
                currentPage === "notifications" ? "text-blue-600 bg-blue-50" : "text-gray-600"
              }`}
              onClick={() => setNotificationCenterOpen(true)}
            >
              <Bell className="h-5 w-5 mb-1" />
              <span className="text-xs truncate">Notifications</span>
              {unreadCount > 0 && (
                <Badge 
                  variant="destructive" 
                  className="absolute top-1 right-2 h-4 w-4 p-0 text-xs flex items-center justify-center"
                >
                  {unreadCount > 9 ? '9+' : unreadCount}
                </Badge>
              )}
            </Button>
            {/* More button for additional items */}
            <Button
              variant="ghost"
              className="flex-1 flex-col h-16 min-h-[44px] px-2 py-2 text-gray-600"
              onClick={() => setIsOpen(true)}
            >
              <Menu className="h-5 w-5 mb-1" />
              <span className="text-xs">More</span>
            </Button>
          </div>
        </div>

        {/* Notification Center */}
        <NotificationCenter 
          isOpen={notificationCenterOpen} 
          onClose={() => setNotificationCenterOpen(false)} 
        />
      </div>
    )
  }

  // Desktop Navigation
  return (
    <div>
      <header className={`bg-white border-b sticky top-0 z-50 ${className}`}>
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center space-x-2">
            <Brain className="h-8 w-8 text-blue-600" />
            <span className="text-2xl font-bold text-gray-900">MeetingAI</span>
            <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700 border-blue-200">
              Preview
            </Badge>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-6">
            {navigationItems.map((item) => {
              const Icon = item.icon
              const isActive = currentPage === item.id
              return (
                <Button
                  key={item.id}
                  variant={isActive ? "default" : "ghost"}
                  className={`h-10 ${isActive ? "bg-blue-600 text-white" : "text-gray-700"}`}
                  onClick={() => handleNavigation(item.href)}
                >
                  <Icon className="h-4 w-4 mr-2" />
                  {item.label}
                </Button>
              )
            })}
          </nav>

          {/* User Info & Actions */}
          <div className="hidden md:flex items-center space-x-4">
            {/* Notification Button */}
            <Button
              variant="ghost"
              size="sm"
              className="relative"
              onClick={() => setNotificationCenterOpen(true)}
              aria-label="Open notifications"
            >
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <Badge 
                  variant="destructive" 
                  className="absolute -top-1 -right-1 h-4 w-4 p-0 text-xs flex items-center justify-center"
                >
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Badge>
              )}
            </Button>

            {user && (
              <div className="flex items-center space-x-2">
                <User className="h-5 w-5 text-gray-500" />
                <span className="text-sm text-gray-700">
                  {user.isAnonymous 
                    ? 'Anonymous User' 
                    : user.displayName || user.email || `User ${user.uid.slice(0, 8)}`
                  }
                </span>
              </div>
            )}
            <Button variant="outline" size="sm" onClick={onLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Notification Center */}
      <NotificationCenter 
        isOpen={notificationCenterOpen} 
        onClose={() => setNotificationCenterOpen(false)} 
      />
    </div>
  )
}