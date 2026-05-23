import { useEffect, useRef } from 'react'
import { Link } from 'react-router'
import { ArrowRight, Play } from '@phosphor-icons/react'
import gsap from 'gsap'

const HeroSection = () => {
  const heroRef = useRef<HTMLDivElement>(null)
  const titleRef = useRef<HTMLHeadingElement>(null)
  const subtitleRef = useRef<HTMLParagraphElement>(null)
  const ctaRef = useRef<HTMLDivElement>(null)
  const mockupRef = useRef<HTMLDivElement>(null)
  const badgeRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!heroRef.current) return
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })

    tl.fromTo(badgeRef.current,
      { opacity: 0, y: 20, scale: 0.9 },
      { opacity: 1, y: 0, scale: 1, duration: 0.6, delay: 0.3 }
    )
    .fromTo(titleRef.current,
      { opacity: 0, y: 40 },
      { opacity: 1, y: 0, duration: 0.8 },
      '-=0.3'
    )
    .fromTo(subtitleRef.current,
      { opacity: 0, y: 30 },
      { opacity: 1, y: 0, duration: 0.7 },
      '-=0.4'
    )
    .fromTo(ctaRef.current,
      { opacity: 0, y: 24 },
      { opacity: 1, y: 0, duration: 0.6 },
      '-=0.3'
    )
    .fromTo(mockupRef.current,
      { opacity: 0, y: 60, scale: 0.95 },
      { opacity: 1, y: 0, scale: 1, duration: 1, ease: 'power2.out' },
      '-=0.4'
    )

    // Parallax effect on glows
    const glows = heroRef.current.querySelectorAll('.lp-hero-glow')
    gsap.to(glows[0], {
      x: 50, y: -30,
      scrollTrigger: { trigger: heroRef.current, start: 'top top', end: 'bottom top', scrub: 1 }
    })
  }, [])

  return (
    <section ref={heroRef} className="lp-hero">
      {/* Background glows */}
      <div className="lp-hero-glow lp-hero-glow--purple" aria-hidden="true" />
      <div className="lp-hero-glow lp-hero-glow--amber" aria-hidden="true" />

      {/* Badge */}
      <div ref={badgeRef} className="lp-hero-badge" style={{ opacity: 0 }}>
        <span className="lp-hero-badge-dot" />
        AI-Powered Photo Sharing for Events
      </div>

      {/* Title */}
      <h1 ref={titleRef} className="lp-hero-title" style={{ opacity: 0 }}>
        Every face tells a{' '}
        <span className="lp-hero-title-accent">story</span>
      </h1>

      {/* Subtitle */}
      <p ref={subtitleRef} className="lp-hero-subtitle" style={{ opacity: 0 }}>
        Upload your event photos and let the magic happen. We find every face,
        group them together, and serve up your personal highlight reel — no
        tagging required.
      </p>

      {/* CTAs */}
      <div ref={ctaRef} className="lp-hero-cta-group" style={{ opacity: 0 }}>
        <Link to="/register" className="lp-btn lp-btn--primary">
          Start for free
          <ArrowRight size={18} weight="bold" />
        </Link>
        <a href="#how-it-works" className="lp-btn lp-btn--ghost">
          <Play size={18} weight="fill" />
          See how it works
        </a>
      </div>

      {/* Mockup */}
      <div ref={mockupRef} className="lp-hero-mockup" style={{ opacity: 0 }}>
        <img
          src="/hero_mockup.png"
          alt="Momnts app showing an event photo gallery with AI-detected faces"
          loading="eager"
          fetchPriority="high"
        />
      </div>
    </section>
  )
}

export default HeroSection
