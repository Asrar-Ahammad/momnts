import { useEffect, useRef } from 'react'
import {
  Camera,
  UsersThree,
  MagnifyingGlass,
  ShieldCheck,
  Lightning,
  Bell,
} from '@phosphor-icons/react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

const features = [
  {
    icon: Camera,
    title: 'One Gallery, Zero Hassle',
    desc: 'Create an event, toss your friends an invite code, and watch everyone\'s best shots land in one beautiful shared album.',
  },
  {
    icon: MagnifyingGlass,
    title: 'Finds Faces Like Magic',
    desc: 'Drop in a photo and our clever AI spots every face in it — no tagging, no squinting, no "is that you in the back?"',
  },
  {
    icon: UsersThree,
    title: 'You, In Every Shot',
    desc: 'Momnts connects the dots across hundreds of photos and pulls up every single one you appear in. Stalker-level, but wholesome.',
  },
  {
    icon: Lightning,
    title: 'Blink and It\'s Done',
    desc: 'Photos get processed the second they\'re uploaded. By the time you grab a drink, your gallery is ready.',
  },
  {
    icon: Bell,
    title: 'Never Miss a Moment',
    desc: 'Get a ping the instant someone uploads new photos or when you\'re spotted in a shot. Stay in the loop without lifting a finger.',
  },
  {
    icon: ShieldCheck,
    title: 'Your Photos, Your Rules',
    desc: 'Organizers decide who uploads and who sees what. Everything stays within the event — no sneaky sharing, pinky promise.',
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
        { opacity: 0, y: 40 },
        {
          opacity: 1, y: 0, duration: 0.8, ease: 'power3.out',
          scrollTrigger: { trigger: header, start: 'top 85%', toggleActions: 'play none none none' }
        }
      )
    }

    // Animate cards with stagger
    cardsRef.current.forEach((card, i) => {
      if (!card) return
      gsap.fromTo(card,
        { opacity: 0, y: 48, scale: 0.96 },
        {
          opacity: 1, y: 0, scale: 1, duration: 0.7, delay: i * 0.1,
          ease: 'power3.out',
          scrollTrigger: { trigger: card, start: 'top 88%', toggleActions: 'play none none none' }
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
            Features
          </p>
          <h2 className="lp-section-title">
            Photo sharing that feels like magic
          </h2>
          <p className="lp-section-desc">
            Upload, discover, and relive — Momnts takes care of the boring stuff
            so you can get back to having fun.
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
