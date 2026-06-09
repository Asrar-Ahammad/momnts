import { useEffect, useRef } from 'react'
import { Link } from 'react-router'
import { ArrowRight, Sparkle } from '@phosphor-icons/react'
import gsap from 'gsap'
import ThreeDShowcase from './ThreeDShowcase'

interface HeroSectionProps {
  theme: string
  introReady?: boolean
}

const HeroSection = ({ theme, introReady = true }: HeroSectionProps) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const badgeRef = useRef<HTMLDivElement>(null)
  const titleRef = useRef<HTMLHeadingElement>(null)
  const subtitleRef = useRef<HTMLParagraphElement>(null)
  const ctaRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!introReady) return

    const tl = gsap.timeline({ defaults: { ease: 'power4.out' } })

    tl.fromTo(badgeRef.current,
      { opacity: 0, y: 30, filter: 'blur(10px)' },
      { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.8, delay: 0.5 } // delayed to let blob settle
    )
    .fromTo(titleRef.current,
      { opacity: 0, y: 40, filter: 'blur(12px)' },
      { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.9 },
      '-=0.5'
    )
    .fromTo(subtitleRef.current,
      { opacity: 0, y: 30, filter: 'blur(10px)' },
      { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.8 },
      '-=0.6'
    )
    .fromTo(ctaRef.current,
      { opacity: 0, y: 20, filter: 'blur(8px)' },
      { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.7 },
      '-=0.5'
    )
  }, [introReady])

  useEffect(() => {
    // Parallax effect on scroll
    const handleScroll = () => {
      const scrollY = window.scrollY
      if (containerRef.current) {
        gsap.to(containerRef.current, {
          y: scrollY * 0.15,
          opacity: 1 - scrollY / 800,
          overwrite: 'auto',
          duration: 0.1,
        })
      }
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <section id="intro" className="lp-hero relative flex items-center justify-center min-h-screen">
      {/* 3D Particle Showcase Canvas Background */}
      <ThreeDShowcase theme={theme} />

      {/* Decorative Glows */}
      <div className="lp-hero-glow lp-hero-glow--purple" aria-hidden="true" />
      <div className="lp-hero-glow lp-hero-glow--amber" aria-hidden="true" />

      {/* Hero Content Container */}
      <div ref={containerRef} className="z-10 max-w-4xl px-4 flex flex-col items-center">
        {/* Badge */}
        <div ref={badgeRef} className="lp-hero-badge" style={{ opacity: 0 }}>
          <span className="lp-hero-badge-dot" />
          Pre-Launch Preview
        </div>

        {/* Title */}
        <h1 ref={titleRef} className="lp-hero-title" style={{ opacity: 0 }}>
          Every face tells a <span className="lp-hero-title-accent">story.</span>
          <br />Momnts finds them all.
        </h1>

        {/* Subtitle */}
        <p ref={subtitleRef} className="lp-hero-subtitle" style={{ opacity: 0 }}>
          A secure, identity-first event photo vault. Upload group pictures and let AI automatically route every photo you appear in directly to your personal gallery.
        </p>

        {/* CTAs */}
        <div ref={ctaRef} className="lp-hero-cta-group" style={{ opacity: 0 }}>
          <Link to="/register" className="lp-btn lp-btn--primary">
            Start for free
            <ArrowRight size={18} weight="bold" />
          </Link>
          <a href="#features" className="lp-btn lp-btn--ghost">
            <Sparkle size={18} weight="fill" />
            Explore features
          </a>
        </div>
      </div>
    </section>
  )
}

export default HeroSection
