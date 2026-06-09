import { useEffect } from 'react'
import { useAuth } from '../features/auth/hooks/useAuth'

export function usePresetTheme() {
  const { user } = useAuth()

  useEffect(() => {
    // If the user is loaded, cache their theme in localStorage
    if (user?.theme) {
      localStorage.setItem('momnts-theme-preset', user.theme)
    }

    // Try to use the loaded user theme, otherwise fall back to cached theme
    const themePreset = user?.theme || localStorage.getItem('momnts-theme-preset') || 'system'
    
    if (themePreset !== 'system' && themePreset !== 'light' && themePreset !== 'dark' && themePreset !== 'default') {
      document.documentElement.setAttribute('data-preset', themePreset)
    } else {
      document.documentElement.removeAttribute('data-preset')
    }
  }, [user?.theme])
}
