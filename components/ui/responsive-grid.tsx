"use client"

import { ReactNode } from "react"
import { cn } from "@/lib/utils"

interface ResponsiveGridProps {
  children: ReactNode
  className?: string
  cols?: {
    mobile?: number
    tablet?: number
    desktop?: number
  }
  gap?: {
    mobile?: number
    tablet?: number
    desktop?: number
  }
}

export function ResponsiveGrid({ 
  children, 
  className = "",
  cols = { mobile: 1, tablet: 2, desktop: 3 },
  gap = { mobile: 4, tablet: 6, desktop: 8 }
}: ResponsiveGridProps) {
  const gridClasses = cn(
    "grid",
    // Mobile columns
    cols.mobile === 1 && "grid-cols-1",
    cols.mobile === 2 && "grid-cols-2",
    cols.mobile === 3 && "grid-cols-3",
    // Tablet columns
    cols.tablet === 1 && "md:grid-cols-1",
    cols.tablet === 2 && "md:grid-cols-2", 
    cols.tablet === 3 && "md:grid-cols-3",
    cols.tablet === 4 && "md:grid-cols-4",
    // Desktop columns
    cols.desktop === 1 && "lg:grid-cols-1",
    cols.desktop === 2 && "lg:grid-cols-2",
    cols.desktop === 3 && "lg:grid-cols-3",
    cols.desktop === 4 && "lg:grid-cols-4",
    cols.desktop === 5 && "lg:grid-cols-5",
    cols.desktop === 6 && "lg:grid-cols-6",
    // Mobile gap
    gap.mobile === 2 && "gap-2",
    gap.mobile === 4 && "gap-4",
    gap.mobile === 6 && "gap-6",
    gap.mobile === 8 && "gap-8",
    // Tablet gap
    gap.tablet === 2 && "md:gap-2",
    gap.tablet === 4 && "md:gap-4",
    gap.tablet === 6 && "md:gap-6",
    gap.tablet === 8 && "md:gap-8",
    // Desktop gap
    gap.desktop === 2 && "lg:gap-2",
    gap.desktop === 4 && "lg:gap-4",
    gap.desktop === 6 && "lg:gap-6",
    gap.desktop === 8 && "lg:gap-8",
    className
  )

  return (
    <div className={gridClasses}>
      {children}
    </div>
  )
}

interface ResponsiveContainerProps {
  children: ReactNode
  className?: string
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "full"
  padding?: {
    mobile?: number
    tablet?: number
    desktop?: number
  }
}

export function ResponsiveContainer({ 
  children, 
  className = "",
  maxWidth = "xl",
  padding = { mobile: 4, tablet: 6, desktop: 8 }
}: ResponsiveContainerProps) {
  const containerClasses = cn(
    "mx-auto w-full",
    // Add mobile safe area padding
    "pb-20 md:pb-8", // Extra bottom padding for mobile navigation
    "pt-safe", // Safe area top padding
    // Max width
    maxWidth === "sm" && "max-w-sm",
    maxWidth === "md" && "max-w-md", 
    maxWidth === "lg" && "max-w-lg",
    maxWidth === "xl" && "max-w-xl",
    maxWidth === "2xl" && "max-w-2xl",
    maxWidth === "full" && "max-w-full",
    // Mobile padding
    padding.mobile === 2 && "px-2",
    padding.mobile === 4 && "px-4",
    padding.mobile === 6 && "px-6",
    padding.mobile === 8 && "px-8",
    // Tablet padding
    padding.tablet === 2 && "md:px-2",
    padding.tablet === 4 && "md:px-4",
    padding.tablet === 6 && "md:px-6",
    padding.tablet === 8 && "md:px-8",
    // Desktop padding
    padding.desktop === 2 && "lg:px-2",
    padding.desktop === 4 && "lg:px-4",
    padding.desktop === 6 && "lg:px-6",
    padding.desktop === 8 && "lg:px-8",
    className
  )

  return (
    <div className={containerClasses}>
      {children}
    </div>
  )
}