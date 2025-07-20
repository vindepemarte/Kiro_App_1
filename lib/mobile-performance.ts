/**
 * Mobile Performance Optimization Utilities
 * Provides tools for optimizing performance on mobile devices
 */

import { useCallback, useEffect, useRef, useState } from 'react'

// Debounce utility for resize events
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

// Throttle utility for scroll events
export function useThrottle<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const throttleRef = useRef<boolean>(false)

  return useCallback(
    ((...args: Parameters<T>) => {
      if (!throttleRef.current) {
        callback(...args)
        throttleRef.current = true
        setTimeout(() => {
          throttleRef.current = false
        }, delay)
      }
    }) as T,
    [callback, delay]
  )
}

// Intersection Observer hook for lazy loading
export function useIntersectionObserver(
  elementRef: React.RefObject<Element>,
  options: IntersectionObserverInit = {}
) {
  const [isIntersecting, setIsIntersecting] = useState(false)

  useEffect(() => {
    const element = elementRef.current
    if (!element) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsIntersecting(entry.isIntersecting)
      },
      {
        threshold: 0.1,
        rootMargin: '50px',
        ...options,
      }
    )

    observer.observe(element)

    return () => {
      observer.unobserve(element)
    }
  }, [elementRef, options])

  return isIntersecting
}

// Performance monitoring utilities
export class MobilePerformanceMonitor {
  private static instance: MobilePerformanceMonitor
  private metrics: Map<string, number[]> = new Map()

  static getInstance(): MobilePerformanceMonitor {
    if (!MobilePerformanceMonitor.instance) {
      MobilePerformanceMonitor.instance = new MobilePerformanceMonitor()
    }
    return MobilePerformanceMonitor.instance
  }

  // Measure component render time
  measureRender(componentName: string, renderFn: () => void): void {
    const start = performance.now()
    renderFn()
    const end = performance.now()
    
    this.recordMetric(componentName, end - start)
  }

  // Record performance metric
  recordMetric(name: string, value: number): void {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, [])
    }
    this.metrics.get(name)!.push(value)
  }

  // Get performance statistics
  getStats(name: string): {
    average: number
    min: number
    max: number
    count: number
  } | null {
    const values = this.metrics.get(name)
    if (!values || values.length === 0) return null

    return {
      average: values.reduce((sum, val) => sum + val, 0) / values.length,
      min: Math.min(...values),
      max: Math.max(...values),
      count: values.length
    }
  }

  // Clear metrics
  clear(): void {
    this.metrics.clear()
  }

  // Get all metrics
  getAllStats(): Record<string, ReturnType<typeof this.getStats>> {
    const stats: Record<string, ReturnType<typeof this.getStats>> = {}
    for (const [name] of this.metrics) {
      stats[name] = this.getStats(name)
    }
    return stats
  }
}

// Touch gesture utilities
export interface TouchGestureHandlers {
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  onSwipeUp?: () => void
  onSwipeDown?: () => void
  onTap?: () => void
  onLongPress?: () => void
}

export function useTouchGestures(
  elementRef: React.RefObject<HTMLElement>,
  handlers: TouchGestureHandlers,
  options: {
    swipeThreshold?: number
    longPressDelay?: number
  } = {}
) {
  const {
    swipeThreshold = 50,
    longPressDelay = 500
  } = options

  const touchStart = useRef<{ x: number; y: number; time: number } | null>(null)
  const longPressTimer = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    const element = elementRef.current
    if (!element) return

    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0]
      touchStart.current = {
        x: touch.clientX,
        y: touch.clientY,
        time: Date.now()
      }

      // Start long press timer
      if (handlers.onLongPress) {
        longPressTimer.current = setTimeout(() => {
          handlers.onLongPress!()
        }, longPressDelay)
      }
    }

    const handleTouchMove = () => {
      // Cancel long press on move
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current)
        longPressTimer.current = null
      }
    }

    const handleTouchEnd = (e: TouchEvent) => {
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current)
        longPressTimer.current = null
      }

      if (!touchStart.current) return

      const touch = e.changedTouches[0]
      const deltaX = touch.clientX - touchStart.current.x
      const deltaY = touch.clientY - touchStart.current.y
      const deltaTime = Date.now() - touchStart.current.time

      const absX = Math.abs(deltaX)
      const absY = Math.abs(deltaY)

      // Check for swipe gestures
      if (absX > swipeThreshold || absY > swipeThreshold) {
        if (absX > absY) {
          // Horizontal swipe
          if (deltaX > 0 && handlers.onSwipeRight) {
            handlers.onSwipeRight()
          } else if (deltaX < 0 && handlers.onSwipeLeft) {
            handlers.onSwipeLeft()
          }
        } else {
          // Vertical swipe
          if (deltaY > 0 && handlers.onSwipeDown) {
            handlers.onSwipeDown()
          } else if (deltaY < 0 && handlers.onSwipeUp) {
            handlers.onSwipeUp()
          }
        }
      } else if (deltaTime < 300 && absX < 10 && absY < 10) {
        // Tap gesture
        if (handlers.onTap) {
          handlers.onTap()
        }
      }

      touchStart.current = null
    }

    element.addEventListener('touchstart', handleTouchStart, { passive: true })
    element.addEventListener('touchmove', handleTouchMove, { passive: true })
    element.addEventListener('touchend', handleTouchEnd, { passive: true })

    return () => {
      element.removeEventListener('touchstart', handleTouchStart)
      element.removeEventListener('touchmove', handleTouchMove)
      element.removeEventListener('touchend', handleTouchEnd)
      
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current)
      }
    }
  }, [elementRef, handlers, swipeThreshold, longPressDelay])
}

// Memory usage monitoring
export function useMemoryMonitor() {
  const [memoryInfo, setMemoryInfo] = useState<{
    usedJSHeapSize?: number
    totalJSHeapSize?: number
    jsHeapSizeLimit?: number
  }>({})

  useEffect(() => {
    const updateMemoryInfo = () => {
      if ('memory' in performance) {
        const memory = (performance as any).memory
        setMemoryInfo({
          usedJSHeapSize: memory.usedJSHeapSize,
          totalJSHeapSize: memory.totalJSHeapSize,
          jsHeapSizeLimit: memory.jsHeapSizeLimit
        })
      }
    }

    updateMemoryInfo()
    const interval = setInterval(updateMemoryInfo, 5000) // Update every 5 seconds

    return () => clearInterval(interval)
  }, [])

  return memoryInfo
}

// Network status monitoring
export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [connectionType, setConnectionType] = useState<string>('unknown')

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Check connection type if available
    if ('connection' in navigator) {
      const connection = (navigator as any).connection
      setConnectionType(connection.effectiveType || 'unknown')
      
      const handleConnectionChange = () => {
        setConnectionType(connection.effectiveType || 'unknown')
      }
      
      connection.addEventListener('change', handleConnectionChange)
      
      return () => {
        window.removeEventListener('online', handleOnline)
        window.removeEventListener('offline', handleOffline)
        connection.removeEventListener('change', handleConnectionChange)
      }
    }

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return { isOnline, connectionType }
}

// Viewport utilities
export function useViewportSize() {
  const [viewport, setViewport] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0
  })

  const debouncedViewport = useDebounce(viewport, 100)

  useEffect(() => {
    const handleResize = () => {
      setViewport({
        width: window.innerWidth,
        height: window.innerHeight
      })
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return debouncedViewport
}

// Image lazy loading utility
export function useLazyImage(src: string, placeholder?: string) {
  const [imageSrc, setImageSrc] = useState(placeholder || '')
  const [isLoaded, setIsLoaded] = useState(false)
  const [isError, setIsError] = useState(false)
  const imgRef = useRef<HTMLImageElement>(null)
  const isInView = useIntersectionObserver(imgRef)

  useEffect(() => {
    if (isInView && src && !isLoaded && !isError) {
      const img = new Image()
      img.onload = () => {
        setImageSrc(src)
        setIsLoaded(true)
      }
      img.onerror = () => {
        setIsError(true)
      }
      img.src = src
    }
  }, [isInView, src, isLoaded, isError])

  return { imageSrc, isLoaded, isError, imgRef }
}