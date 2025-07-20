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

  useEffect(() => {
    const checkDevice = () => {
      setIsMobile(window.innerWidth < 768)
    }

    // Check on mount
    checkDevice()

    // Listen for resize events
    window.addEventListener("resize", checkDevice)
    
    // Cleanup
    return () => window.removeEventListener("resize", checkDevice)
  }, [])

  return isMobile
}

/**
 * Hook to detect tablet devices based on screen width
 */
export function useTablet() {
  const [isTablet, setIsTablet] = useState(false)

  useEffect(() => {
    const checkDevice = () => {
      const width = window.innerWidth
      setIsTablet(width >= 768 && width < 1024)
    }

    checkDevice()
    window.addEventListener("resize", checkDevice)
    
    return () => window.removeEventListener("resize", checkDevice)
  }, [])

  return isTablet
}

/**
 * Hook to get current device type
 */
export function useDeviceType() {
  const [deviceType, setDeviceType] = useState<'mobile' | 'tablet' | 'desktop'>('desktop')

  useEffect(() => {
    const checkDevice = () => {
      const width = window.innerWidth
      if (width < 768) {
        setDeviceType('mobile')
      } else if (width < 1024) {
        setDeviceType('tablet')
      } else {
        setDeviceType('desktop')
      }
    }

    checkDevice()
    window.addEventListener("resize", checkDevice)
    
    return () => window.removeEventListener("resize", checkDevice)
  }, [])

  return deviceType
}

/**
 * Hook to get responsive breakpoint utilities
 */
export function useBreakpoint() {
  const [breakpoint, setBreakpoint] = useState({
    isMobile: false,
    isTablet: false,
    isDesktop: false,
    width: 0
  })

  useEffect(() => {
    const updateBreakpoint = () => {
      const width = window.innerWidth
      setBreakpoint({
        isMobile: width < 768,
        isTablet: width >= 768 && width < 1024,
        isDesktop: width >= 1024,
        width
      })
    }

    updateBreakpoint()
    window.addEventListener("resize", updateBreakpoint)
    
    return () => window.removeEventListener("resize", updateBreakpoint)
  }, [])

  return breakpoint
}