"use client"

import { useState, useEffect } from "react"

/**
 * Hook to detect mobile devices based on screen width
 * Mobile: < 768px
 * Tablet: 768px - 1023px  
 * Desktop: >= 1024px
 */
export function useMobile() {
  const [isMobile, setIsMobile] = useState(false)
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
    
    const checkDevice = () => {
      if (typeof window !== 'undefined') {
        setIsMobile(window.innerWidth < 768)
      }
    }

    // Check on mount
    checkDevice()

    // Listen for resize events
    if (typeof window !== 'undefined') {
      window.addEventListener("resize", checkDevice)
      
      // Cleanup
      return () => window.removeEventListener("resize", checkDevice)
    }
  }, [])

  // Return false during SSR to prevent hydration mismatches
  return isClient ? isMobile : false
}

/**
 * Hook to detect tablet devices based on screen width
 */
export function useTablet() {
  const [isTablet, setIsTablet] = useState(false)
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
    
    const checkDevice = () => {
      if (typeof window !== 'undefined') {
        const width = window.innerWidth
        setIsTablet(width >= 768 && width < 1024)
      }
    }

    checkDevice()
    
    if (typeof window !== 'undefined') {
      window.addEventListener("resize", checkDevice)
      return () => window.removeEventListener("resize", checkDevice)
    }
  }, [])

  return isClient ? isTablet : false
}

/**
 * Hook to get current device type
 */
export function useDeviceType() {
  const [deviceType, setDeviceType] = useState<'mobile' | 'tablet' | 'desktop'>('desktop')
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
    
    const checkDevice = () => {
      if (typeof window !== 'undefined') {
        const width = window.innerWidth
        if (width < 768) {
          setDeviceType('mobile')
        } else if (width < 1024) {
          setDeviceType('tablet')
        } else {
          setDeviceType('desktop')
        }
      }
    }

    checkDevice()
    
    if (typeof window !== 'undefined') {
      window.addEventListener("resize", checkDevice)
      return () => window.removeEventListener("resize", checkDevice)
    }
  }, [])

  return isClient ? deviceType : 'desktop'
}

/**
 * Hook to get responsive breakpoint utilities
 */
export function useBreakpoint() {
  const [breakpoint, setBreakpoint] = useState({
    isMobile: false,
    isTablet: false,
    isDesktop: true, // Default to desktop for SSR
    width: 1024 // Default width for SSR
  })
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
    
    const updateBreakpoint = () => {
      if (typeof window !== 'undefined') {
        const width = window.innerWidth
        setBreakpoint({
          isMobile: width < 768,
          isTablet: width >= 768 && width < 1024,
          isDesktop: width >= 1024,
          width
        })
      }
    }

    updateBreakpoint()
    
    if (typeof window !== 'undefined') {
      window.addEventListener("resize", updateBreakpoint)
      return () => window.removeEventListener("resize", updateBreakpoint)
    }
  }, [])

  return isClient ? breakpoint : {
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    width: 1024
  }
}