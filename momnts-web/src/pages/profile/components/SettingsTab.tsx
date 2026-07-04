import { Gear, CircleNotch } from '@phosphor-icons/react'
import { Switch } from '../../../components/ui/switch'
import { useState, useEffect } from 'react'
import { motion } from 'motion/react'
import { useWebHaptics } from 'web-haptics/react'

interface SettingsTabProps {
  // Theme
  currentTheme: string
  onSaveTheme: (theme: string, color?: string) => void
  isUpdatingTheme: boolean
  // Haptics
  hapticsEnabled: boolean
  onHapticsToggle: (checked: boolean) => void
}

const THEMES = [
  { id: 'default', name: 'Default', color: '#171717', border: '#e5e5e5' },
  { id: 'earthy', name: 'Earthy', color: '#748b6f', border: '#d9e0d7' },
  { id: 'ocean', name: 'Ocean', color: '#0f4c81', border: '#33658a' },
  { id: 'pastel', name: 'Pastel', color: '#fbcfe8', border: '#f9a8d4' },
  { id: 'cyberpunk', name: 'Cyberpunk', color: '#00ffff', border: '#0891b2' },
  { id: 'cognitive', name: 'Cognitive', color: '#d97757', border: '#b85f42' },
]

const SettingsTab = ({
  currentTheme,
  onSaveTheme,
  isUpdatingTheme,
  hapticsEnabled,
  onHapticsToggle,
}: SettingsTabProps) => {
  const haptic = useWebHaptics()
  const [loadingThemeId, setLoadingThemeId] = useState<string | null>(null)

  useEffect(() => {
    if (!isUpdatingTheme) {
      setLoadingThemeId(null)
    }
  }, [isUpdatingTheme])

  const handleThemeClick = (e: React.MouseEvent, tId: string) => {
    if (tId === (currentTheme || 'default') || isUpdatingTheme) return

    setLoadingThemeId(tId)

    const x = e.clientX
    const y = e.clientY
    document.documentElement.style.setProperty('--click-x', `${x}px`)
    document.documentElement.style.setProperty('--click-y', `${y}px`)

    const updateDOMTheme = () => {
      if (tId !== 'system' && tId !== 'light' && tId !== 'dark' && tId !== 'default') {
        document.documentElement.setAttribute('data-preset', tId)
      } else {
        document.documentElement.removeAttribute('data-preset')
      }
    }

    // @ts-ignore - View Transitions API
    if (!document.startViewTransition) {
      updateDOMTheme()
      onSaveTheme(tId)
      return
    }

    // @ts-ignore
    const transition = document.startViewTransition(() => {
      updateDOMTheme()
    })

    transition.finished.finally(() => {
      onSaveTheme(tId)
    })
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* Haptic Feedback — mobile only */}
      <div className="bg-white/75 dark:bg-neutral-900/80 backdrop-blur-xl border border-black/[0.07] dark:border-white/[0.07] shadow-sm dark:shadow-lg rounded-3xl p-6 sm:p-8 md:hidden">
        <h3 className="text-lg font-bold select-none text-neutral-900 dark:text-neutral-100 mb-2">
          App Settings
        </h3>
        <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-6">
          Customize your experience on Momnts.
        </p>

        <div className="flex items-center justify-between p-4 border border-neutral-100 dark:border-neutral-800 rounded-2xl bg-neutral-50/30 dark:bg-neutral-900/10">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-neutral-100 dark:bg-neutral-800/50 text-neutral-500">
              <Gear size={18} weight="bold" />
            </div>
            <div>
              <label htmlFor="haptics-toggle-settings" className="text-xs font-bold cursor-pointer text-neutral-900 dark:text-neutral-100">
                Haptic Feedback
              </label>
              <p className="text-[10px] text-neutral-400 dark:text-neutral-500 font-medium">Enable physical vibration feedback for actions</p>
            </div>
          </div>
          <Switch
            id="haptics-toggle-settings"
            checked={hapticsEnabled}
            onCheckedChange={onHapticsToggle}
            className="cursor-pointer"
          />
        </div>
      </div>

      {/* Appearance / Theme Selector */}
      <div className="bg-white/75 dark:bg-neutral-900/80 backdrop-blur-xl border border-black/[0.07] dark:border-white/[0.07] shadow-sm dark:shadow-lg rounded-3xl p-6 sm:p-8">
        <h3 className="text-lg font-bold select-none text-neutral-900 dark:text-neutral-100 mb-2">
          Appearance
        </h3>
        <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-6">
          Choose a theme for the application.
        </p>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {THEMES.map((t) => (
            <button
              key={t.id}
              onClick={(e) => handleThemeClick(e, t.id)}
              disabled={isUpdatingTheme}
              className={`relative flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                (currentTheme || 'default') === t.id
                  ? 'border-neutral-900 dark:border-white bg-neutral-50 dark:bg-neutral-800'
                  : 'border-transparent bg-neutral-100/50 dark:bg-neutral-900/50 hover:bg-neutral-200/50 dark:hover:bg-neutral-800/50'
              }`}
            >
              <div
                className="w-10 h-10 rounded-full mb-3 shadow-sm border-2 flex items-center justify-center relative overflow-hidden"
                style={{ backgroundColor: t.color, borderColor: t.border }}
              >
                {loadingThemeId === t.id && (
                  <div className="absolute inset-0 bg-black/20 flex items-center justify-center backdrop-blur-[1px]">
                    <CircleNotch size={18} weight="bold" className="animate-spin text-white drop-shadow-md" />
                  </div>
                )}
              </div>
              <span className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                {t.name}
              </span>
            </button>
          ))}
        </div>
      </div>
    </motion.div>
  )
}

export default SettingsTab
