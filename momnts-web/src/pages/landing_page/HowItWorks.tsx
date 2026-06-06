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
    title: 'Initialize Event Space',
    desc: 'Instantiate your event gallery in seconds. Attendees join instantly using a unique, cryptographically secure access code.',
  },
  {
    num: '02',
    icon: UploadSimple,
    title: 'Consolidated Uploads',
    desc: 'Attendees upload high-resolution event media directly to our R2 buckets. Multiple uploads are queued and processed in parallel.',
  },
  {
    num: '03',
    icon: Sparkle,
    title: 'AI Face Routing',
    desc: 'Deep learning pipelines detect faces, compute embeddings, and dynamically map photos to individual attendee galleries.',
  },
]

const HowItWorks = () => {
  const sectionRef = useRef<HTMLElement>(null)
  const stepsRef = useRef<(HTMLDivElement | null)[]>([])
  const pathRef = useRef<SVGPathElement>(null)
  const mobileLineRef = useRef<SVGLineElement>(null)

  useEffect(() => {
    if (!sectionRef.current) return

    const header = sectionRef.current.querySelector('.lp-section-header')
    if (header) {
      gsap.fromTo(header,
        { opacity: 0, y: 30 },
        {
          opacity: 1, y: 0, duration: 0.8, ease: 'power3.out',
          scrollTrigger: { trigger: header, start: 'top 85%', toggleActions: 'play none none none' }
        }
      )
    }

    stepsRef.current.forEach((step, i) => {
      if (!step) return
      
      // Step card fade in
      gsap.fromTo(step,
        { opacity: 0, y: 40, scale: 0.96 },
        {
          opacity: 1, y: 0, scale: 1, duration: 0.7, delay: i * 0.12,
          ease: 'power3.out',
          scrollTrigger: { trigger: step, start: 'top 88%', toggleActions: 'play none none none' }
        }
      )

      // Step number pop on mobile / desktop
      const numEl = step.querySelector('.lp-step-number')
      if (numEl) {
        gsap.fromTo(numEl,
          { scale: 0, rotation: -20 },
          {
            scale: 1, rotation: 0, duration: 0.5, delay: i * 0.12 + 0.15,
            ease: 'back.out(1.5)',
            scrollTrigger: { trigger: step, start: 'top 88%', toggleActions: 'play none none none' }
          }
        )
      }
    })

    // Horizontal Desktop SVG line path animation
    if (pathRef.current) {
      const path = pathRef.current
      const length = path.getTotalLength()
      path.style.strokeDasharray = `${length}`
      path.style.strokeDashoffset = `${length}`

      gsap.to(path, {
        strokeDashoffset: 0,
        ease: 'none',
        scrollTrigger: {
          trigger: path,
          start: 'top 75%',
          end: 'bottom 40%',
          scrub: 1.2,
        }
      })
    }

    // Vertical Mobile SVG line path animation
    if (mobileLineRef.current) {
      const line = mobileLineRef.current
      const length = line.getBoundingClientRect().height || 600
      line.style.strokeDasharray = `${length}`
      line.style.strokeDashoffset = `${length}`

      gsap.to(line, {
        strokeDashoffset: 0,
        ease: 'none',
        scrollTrigger: {
          trigger: line,
          start: 'top 80%',
          end: 'bottom 50%',
          scrub: 1,
        }
      })
    }
  }, [])

  return (
    <section ref={sectionRef} id="how-it-works" className="lp-section">
      <div className="lp-section-inner">
        <div className="lp-section-header">
          <p className="lp-section-label">
            <Sparkle size={16} weight="fill" />
            System Workflow
          </p>
          <h2 className="lp-section-title">
            Streamlined from upload to discovery
          </h2>
          <p className="lp-section-desc">
            We handle image ingestion, face-geometry mapping, and routing, completely bypassing manual tagging processes.
          </p>
        </div>

        <div className="lp-steps relative">
          {/* Desktop SVG Connector Path (Solid Accent stroke) */}
          <div className="absolute top-[68px] left-[15%] right-[15%] w-[70%] h-4 pointer-events-none hidden md:block z-0">
            <svg className="w-full h-full overflow-visible" fill="none">
              <path
                ref={pathRef}
                d="M 0 2 C 200 20, 400 -20, 800 2"
                stroke="var(--lp-accent-color)"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            </svg>
          </div>

          {/* Mobile SVG Vertical Connector Path */}
          <div className="absolute top-[80px] bottom-[100px] left-1/2 -translate-x-1/2 w-1 pointer-events-none block md:hidden z-0">
            <svg className="w-full h-full overflow-visible" fill="none">
              <line
                ref={mobileLineRef}
                x1="0"
                y1="0"
                x2="0"
                y2="100%"
                stroke="var(--lp-accent-color)"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </div>

          {steps.map((s, i) => (
            <div
              key={s.num}
              ref={el => { stepsRef.current[i] = el }}
              className="lp-step z-10"
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
