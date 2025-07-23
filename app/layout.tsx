import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { AuthProvider } from "@/contexts/auth-context"
import { Toaster } from "@/components/ui/toaster"
import { ErrorBoundary } from "@/components/error-boundary"
import { GlobalLoadingErrorDisplay } from "@/components/global-loading-error-display"
import { initializeDatabase } from "./db-init"

// Initialize the database at runtime
initializeDatabase();

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "MeetingAI - Transform Meetings into Actionable Tasks",
  description:
    "AI-powered meeting transcript analysis that generates summaries and action items automatically. Save hours and boost team accountability.",
  keywords: "meeting, AI, transcript, summary, action items, productivity, team collaboration",
  authors: [{ name: "MeetingAI Team" }],
  openGraph: {
    title: "MeetingAI - Transform Meetings into Actionable Tasks",
    description: "AI-powered meeting transcript analysis that generates summaries and action items automatically.",
    type: "website",
  },
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <script src="/env.js"></script>
      </head>
      <body className={inter.className}>
        <ErrorBoundary showErrorDetails={process.env.NODE_ENV === 'development'}>
          <ThemeProvider
            attribute="class"
            defaultTheme="light"
            enableSystem={false}
            disableTransitionOnChange
          >
            <AuthProvider>
              {children}
              <Toaster />
              <GlobalLoadingErrorDisplay />
            </AuthProvider>
          </ThemeProvider>
        </ErrorBoundary>
      </body>
    </html>
  )
}
