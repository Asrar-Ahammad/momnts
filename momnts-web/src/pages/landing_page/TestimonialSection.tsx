import { useEffect, useRef } from 'react'
import { Quotes } from '@phosphor-icons/react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

const TestimonialSection = () => {
  const sectionRef = useRef<HTMLElement>(null)

  useEffect(() => {
    if (!sectionRef.current) return

    const card = sectionRef.current.querySelector('.lp-testimonial-card')
    if (card) {
      gsap.fromTo(card,
        { opacity: 0, y: 40 },
        {
          opacity: 1, y: 0, duration: 0.9, ease: 'power3.out',
          scrollTrigger: { trigger: card, start: 'top 85%', toggleActions: 'play none none none' }
        }
      )
    }

    const quote = sectionRef.current.querySelector('.lp-quote-icon')
    if (quote) {
      gsap.fromTo(quote,
        { opacity: 0, scale: 0, rotation: -45 },
        {
          opacity: 0.08, scale: 1, rotation: 0, duration: 0.8, ease: 'back.out(1.7)',
          scrollTrigger: { trigger: quote, start: 'top 88%', toggleActions: 'play none none none' }
        }
      )
    }
  }, [])

  return (
    <section ref={sectionRef} className="lp-section lp-testimonial-section">
      <div className="lp-section-inner">
        <div className="lp-testimonial-card" style={{ position: 'relative' }}>
          {/* Decorative quote icon */}
          <Quotes
            size={120}
            weight="fill"
            className="lp-quote-icon"
            style={{
              position: 'absolute',
              top: -20,
              left: -10,
              opacity: 0,
              color: 'var(--lp-text)',
              pointerEvents: 'none',
            }}
          />

          <p className="lp-testimonial-quote">
            "200+ guests at our wedding, everyone snapping photos on their phones.
            Momnts pulled together every single shot we appeared in — before the
            honeymoon even started. Absolute game changer."
          </p>

          <div className="lp-testimonial-author">
            <div className="lp-testimonial-avatar">S</div>
            <div className="lp-testimonial-info">
              <div className="lp-testimonial-name">Sarah & James</div>
              <div className="lp-testimonial-role">Wedding, 2025</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default TestimonialSection
