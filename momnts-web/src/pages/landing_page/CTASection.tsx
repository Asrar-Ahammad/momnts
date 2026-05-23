import { useEffect, useRef } from 'react'
import { Link } from 'react-router'
import { ArrowRight } from '@phosphor-icons/react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

const CTASection = () => {
  const sectionRef = useRef<HTMLElement>(null)
  const titleRef = useRef<HTMLHeadingElement>(null)
  const descRef = useRef<HTMLParagraphElement>(null)
  const btnRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!sectionRef.current) return

    gsap.fromTo(titleRef.current,
      { opacity: 0, y: 40 },
      {
        opacity: 1, y: 0, duration: 0.8, ease: 'power3.out',
        scrollTrigger: { trigger: sectionRef.current, start: 'top 75%', toggleActions: 'play none none none' }
      }
    )

    gsap.fromTo(descRef.current,
      { opacity: 0, y: 30 },
      {
        opacity: 1, y: 0, duration: 0.7, delay: 0.15, ease: 'power3.out',
        scrollTrigger: { trigger: sectionRef.current, start: 'top 75%', toggleActions: 'play none none none' }
      }
    )

    gsap.fromTo(btnRef.current,
      { opacity: 0, y: 24 },
      {
        opacity: 1, y: 0, duration: 0.6, delay: 0.3, ease: 'power3.out',
        scrollTrigger: { trigger: sectionRef.current, start: 'top 75%', toggleActions: 'play none none none' }
      }
    )
  }, [])

  return (
    <section ref={sectionRef} className="lp-cta-section">
      <h2 ref={titleRef} className="lp-cta-title" style={{ opacity: 0 }}>
        Stop losing photos.<br />Start reliving them.
      </h2>
      <p ref={descRef} className="lp-cta-desc" style={{ opacity: 0 }}>
        Your next event deserves better than a messy group chat.
        Give it a Momnts gallery and make everyone\u2019s day.
      </p>
      <div ref={btnRef} style={{ opacity: 0 }}>
        <Link to="/register" className="lp-btn lp-btn--primary">
          Create your first event
          <ArrowRight size={18} weight="bold" />
        </Link>
      </div>
    </section>
  )
}

export default CTASection
