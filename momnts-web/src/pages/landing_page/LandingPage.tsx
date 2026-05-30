import { useEffect } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useNavigate } from 'react-router'
import { useAuth } from '../../features/auth/hooks/useAuth'

import './landing.css'
import Navbar from './Navbar'
import HeroSection from './HeroSection'
import FeaturesSection from './FeaturesSection'
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
    // Enable smooth scroll for anchor links
    const handleAnchorClick = (e: MouseEvent) => {
      const target = e.target as HTMLAnchorElement
      if (target.tagName === 'A' && target.hash) {
        const el = document.querySelector(target.hash)
        if (el) {
          e.preventDefault()
          el.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
      }
    }

    document.addEventListener('click', handleAnchorClick)

    // Refresh ScrollTrigger after all content loads
    const timeout = setTimeout(() => ScrollTrigger.refresh(), 100)

    return () => {
      document.removeEventListener('click', handleAnchorClick)
      clearTimeout(timeout)
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
    <div className="landing-root">
      <Navbar />
      <main>
        <HeroSection />
        <DecorativeSVG />
        <FeaturesSection />
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