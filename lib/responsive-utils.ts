/**
 * Responsive design utilities and constants
 */

// Breakpoint constants
export const BREAKPOINTS = {
  mobile: 320,
  tablet: 768,
  desktop: 1024,
  wide: 1440,
} as const

// Touch target specifications
export const TOUCH_TARGETS = {
  minimum: 44, // 44px minimum as per WCAG guidelines
  recommended: 48, // 48px recommended for better usability
  spacing: 8, // 8px minimum spacing between touch targets
} as const

// Responsive grid configurations
export const GRID_CONFIGS = {
  dashboard: {
    mobile: { cols: 1, gap: 4 },
    tablet: { cols: 2, gap: 6 },
    desktop: { cols: 3, gap: 8 },
  },
  meetings: {
    mobile: { cols: 1, gap: 4 },
    tablet: { cols: 1, gap: 6 },
    desktop: { cols: 2, gap: 8 },
  },
  cards: {
    mobile: { cols: 1, gap: 4 },
    tablet: { cols: 2, gap: 6 },
    desktop: { cols: 3, gap: 8 },
  },
} as const

// Typography scales for different screen sizes
export const TYPOGRAPHY_SCALE = {
  mobile: {
    h1: 'text-2xl',
    h2: 'text-xl',
    h3: 'text-lg',
    body: 'text-base',
    small: 'text-sm',
    xs: 'text-xs',
  },
  tablet: {
    h1: 'text-3xl',
    h2: 'text-2xl',
    h3: 'text-xl',
    body: 'text-base',
    small: 'text-sm',
    xs: 'text-xs',
  },
  desktop: {
    h1: 'text-4xl',
    h2: 'text-3xl',
    h3: 'text-2xl',
    body: 'text-base',
    small: 'text-sm',
    xs: 'text-xs',
  },
} as const

// Spacing scales
export const SPACING_SCALE = {
  mobile: {
    xs: 'p-2',
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6',
    xl: 'p-8',
  },
  tablet: {
    xs: 'p-3',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
    xl: 'p-10',
  },
  desktop: {
    xs: 'p-4',
    sm: 'p-6',
    md: 'p-8',
    lg: 'p-10',
    xl: 'p-12',
  },
} as const

/**
 * Get responsive classes based on device type
 */
export function getResponsiveClasses(
  mobile: string,
  tablet?: string,
  desktop?: string
): string {
  const classes = [mobile]
  
  if (tablet) {
    classes.push(`md:${tablet}`)
  }
  
  if (desktop) {
    classes.push(`lg:${desktop}`)
  }
  
  return classes.join(' ')
}

/**
 * Get touch-optimized button classes
 */
export function getTouchOptimizedClasses(isMobile: boolean): string {
  if (!isMobile) return ''
  
  return `min-h-[${TOUCH_TARGETS.minimum}px] min-w-[${TOUCH_TARGETS.minimum}px] text-base`
}

/**
 * Get responsive padding classes
 */
export function getResponsivePadding(
  size: keyof typeof SPACING_SCALE.mobile = 'md'
): string {
  return getResponsiveClasses(
    SPACING_SCALE.mobile[size],
    SPACING_SCALE.tablet[size],
    SPACING_SCALE.desktop[size]
  )
}

/**
 * Get responsive typography classes
 */
export function getResponsiveTypography(
  element: keyof typeof TYPOGRAPHY_SCALE.mobile
): string {
  return getResponsiveClasses(
    TYPOGRAPHY_SCALE.mobile[element],
    TYPOGRAPHY_SCALE.tablet[element],
    TYPOGRAPHY_SCALE.desktop[element]
  )
}

/**
 * Check if current viewport is mobile
 */
export function isMobileViewport(): boolean {
  if (typeof window === 'undefined') return false
  return window.innerWidth < BREAKPOINTS.tablet
}

/**
 * Check if current viewport is tablet
 */
export function isTabletViewport(): boolean {
  if (typeof window === 'undefined') return false
  return window.innerWidth >= BREAKPOINTS.tablet && window.innerWidth < BREAKPOINTS.desktop
}

/**
 * Check if current viewport is desktop
 */
export function isDesktopViewport(): boolean {
  if (typeof window === 'undefined') return false
  return window.innerWidth >= BREAKPOINTS.desktop
}

/**
 * Get current device type
 */
export function getDeviceType(): 'mobile' | 'tablet' | 'desktop' {
  if (typeof window === 'undefined') return 'desktop'
  
  const width = window.innerWidth
  
  if (width < BREAKPOINTS.tablet) return 'mobile'
  if (width < BREAKPOINTS.desktop) return 'tablet'
  return 'desktop'
}

/**
 * Generate responsive grid classes
 */
export function getResponsiveGridClasses(
  config: typeof GRID_CONFIGS.dashboard
): string {
  return [
    `grid-cols-${config.mobile.cols}`,
    `gap-${config.mobile.gap}`,
    `md:grid-cols-${config.tablet.cols}`,
    `md:gap-${config.tablet.gap}`,
    `lg:grid-cols-${config.desktop.cols}`,
    `lg:gap-${config.desktop.gap}`,
  ].join(' ')
}