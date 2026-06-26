import { Outlet, useNavigate, useLocation, Link } from 'react-router';
import { LightningIcon, UserCircleDashedIcon, UserIcon, CakeIcon, HouseIcon } from "@phosphor-icons/react"
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '../lib/utils'
import { ThemeToggle } from '../components/theme-toggle'
import NotificationsPopover from '../components/NotificationsPopover'
import { useAuth } from '../features/auth/hooks/useAuth'
import { useState, useEffect } from 'react';
import { Badge } from '../components/ui/badge'
import { useWebHaptics } from 'web-haptics/react'
import { useSubscription } from '../features/subscription/hooks/useSubscription'
import { usePresetTheme } from '../hooks/usePresetTheme'

const DashboardLayout = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  const haptic = useWebHaptics()
  const { isPro } = useSubscription()
  const [prevPath, setPrevPath] = useState(location.pathname)
  const [direction, setDirection] = useState(0)
  const [isSlideshowOpen, setIsSlideshowOpen] = useState(false)

  // Apply custom preset theme globally
  usePresetTheme()

  useEffect(() => {
    const handleSlideshowChange = (e: Event) => {
      const customEvent = e as CustomEvent<{ open: boolean }>
      setIsSlideshowOpen(customEvent.detail.open)
    }
    window.addEventListener('slideshow-state-change', handleSlideshowChange)
    return () => {
      window.removeEventListener('slideshow-state-change', handleSlideshowChange)
    }
  }, [])

  // Scroll to top on route change
  useEffect(() => {
    const mainEl = document.getElementById('dashboard-main')
    if (mainEl) {
      mainEl.scrollTo({ top: 0, behavior: 'instant' })
    }
  }, [location.pathname])

  const getPathIndex = (path: string) => {
    if (path.startsWith('/dashboard')) return 0
    if (path.startsWith('/events')) return 1
    if (path.startsWith('/profile')) return 2
    return 0
  }

  // Calculate direction during render to sync with AnimatePresence
  if (location.pathname !== prevPath) {
    const prevIndex = getPathIndex(prevPath)
    const nextIndex = getPathIndex(location.pathname)
    const newDirection = nextIndex > prevIndex ? 1 : -1

    setDirection(newDirection)
    setPrevPath(location.pathname)
  }

  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? '100%' : '-100%',
      opacity: 0,
      scale: 0.98
    }),
    center: {
      x: 0,
      opacity: 1,
      scale: 1,
      zIndex: 1
    },
    exit: (direction: number) => ({
      x: direction > 0 ? '-100%' : '100%',
      opacity: 0,
      scale: 0.98,
      zIndex: 0
    })
  }

  const navItems = [
    {
      title: 'Home',
      icon: <HouseIcon size={22} weight={location.pathname === '/dashboard' ? "fill" : "regular"} />,
      path: '/dashboard',
      active: location.pathname === '/dashboard',
    },
    {
      title: 'Events',
      icon: <CakeIcon size={22} weight={location.pathname.startsWith('/events') ? "fill" : "regular"} />,
      path: '/events',
      active: location.pathname.startsWith('/events'),
    },
    {
      title: 'Profile',
      icon: <UserIcon size={22} weight={location.pathname === '/profile' ? "fill" : "regular"} />,
      path: '/profile',
      active: location.pathname === '/profile',
    },
  ];

  const isEventDetailsPage = location.pathname.match(/^\/events\/[a-zA-Z0-9_-]+$/)
  const smoothTransition = { type: 'spring', stiffness: 300, damping: 30, mass: 1 }

  return (
    <div className="h-screen flex flex-col bg-background text-foreground overflow-hidden relative transition-colors duration-300">
      {/* Top Header */}
      <motion.header
        layout
        transition={smoothTransition}
        style={{
          paddingTop: 'env(safe-area-inset-top, 0px)'
        }}
        className={cn(
          "fixed z-40",
          // Mobile: full width, stick to top
          "top-0 left-0 w-full rounded-none border-b",
          "bg-background/80 backdrop-blur-md",
          "border-neutral-200/50 dark:border-neutral-800/50",
          // Desktop: Floating Island (only at lg+, unless event details)
          !isEventDetailsPage && [
            "lg:top-6 lg:left-1/2 lg:-translate-x-1/2 lg:w-[calc(100%-64px)] lg:max-w-[900px]",
            "lg:rounded-full lg:border",
            "lg:bg-background/70 lg:backdrop-blur-[24px]",
            "lg:shadow-[0_16px_40px_rgba(0,0,0,0.05)] dark:lg:shadow-[0_16px_40px_rgba(0,0,0,0.3)]"
          ]
        )}
      >
        <motion.div layout transition={smoothTransition} className={cn("px-4 lg:px-6 flex items-center justify-between w-full", isEventDetailsPage ? "h-[72px]" : "h-[72px] lg:h-16")}>
          {/* Left: Logo */}
          <motion.div layout transition={smoothTransition} className="flex-none lg:flex-1 flex items-center min-w-0">
            <Link
              to="/dashboard"
              aria-label="Go to dashboard"
              className={cn("font-logo select-none cursor-pointer tracking-tight text-neutral-900 dark:text-white shrink-0", isEventDetailsPage ? "text-2xl md:text-3xl" : "text-2xl md:text-2xl")}
            >
              Momnts
            </Link>
            <Badge variant="secondary" className='ml-2 select-none text-neutral-600 dark:text-neutral-300 text-[8px] hidden lg:inline-flex'>v 1.0</Badge>
            <Link
              to="/pricing"
              className={`ml-1.5 select-none px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all shrink-0 hidden lg:inline-flex ${isPro
                  ? 'bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400 hover:bg-violet-100 dark:hover:bg-violet-500/20'
                  : 'bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                }`}
            >
              {isPro ? (
                <span className="flex items-center gap-0.5">
                  <LightningIcon size={12} weight="fill" /> Pro
                </span>
              ) : (
                'Free'
              )}
            </Link>
          </motion.div>

          {/* Center: Desktop Navigation (lg+ only) */}
          <motion.nav layout transition={smoothTransition} className={cn("hidden lg:flex items-center gap-1 px-1.5 py-1.5", isEventDetailsPage && "border border-neutral-200/30 dark:border-neutral-800/30 rounded-full bg-background/30 backdrop-blur-xl shadow-lg")}>
            {navItems.map((item) => (
              <button
                key={item.title}
                onClick={() => navigate(item.path)}
                className={cn(
                  'relative px-3.5 lg:px-5 py-2 rounded-full transition-all duration-300 text-xs lg:text-sm font-semibold flex items-center gap-1.5 lg:gap-2 group cursor-pointer',
                  item.active
                    ? '!text-primary-foreground'
                    : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                )}
              >
                <span className="relative z-10 transition-transform duration-300 group-hover:scale-110">
                  {item.icon}
                </span>
                <span className="relative z-10">{item.title}</span>
                {item.active && (
                  <motion.div
                    layoutId="nav-pill"
                    className="absolute inset-0 bg-primary rounded-full shadow-md"
                    transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                  />
                )}
              </button>
            ))}
          </motion.nav>

          {/* Right: Actions */}
          <motion.div layout transition={smoothTransition} className="flex-none lg:flex-1 flex items-center justify-end gap-1.5 lg:gap-3">
            <NotificationsPopover />
            <div className="h-4 w-px bg-neutral-200 dark:bg-neutral-800 hidden lg:block mx-1" />
            <ThemeToggle />

            <div className="ml-1">
              {user?.selfie_url ? (
                <img
                  src={user.selfie_url}
                  alt={user.name}
                  className="w-9 h-9 rounded-full object-cover ring-2 ring-neutral-200 dark:ring-neutral-800 cursor-pointer transition-transform hover:scale-105"
                  onClick={() => navigate('/profile')}
                />
              ) : (
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center bg-neutral-100 dark:bg-neutral-800 cursor-pointer transition-transform hover:scale-105"
                  onClick={() => navigate('/profile')}
                >
                  <UserCircleDashedIcon size={22} className="text-neutral-500" />
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      </motion.header>

      {/* Main Content Area */}
      <main
        id="dashboard-main"
        className={cn(
          "flex-1 overflow-x-hidden overflow-y-auto pb-24 lg:pb-8 relative",
          "pt-[calc(72px+env(safe-area-inset-top,0px))]",
          !isEventDetailsPage && "lg:pt-[104px]"
        )}
      >
        <AnimatePresence initial={false} custom={direction} mode="popLayout">
          <motion.div
            key={location.pathname}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              x: { type: "spring", stiffness: 200, damping: 25, mass: 0.8 },
              opacity: { duration: 0.2 },
              scale: { duration: 0.2 }
            }}
            className="w-full h-full"
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Mobile Floating Bottom Bar */}
      <motion.div
        initial={{ y: 0, opacity: 1 }}
        animate={{
          y: isSlideshowOpen ? 120 : 0,
          opacity: isSlideshowOpen ? 0 : 1,
          pointerEvents: isSlideshowOpen ? 'none' : 'auto'
        }}
        transition={{ type: 'spring', stiffness: 260, damping: 30 }}
        style={{
          bottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))'
        }}
        className="fixed left-1/2 -translate-x-1/2 z-50 lg:hidden w-[85%] sm:w-[70%] md:w-[50%] max-w-[360px]"
      >
        <nav className="flex items-center justify-around bg-background/80 backdrop-blur-md border border-neutral-200/50 dark:border-white/10 rounded-full p-2 shadow-2xl ring-1 ring-black/5 dark:ring-white/5">
          {navItems.map((item) => (
            <button
              key={item.title}
              onClick={() => {
                haptic.trigger("selection")
                navigate(item.path)
              }}
              className={cn(
                "relative flex flex-col items-center justify-center py-2 flex-1 rounded-2xl transition-all duration-300",
                item.active ? "text-primary" : "text-neutral-400 dark:text-neutral-500 hover:text-neutral-600 dark:hover:text-neutral-400"
              )}
            >
              <div className={cn(
                "p-1.5 rounded-xl transition-all duration-300",
                item.active ? "bg-neutral-100 dark:bg-neutral-800 scale-110" : ""
              )}>
                {item.icon}
              </div>
              {item.active && (
                <motion.div
                  layoutId="active-nav-dot"
                  className="absolute -bottom-0.5 w-1 h-1 bg-primary rounded-full"
                  transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                />
              )}
            </button>
          ))}
        </nav>
      </motion.div>
    </div>
  );
};

export default DashboardLayout;
