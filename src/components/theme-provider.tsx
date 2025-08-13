"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider, useTheme } from "next-themes"
import { ThemeProvider as AmplifyThemeProvider, defaultDarkModeOverride, ColorMode } from "@aws-amplify/ui-react"

interface ThemeProviderProps {
  children: React.ReactNode
}

// Inner component that uses the theme from next-themes
function AmplifyThemeProviderWrapper({ children }: { children: React.ReactNode }) {
  const { resolvedTheme } = useTheme()
  
  const colorMode = React.useMemo((): ColorMode => {
    if (resolvedTheme === 'dark') return 'dark'
    if (resolvedTheme === 'light') return 'light'
    return 'system'
  }, [resolvedTheme])

  return (
    <AmplifyThemeProvider
      theme={{
        name: 'lytn-theme',
        overrides: [defaultDarkModeOverride],
      }}
      colorMode={colorMode}
    >
      {children}
    </AmplifyThemeProvider>
  )
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return <>{children}</>
  }

  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem={true}
      disableTransitionOnChange
      storageKey="lytn-theme"
    >
      <AmplifyThemeProviderWrapper>
        <div style={{ minHeight: '100dvh' }} className="flex flex-col w-full">
          {children}
        </div>
      </AmplifyThemeProviderWrapper>
    </NextThemesProvider>
  )
} 