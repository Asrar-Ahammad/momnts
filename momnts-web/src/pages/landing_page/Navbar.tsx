import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { ArrowRight, Sun, Moon } from '@phosphor-icons/react'
import { useTheme } from 'next-themes'
import { flushSync } from 'react-dom'
import gsap from 'gsap'

interface NavbarProps {
  showProgress?: boolean
}

const Navbar = ({ showProgress = false }: NavbarProps = {}) => {
  const [scrolled, setScrolled] = useState(false)
  const navRef = useRef<HTMLElement>(null)
  const progressRef = useRef<HTMLDivElement>(null)
  const { theme, setTheme, resolvedTheme } = useTheme()

  const toggleTheme = (e: React.MouseEvent) => {
    const nextTheme = resolvedTheme === 'dark' ? 'light' : 'dark'
    const doc = document as any

    if (!doc.startViewTransition || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setTheme(nextTheme)
      return
    }

    const x = e.clientX || window.innerWidth / 2
    const y = e.clientY || window.innerHeight / 2

    const transition = doc.startViewTransition(() => {
      flushSync(() => {
        setTheme(nextTheme)
      })
    })

    transition.ready.then(() => {
      const radius = Math.hypot(
        Math.max(x, window.innerWidth - x),
        Math.max(y, window.innerHeight - y)
      )

      document.documentElement.animate(
        {
          clipPath: [
            `circle(0px at ${x}px ${y}px)`,
            `circle(${radius}px at ${x}px ${y}px)`,
          ],
        },
        {
          duration: 500,
          easing: 'ease-in-out',
          pseudoElement: '::view-transition-new(root)',
        }
      )
    })
  }

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 40)
      
      if (showProgress && progressRef.current) {
        const totalHeight = document.documentElement.scrollHeight - window.innerHeight
        if (totalHeight > 0) {
          const progress = (window.scrollY / totalHeight) * 100
          progressRef.current.style.width = `${progress}%`
        }
      }
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll() // Initialize
    return () => window.removeEventListener('scroll', handleScroll)
  }, [showProgress])

  useEffect(() => {
    if (!navRef.current) return
    const items = navRef.current.querySelectorAll('.lp-nav-item')
    gsap.fromTo(
      items,
      { opacity: 0, y: -16 },
      { opacity: 1, y: 0, duration: 0.7, stagger: 0.08, ease: 'power3.out', delay: 0.2 }
    )
  }, [])

  return (
    <nav ref={navRef} className={`lp-navbar overflow-hidden backdrop-blur-xl ${scrolled ? 'scrolled' : ''}`}>
      <div className="lp-navbar-inner">
        <Link to="/" className="lp-logo lp-nav-item">
          Momnts
        </Link>

        <div className="lp-nav-actions">
          <a href="#features" className="lp-nav-link lp-nav-item hidden sm:inline-flex">Capabilities</a>
          <a href="#how-it-works" className="lp-nav-link lp-nav-item hidden sm:inline-flex">Workflow</a>
          <button 
            onClick={toggleTheme}
            className="lp-nav-link lp-nav-item flex items-center justify-center p-2 rounded-full hover:bg-[var(--lp-accent-soft)] transition-colors cursor-pointer text-[var(--lp-text-secondary)] hover:text-[var(--lp-text)] border-none bg-transparent"
            aria-label="Toggle Theme"
            style={{ width: '32px', height: '32px', padding: 0 }}
          >
            {resolvedTheme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <Link to="/login" className="lp-nav-link lp-nav-item">Log in</Link>
          <Link to="/register" className="lp-nav-btn lp-nav-btn--primary lp-nav-item">
            Get Started
            <ArrowRight size={16} weight="bold" />
          </Link>
        </div>
      </div>

      {showProgress && (
        <div 
          ref={progressRef}
          className="absolute bottom-0 left-0 h-[3px] bg-violet-600 z-[101] transition-none" 
          style={{ width: '0%' }}
        />
      )}
    </nav>
  )
}

export default Navbar
