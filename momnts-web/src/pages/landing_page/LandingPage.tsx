import { useEffect, useState } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useNavigate } from 'react-router'
import Lenis from 'lenis'
import { useTheme } from 'next-themes'
import { useAuth } from '../../features/auth/hooks/useAuth'

import './landing.css'
import Navbar from './Navbar'
import HeroSection from './HeroSection'
import CursorBlob from './CursorBlob'
import ScrollComet from './ScrollComet'
import FeaturesSection from './FeaturesSection'
import E2EESection from './E2EESection'
import EventChatsSection from './EventChatsSection'
import DecorativeSVG from './DecorativeSVG'
import HowItWorks from './HowItWorks'
import StatsSection from './StatsSection'
import TestimonialSection from './TestimonialSection'
import CTASection from './CTASection'
import Footer from './Footer'

gsap.registerPlugin(ScrollTrigger)

const LandingPage = () => {
  const { user, loading } = useAuth()
  const navigate = useNavigate()
  const isPWA = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone
  const [loaderVisible, setLoaderVisible] = useState(true)
  const { theme, resolvedTheme } = useTheme()

  const [currentTheme, setCurrentTheme] = useState<'dark' | 'light'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme')
      if (saved === 'dark' || saved === 'light') return saved
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    }
    return 'dark'
  })

  useEffect(() => {
    if (resolvedTheme === 'dark' || resolvedTheme === 'light') {
      setCurrentTheme(resolvedTheme)
    }
  }, [resolvedTheme])

  useEffect(() => {
    if (isPWA && !loading) {
      if (user) {
        navigate('/dashboard', { replace: true })
      } else {
        navigate('/login', { replace: true })
      }
    }
  }, [isPWA, loading, user, navigate])

  useEffect(() => {
    // Initialize Lenis Smooth Scroll
    const lenis = new Lenis({
      duration: 1.5,
      wheelMultiplier: 0.6,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // easeOutExpo
      smoothWheel: true,
    })

    // Connect Lenis to GSAP ScrollTrigger updates
    lenis.on('scroll', ScrollTrigger.update)

    // Bind Lenis raf to GSAP ticker
    const tick = (time: number) => {
      lenis.raf(time * 1000)
    }
    gsap.ticker.add(tick)
    gsap.ticker.lagSmoothing(0)

    // Enable smooth scroll for anchor links using Lenis scrolling action
    const handleAnchorClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest('a')
      if (target && target.hash) {
        const el = document.querySelector(target.hash)
        if (el) {
          e.preventDefault()
          lenis.scrollTo(el)
        }
      }
    }

    document.addEventListener('click', handleAnchorClick)

    // Page loader camera shutter iris animation sequence
    const tl = gsap.timeline()
    tl.fromTo('#page-loader-text',
      { opacity: 0, scale: 0.95, filter: 'blur(10px)' },
      { opacity: 1, scale: 1, filter: 'blur(0px)', duration: 0.8, ease: 'power2.out', delay: 0.2 }
    )
    .to('#page-loader-text', {
      opacity: 0,
      scale: 1.05,
      filter: 'blur(5px)',
      duration: 0.5,
      delay: 0.4,
      ease: 'power2.in',
    })
    .to('#page-iris-loader', {
      clipPath: 'circle(0% at 50% 50%)',
      duration: 1.1,
      ease: 'power4.inOut',
      onComplete: () => {
        setLoaderVisible(false)
      }
    })

    // Refresh ScrollTrigger after all content loads
    const timeout = setTimeout(() => ScrollTrigger.refresh(), 100)

    return () => {
      document.removeEventListener('click', handleAnchorClick)
      clearTimeout(timeout)
      gsap.ticker.remove(tick)
      lenis.destroy()
      ScrollTrigger.getAll().forEach(t => t.kill())
    }
  }, [])

  if (isPWA) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-neutral-950">
        <div className="w-8 h-8 border-2 border-neutral-300 border-t-neutral-600 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className={`landing-root ${currentTheme}`}>
      <CursorBlob introReady={!loaderVisible} />
      <ScrollComet />
      {/* Clip-path shutter opening loader */}
      {loaderVisible && (
        <div 
          id="page-iris-loader"
          className="fixed inset-0 w-full h-screen bg-[var(--lp-bg)] z-[9999] flex flex-col items-center justify-center"
          style={{ clipPath: 'circle(150% at 50% 50%)' }}
        >
          <div id="page-loader-text" style={{ opacity: 0 }} className="flex flex-col items-center text-center">
            <span className="text-4xl text-[var(--lp-text)] font-bold tracking-wide" style={{ fontFamily: 'BulgaryRose, serif' }}>
              Momnts
            </span>
            <span className="text-[10px] text-[var(--lp-text-secondary)] uppercase tracking-[0.2em] mt-3 font-mono">
              Calibrating AI Lens
            </span>
          </div>
        </div>
      )}

      <Navbar />
      <main>
        <HeroSection theme={currentTheme} introReady={!loaderVisible} />
        <DecorativeSVG />
        <FeaturesSection />
        <E2EESection />
        <EventChatsSection />
        <HowItWorks />
        <StatsSection />
        <TestimonialSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  )
}

export default LandingPage