import { useEffect, useRef } from 'react'
import {
  Brain,
  CloudArrowUp,
  ShieldCheck,
  Broadcast,
  Sliders,
  Fingerprint,
  Lightning,
} from '@phosphor-icons/react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

const features = [
  {
    icon: Brain,
    title: 'Neural Face Clustering',
    desc: 'Powered by ArcFace and RetinaFace models. Detects and groups matching faces in group photos with 99.2% vector classification accuracy.',
  },
  {
    icon: CloudArrowUp,
    title: 'Direct Object Storage Uplinks',
    desc: 'Bypasses backend server congestion. Uploads raw images directly to Cloudflare R2 bucket using secure AWS S3 presigned URLs.',
  },
  {
    icon: ShieldCheck,
    title: 'Event-Scoped Sandbox Isolation',
    desc: 'Security checks verified at the database query level. Zero cross-tenant data leaks — photos and face profiles stay isolated by event ID.',
  },
  {
    icon: Broadcast,
    title: 'Real-time WebSocket Sync',
    desc: 'Instant notifications pushed via Socket.IO. Gets triggered the exact second you are identified in a newly processed photo feed.',
  },
  {
    icon: Sliders,
    title: 'Adaptive Resource Constraints',
    desc: 'Intelligent request clamping. Limits calculations dynamically factor organizer plans and attendee override settings.',
  },
  {
    icon: Fingerprint,
    title: 'Selfie Identity Claiming',
    desc: 'Upload a single selfie to generate your unique face vector. Automatically claims matching profiles and populates your gallery.',
  },
]

const FeaturesSection = () => {
  const sectionRef = useRef<HTMLElement>(null)
  const cardsRef = useRef<(HTMLDivElement | null)[]>([])

  useEffect(() => {
    if (!sectionRef.current) return

    // Animate section header
    const header = sectionRef.current.querySelector('.lp-section-header')
    if (header) {
      gsap.fromTo(header,
        { opacity: 0, y: 30 },
        {
          opacity: 1,
          y: 0,
          duration: 0.8,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: header,
            start: 'top 85%',
            toggleActions: 'play none none none',
          },
        }
      )
    }

    // Animate cards with stagger on scroll
    cardsRef.current.forEach((card, i) => {
      if (!card) return
      gsap.fromTo(card,
        { opacity: 0, y: 40, scale: 0.95 },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.7,
          delay: (i % 3) * 0.1,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: card,
            start: 'top 88%',
            toggleActions: 'play none none none',
          },
        }
      )
    })
  }, [])

  return (
    <section ref={sectionRef} id="features" className="lp-section">
      <div className="lp-section-inner">
        <div className="lp-section-header">
          <p className="lp-section-label">
            <Lightning size={16} weight="fill" />
            Capabilities
          </p>
          <h2 className="lp-section-title">
            Engineered for high-scale media sharing
          </h2>
          <p className="lp-section-desc">
            No complex setup. No configuration loops. Deep computer vision models combined
            with distributed queue pipelines process event media in seconds.
          </p>
        </div>

        <div className="lp-features-grid">
          {features.map((f, i) => (
            <div
              key={f.title}
              ref={el => { cardsRef.current[i] = el }}
              className="lp-feature-card"
              style={{ opacity: 0 }}
            >
              <div className="lp-feature-icon">
                <f.icon size={26} weight="duotone" />
              </div>
              <h3 className="lp-feature-title">{f.title}</h3>
              <p className="lp-feature-desc">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default FeaturesSection
