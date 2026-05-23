import { useEffect, useRef } from 'react'
import {
  CalendarPlus,
  UploadSimple,
  Sparkle,
} from '@phosphor-icons/react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

const steps = [
  {
    num: '01',
    icon: CalendarPlus,
    title: 'Create or Join',
    desc: 'Spin up an event in seconds or hop into one with a code. Share it with your squad — the more, the merrier.',
  },
  {
    num: '02',
    icon: UploadSimple,
    title: 'Snap & Upload',
    desc: 'Everyone dumps their best (and worst) photos into the gallery. The more chaos, the better the memories.',
  },
  {
    num: '03',
    icon: Sparkle,
    title: 'Sit Back & Watch',
    desc: 'Our AI plays detective — finds your face across every photo and serves up your personal highlight reel. Like magic, but real.',
  },
]

const HowItWorks = () => {
  const sectionRef = useRef<HTMLElement>(null)
  const stepsRef = useRef<(HTMLDivElement | null)[]>([])

  useEffect(() => {
    if (!sectionRef.current) return

    const header = sectionRef.current.querySelector('.lp-section-header')
    if (header) {
      gsap.fromTo(header,
        { opacity: 0, y: 40 },
        {
          opacity: 1, y: 0, duration: 0.8, ease: 'power3.out',
          scrollTrigger: { trigger: header, start: 'top 85%', toggleActions: 'play none none none' }
        }
      )
    }

    stepsRef.current.forEach((step, i) => {
      if (!step) return
      gsap.fromTo(step,
        { opacity: 0, y: 40 },
        {
          opacity: 1, y: 0, duration: 0.7, delay: i * 0.15,
          ease: 'power3.out',
          scrollTrigger: { trigger: step, start: 'top 88%', toggleActions: 'play none none none' }
        }
      )

      // Animate the step number with a scale pop
      const numEl = step.querySelector('.lp-step-number')
      if (numEl) {
        gsap.fromTo(numEl,
          { scale: 0, rotation: -30 },
          {
            scale: 1, rotation: 0, duration: 0.6, delay: i * 0.15 + 0.2,
            ease: 'back.out(1.7)',
            scrollTrigger: { trigger: step, start: 'top 88%', toggleActions: 'play none none none' }
          }
        )
      }
    })

    // Animate the connecting line
    const line = sectionRef.current.querySelector('.lp-steps-line')
    if (line) {
      gsap.fromTo(line,
        { scaleX: 0 },
        {
          scaleX: 1, duration: 1.2, ease: 'power2.inOut',
          scrollTrigger: { trigger: line, start: 'top 85%', toggleActions: 'play none none none' }
        }
      )
    }
  }, [])

  return (
    <section ref={sectionRef} id="how-it-works" className="lp-section">
      <div className="lp-section-inner">
        <div className="lp-section-header">
          <p className="lp-section-label">
            <Sparkle size={16} weight="fill" />
            How it works
          </p>
          <h2 className="lp-section-title">
            Stupid simple. Seriously.
          </h2>
          <p className="lp-section-desc">
            No setup headaches. No awkward "can you tag me?" texts.
            Just three steps and you’re golden.
          </p>
        </div>

        <div className="lp-steps" style={{ position: 'relative' }}>
          {/* Animated connecting line */}
          <div
            className="lp-steps-line"
            style={{
              position: 'absolute',
              top: 36,
              left: 'calc(16.66% + 24px)',
              right: 'calc(16.66% + 24px)',
              height: 1,
              background: `linear-gradient(90deg, var(--lp-border), var(--lp-text-muted), var(--lp-border))`,
              transformOrigin: 'left center',
              zIndex: 1,
            }}
            aria-hidden="true"
          />

          {steps.map((s, i) => (
            <div
              key={s.num}
              ref={el => { stepsRef.current[i] = el }}
              className="lp-step"
              style={{ opacity: 0 }}
            >
              <div className="lp-step-number">{s.num}</div>
              <h3 className="lp-step-title">{s.title}</h3>
              <p className="lp-step-desc">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default HowItWorks
