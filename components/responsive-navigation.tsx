"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import { Brain, Menu, User, LogOut, Home, BarChart3, Settings, Bell, Users, CheckSquare } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { useMobile } from "@/hooks/use-mobile"
import { NotificationCenter, useNotificationCount } from "@/components/notification-center"
import { useTaskCount } from "@/hooks/use-task-count"

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
  const { pendingTaskCount } = useTaskCount()

  // Close mobile menu when screen size changes to desktop
  useEffect(() => {
    if (!isMobile && isOpen) {
      setIsOpen(false)
    }
  }, [isMobile, isOpen])

  const navigationItems = [
    { id: "dashboard", label: "Dashboard", icon: Home, href: "/dashboard" },
    { id: "teams", label: "Teams", icon: Users, href: "/teams" },
    { id: "tasks", label: "Tasks", icon: CheckSquare, href: "/tasks" },
    { id: "analytics", label: "Analytics", icon: BarChart3, href: "/analytics" },
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
            transition-all duration-200
          `}>
            {/* Logo */}
            <div className="flex items-center space-x-2">
              <Brain className="h-7 w-7 text-blue-600" />
              <span className="text-xl font-bold text-gray-900">MeetingAI</span>
              <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700 border-blue-200">
                Preview
              </Badge>
            </div>

            {/* Mobile Actions - User Info Only */}
            <div className="flex items-center space-x-2">
              {user && (
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <User className="h-4 w-4" />
                  <span className="truncate max-w-24">
                    {user.isAnonymous 
                      ? 'Anonymous' 
                      : user.displayName?.split(' ')[0] || user.email?.split('@')[0] || 'User'
                    }
                  </span>
                </div>
              )}
              
              {/* Logout Button */}
              <Button
                variant="ghost"
                size="sm"
                className="h-10 px-3 text-gray-600"
                onClick={handleLogoutClick}
                aria-label="Logout"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </header>

        {/* Bottom Navigation for Mobile */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40 pb-safe"
             style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
          <div className="grid grid-cols-6 gap-1 px-1 py-2">
            {/* Dashboard */}
            <Button
              variant="ghost"
              className={`flex-col h-16 min-h-[44px] px-1 py-2 ${
                currentPage === "dashboard" ? "text-blue-600 bg-blue-50" : "text-gray-600"
              }`}
              onClick={() => handleNavigation("/dashboard")}
            >
              <Home className="h-4 w-4 mb-1" />
              <span className="text-xs truncate">Dashboard</span>
            </Button>
            
            {/* Teams */}
            <Button
              variant="ghost"
              className={`flex-col h-16 min-h-[44px] px-1 py-2 ${
                currentPage === "teams" ? "text-blue-600 bg-blue-50" : "text-gray-600"
              }`}
              onClick={() => handleNavigation("/teams")}
            >
              <Users className="h-4 w-4 mb-1" />
              <span className="text-xs truncate">Teams</span>
            </Button>

            {/* Tasks */}
            <Button
              variant="ghost"
              className={`flex-col h-16 min-h-[44px] px-1 py-2 relative ${
                currentPage === "tasks" ? "text-blue-600 bg-blue-50" : "text-gray-600"
              }`}
              onClick={() => handleNavigation("/tasks")}
            >
              <CheckSquare className="h-4 w-4 mb-1" />
              <span className="text-xs truncate">Tasks</span>
              {pendingTaskCount > 0 && (
                <Badge 
                  variant="destructive" 
                  className="absolute top-1 right-1 h-3 w-3 p-0 text-xs flex items-center justify-center"
                >
                  {pendingTaskCount > 9 ? '9+' : pendingTaskCount}
                </Badge>
              )}
            </Button>

            {/* Analytics */}
            <Button
              variant="ghost"
              className={`flex-col h-16 min-h-[44px] px-1 py-2 ${
                currentPage === "analytics" ? "text-blue-600 bg-blue-50" : "text-gray-600"
              }`}
              onClick={() => handleNavigation("/analytics")}
            >
              <BarChart3 className="h-4 w-4 mb-1" />
              <span className="text-xs truncate">Analytics</span>
            </Button>

            {/* Settings */}
            <Button
              variant="ghost"
              className={`flex-col h-16 min-h-[44px] px-1 py-2 ${
                currentPage === "settings" ? "text-blue-600 bg-blue-50" : "text-gray-600"
              }`}
              onClick={() => handleNavigation("/settings")}
            >
              <Settings className="h-4 w-4 mb-1" />
              <span className="text-xs truncate">Settings</span>
            </Button>
            
            {/* Notifications */}
            <Button
              variant="ghost"
              className={`flex-col h-16 min-h-[44px] px-1 py-2 relative ${
                currentPage === "notifications" ? "text-blue-600 bg-blue-50" : "text-gray-600"
              }`}
              onClick={() => setNotificationCenterOpen(true)}
            >
              <Bell className="h-4 w-4 mb-1" />
              <span className="text-xs truncate">Notifications</span>
              {unreadCount > 0 && (
                <Badge 
                  variant="destructive" 
                  className="absolute top-1 right-1 h-3 w-3 p-0 text-xs flex items-center justify-center"
                >
                  {unreadCount > 9 ? '9+' : unreadCount}
                </Badge>
              )}
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
                  className={`h-10 relative ${isActive ? "bg-blue-600 text-white" : "text-gray-700"}`}
                  onClick={() => handleNavigation(item.href)}
                >
                  <Icon className="h-4 w-4 mr-2" />
                  {item.label}
                  {item.id === 'tasks' && pendingTaskCount > 0 && (
                    <Badge 
                      variant="destructive" 
                      className="absolute -top-1 -right-1 h-4 w-4 p-0 text-xs flex items-center justify-center"
                    >
                      {pendingTaskCount > 99 ? '99+' : pendingTaskCount}
                    </Badge>
                  )}
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