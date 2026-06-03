import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { ArrowRight } from '@phosphor-icons/react'
import gsap from 'gsap'

interface NavbarProps {
  showProgress?: boolean
}

const Navbar = ({ showProgress }: NavbarProps = {}) => {
  const [scrolled, setScrolled] = useState(false)
  const navRef = useRef<HTMLElement>(null)
  const progressRef = useRef<HTMLDivElement>(null)

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
    <nav ref={navRef} className={`lp-navbar ${scrolled ? 'scrolled' : ''}`}>
      <div className="lp-navbar-inner">
        <Link to="/" className="lp-logo lp-nav-item">
          Momnts
        </Link>

        <div className="lp-nav-actions">
          <a href="#features" className="lp-nav-link lp-nav-item hidden sm:inline-flex">Features</a>
          <a href="#how-it-works" className="lp-nav-link lp-nav-item hidden sm:inline-flex">How it works</a>
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
          className="absolute bottom-0 left-0 h-[3px] bg-gradient-to-r from-violet-500 via-fuchsia-500 to-violet-600 z-[101] transition-none" 
          style={{ width: '0%' }}
        />
      )}
    </nav>
  )
}

export default Navbar
