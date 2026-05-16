import { Outlet, useNavigate, useLocation } from 'react-router';
import { House, Ticket, User } from "@phosphor-icons/react"
import { motion } from 'framer-motion'
import { cn } from '../lib/utils'
import { ThemeToggle } from '../components/theme-toggle'
import NotificationsPopover from '../components/NotificationsPopover'

const DashboardLayout = () => {
  const navigate = useNavigate()
  const location = useLocation()

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
      <header className="px-6 py-4 flex justify-between items-center bg-white/70 dark:bg-neutral-950/70 backdrop-blur-md sticky top-0 z-40">
        <div className="flex items-center gap-4">
          <p 
            className='font-logo text-3xl select-none cursor-pointer tracking-tight'
            onClick={() => navigate('/dashboard')}
          >
            Momnts
          </p>
        </div>

        {/* Desktop Navigation Pill */}
        <nav className="hidden md:flex items-center gap-1 border border-neutral-200/60 dark:border-neutral-800/60 rounded-full px-1.5 py-1.5 bg-neutral-50/50 dark:bg-neutral-900/50 shadow-sm">
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

        <div className="flex items-center gap-3">
          <NotificationsPopover />
          <div className="h-4 w-px bg-neutral-200 dark:bg-neutral-800 hidden sm:block mx-1" />
          <ThemeToggle />
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-auto pb-24 md:pb-8">
        <Outlet />
      </main>

      {/* Mobile Floating Bottom Bar */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 md:hidden w-[90%] max-w-[360px]">
        <nav className="flex items-center justify-around bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md border border-white/10 dark:border-neutral-800 rounded-[28px] p-2 shadow-2xl ring-1 ring-black/5 dark:ring-white/5">
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
