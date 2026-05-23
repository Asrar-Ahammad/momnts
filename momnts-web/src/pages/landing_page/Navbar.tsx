import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { ArrowRight } from '@phosphor-icons/react'
import gsap from 'gsap'

const Navbar = () => {
  const [scrolled, setScrolled] = useState(false)
  const navRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

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
    </nav>
  )
}

export default Navbar
