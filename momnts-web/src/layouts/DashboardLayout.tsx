import { useState } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router';
import { CakeIcon, HouseIcon, UserIcon, List, X } from "@phosphor-icons/react"
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '../lib/utils'
import { ThemeToggle } from '../components/theme-toggle'


const DashboardLayout = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const dockItems = [
    {
      title: 'Home',
      icon: <HouseIcon className='h-full w-full' />,
      onClick: () => { navigate('/dashboard'); setIsMobileMenuOpen(false); },
      active: location.pathname === '/dashboard',
    },
    {
      title: 'Events',
      icon: <CakeIcon className='h-full w-full' />,
      onClick: () => { navigate('/events'); setIsMobileMenuOpen(false); },
      active: location.pathname.startsWith('/events'),
    },
    {
      title: 'Me',
      icon: <UserIcon className='h-full w-full' />,
      onClick: () => { navigate('/profile'); setIsMobileMenuOpen(false); },
      active: location.pathname === '/profile',
    },
  ];

  return (
    <div className="h-screen flex flex-col overflow-hidden relative">
      <header className="p-4 flex justify-between items-center gap-8 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md sticky top-0 z-50 border-b border-neutral-100 dark:border-neutral-800">
        <p className='font-logo text-4xl select-none'>Momnts</p>

        {/* Desktop Navigation */}
        <div className="hidden sm:flex items-center justify-center gap-1 border rounded-full px-2 py-1.5 bg-neutral-100/50 dark:bg-neutral-800/50">
          {
            dockItems.map((item, idx) => (
              <div key={idx} className="relative">
                <span
                  onClick={item.onClick}
                  className={cn(
                    'relative z-10 cursor-pointer px-4 py-1.5 rounded-full transition-colors duration-200 text-sm font-medium block',
                    item.active
                      ? 'text-white dark:text-neutral-900'
                      : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                  )}
                >
                  {item.title}
                </span>
                {item.active && (
                  <motion.div
                    layoutId="nav-pill"
                    className="absolute inset-0 bg-neutral-900 dark:bg-white rounded-full shadow-sm"
                    transition={{ type: 'spring', bounce: 0.25, duration: 0.5 }}
                  />
                )}
              </div>
            ))
          }
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="sm:hidden p-2 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition-colors"
          >
            <List size={28} weight="bold" />
          </button>
        </div>

        {/* Mobile Slide-over Menu */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <>
              {/* Menu Panel */}
              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="fixed top-0 right-0 bottom-0 w-full h-screen bg-white dark:bg-neutral-900 z-50 p-6 shadow-2xl sm:hidden border-l border-neutral-100 dark:border-neutral-800"
              >
                <div className="flex justify-between items-center mb-8 bg-white">
                  <p className='font-logo text-3xl'>Momnts</p>
                  <button
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="p-2 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl"
                  >
                    <X size={24} weight="bold" />
                  </button>
                </div>

                <nav className="flex flex-col gap-2">
                  {dockItems.map((item, idx) => (
                    <button
                      key={idx}
                      onClick={item.onClick}
                      className={cn(
                        "flex items-center gap-4 px-4 py-4 rounded-2xl transition-all text-lg font-medium",
                        item.active
                          ? "bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white"
                          : "text-neutral-500 hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
                      )}
                    >
                      <div className="w-6 h-6">{item.icon}</div>
                      {item.title}
                    </button>
                  ))}
                </nav>

                {/* <div className="absolute bottom-8 left-6 right-6">
                  <div className="p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-2xl border border-neutral-100 dark:border-neutral-700">
                    <p className="text-xs text-neutral-400 uppercase tracking-widest font-semibold mb-1">Account</p>
                    <p className="text-sm text-neutral-600 dark:text-neutral-300">Managed by Momnts</p>
                  </div>
                </div> */}
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </header>
      <main className="flex-1 overflow-auto px-4 pb-4">
        <Outlet />
      </main>
    </div>
  )
}

export default DashboardLayout
