import { useEffect, useRef } from 'react'
import { Eye, Shield, Cpu } from '@phosphor-icons/react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

const TestimonialSection = () => {
  const sectionRef = useRef<HTMLElement>(null)
  const visionPanelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!sectionRef.current) return

    if (visionPanelRef.current) {
      gsap.fromTo(visionPanelRef.current,
        { opacity: 0, y: 50, scale: 0.98 },
        {
          opacity: 1, y: 0, scale: 1, duration: 0.8, ease: 'power3.out',
          scrollTrigger: {
            trigger: visionPanelRef.current,
            start: 'top 80%',
            toggleActions: 'play none none none',
          }
        }
      )
    }
  }, [])

  return (
    <section ref={sectionRef} id="vision" className="lp-section">
      <div className="lp-section-inner">
        <div ref={visionPanelRef} className="lp-vision-panel" style={{ opacity: 0 }}>
          <div className="lp-vision-glow" />
          
          <h2 className="lp-vision-title">
            The Product Philosophy
          </h2>
          
          <p className="lp-vision-text">
            Traditional photo sharing is fragmented. Group chats compromise image resolution, 
            social platforms force intrusive tagging, and manual albums require constant follow-ups. 
            Momnts operates on a different principle: secure, automated vector routing. We connect 
            event media directly to the individuals in them, keeping privacy isolated and user effort at zero.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8 pt-8 border-t border-[var(--lp-border)]">
            <div className="flex flex-col items-center text-center p-4">
              <div className="w-10 h-10 rounded-full bg-violet-500/10 flex items-center justify-center text-violet-400 mb-3">
                <Shield size={20} weight="duotone" />
              </div>
              <h4 className="text-sm font-semibold text-[var(--lp-text)] mb-1">Zero-Leak Privacy</h4>
              <p className="text-xs text-[var(--lp-text-secondary)]">All face profiles are scoped by event ID and isolated completely.</p>
            </div>
            
            <div className="flex flex-col items-center text-center p-4">
              <div className="w-10 h-10 rounded-full bg-fuchsia-500/10 flex items-center justify-center text-fuchsia-400 mb-3">
                <Cpu size={20} weight="duotone" />
              </div>
              <h4 className="text-sm font-semibold text-[var(--lp-text)] mb-1">Asynchronous Compute</h4>
              <p className="text-xs text-[var(--lp-text-secondary)]">Offloaded image processing using BullMQ background workers.</p>
            </div>

            <div className="flex flex-col items-center text-center p-4">
              <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400 mb-3">
                <Eye size={20} weight="duotone" />
              </div>
              <h4 className="text-sm font-semibold text-[var(--lp-text)] mb-1">No Fake Profiles</h4>
              <p className="text-xs text-[var(--lp-text-secondary)]">Vector space similarity matches verify face structures accurately.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default TestimonialSection
