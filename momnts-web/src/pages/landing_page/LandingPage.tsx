import { useEffect } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

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