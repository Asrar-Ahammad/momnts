import { Outlet, useNavigate, useLocation, Link } from 'react-router';
import { House, Ticket, User, UserCircleDashed } from "@phosphor-icons/react"
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '../lib/utils'
import { ThemeToggle } from '../components/theme-toggle'
import NotificationsPopover from '../components/NotificationsPopover'
import { useAuth } from '../features/auth/hooks/useAuth'
import { useState } from 'react';
import { Badge } from '../components/ui/badge'

const DashboardLayout = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  const [prevPath, setPrevPath] = useState(location.pathname)
  const [direction, setDirection] = useState(0)

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
      icon: <House size={22} weight={location.pathname === '/dashboard' ? "fill" : "regular"} />,
      path: '/dashboard',
      active: location.pathname === '/dashboard',
    },
    {
      title: 'Events',
      icon: <Ticket size={22} weight={location.pathname.startsWith('/events') ? "fill" : "regular"} />,
      path: '/events',
      active: location.pathname.startsWith('/events'),
    },
    {
      title: 'Profile',
      icon: <User size={22} weight={location.pathname === '/profile' ? "fill" : "regular"} />,
      path: '/profile',
      active: location.pathname === '/profile',
    },
  ];

  return (
    <div className="h-screen flex flex-col bg-white dark:bg-neutral-950 overflow-hidden relative">
      {/* Top Header */}
      <header className="h-[72px] px-6 flex items-center justify-between bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md fixed top-0 left-0 right-0 z-40 border-b border-neutral-200/10 dark:border-neutral-800/10">
        {/* Left: Logo */}
        <div className="flex-1 flex items-center">
          <Link
            to="/dashboard"
            aria-label="Go to dashboard"
            className='font-logo text-3xl select-none cursor-pointer tracking-tight text-neutral-900 dark:text-white'
          >
            Momnts
          </Link>
          <Badge variant="secondary" className='ml-2 select-none'>Beta</Badge>
        </div>

        {/* Center: Desktop Navigation Pill */}
        <nav className="hidden md:flex items-center gap-1 border border-neutral-200/30 dark:border-neutral-800/30 rounded-full px-1.5 py-1.5 bg-white/30 dark:bg-neutral-900/30 backdrop-blur-xl shadow-lg">
          {navItems.map((item) => (
            <button
              key={item.title}
              onClick={() => navigate(item.path)}
              className={cn(
                'relative px-5 py-2 rounded-full transition-all duration-300 text-sm font-semibold flex items-center gap-2 group cursor-pointer',
                item.active
                  ? 'text-white dark:text-neutral-900'
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
                  className="absolute inset-0 bg-neutral-900 dark:bg-white rounded-full shadow-md"
                  transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                />
              )}
            </button>
          ))}
        </nav>

        {/* Right: Actions */}
        <div className="flex-1 flex items-center justify-end gap-3">
          <NotificationsPopover />
          <div className="h-4 w-px bg-neutral-200 dark:bg-neutral-800 hidden sm:block mx-1" />
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
                <UserCircleDashed size={22} className="text-neutral-500" />
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-x-hidden pt-[72px] pb-24 md:pb-8 relative">
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
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 md:hidden w-[70%] max-w-[360px]">
        <nav className="flex items-center justify-around bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md border dark:border-white/10 border-white/80 rounded-[28px] p-2 shadow-2xl ring-1 ring-black/5 dark:ring-white/5">
          {navItems.map((item) => (
            <button
              key={item.title}
              onClick={() => navigate(item.path)}
              className={cn(
                "relative flex flex-col items-center justify-center py-2 px-6 rounded-2xl transition-all duration-300",
                item.active ? "text-neutral-900 dark:text-white" : "text-neutral-400 dark:text-neutral-500 hover:text-neutral-600 dark:hover:text-neutral-400"
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
                  className="absolute -bottom-0.5 w-1 h-1 bg-neutral-900 dark:bg-white rounded-full"
                  transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                />
              )}
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
};

export default DashboardLayout;
