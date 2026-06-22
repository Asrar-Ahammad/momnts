import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

const ScrollComet = () => {
  const trackRef = useRef<HTMLDivElement>(null)
  const cometRef = useRef<HTMLDivElement>(null)
  const progressLineRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const track = trackRef.current
    const comet = cometRef.current
    const progressLine = progressLineRef.current
    if (!track || !comet || !progressLine) return

    const updatePosition = () => {
      const trackHeight = track.clientHeight
      const cometHeight = comet.clientHeight

      // ScrollTrigger for the Comet head position
      gsap.fromTo(comet,
        { y: 0 },
        {
          y: trackHeight - cometHeight,
          ease: 'none',
          scrollTrigger: {
            trigger: 'body',
            start: 'top top',
            end: 'bottom bottom',
            scrub: 0.5,
            invalidateOnRefresh: true,
          }
        }
      )

      // ScrollTrigger for the glowing progress bar trail
      gsap.fromTo(progressLine,
        { height: 0 },
        {
          height: trackHeight - cometHeight,
          ease: 'none',
          scrollTrigger: {
            trigger: 'body',
            start: 'top top',
            end: 'bottom bottom',
            scrub: 0.5,
            invalidateOnRefresh: true,
          }
        }
      )
    }

    updatePosition()

    window.addEventListener('resize', updatePosition)
    return () => window.removeEventListener('resize', updatePosition)
  }, [])

  return (
    <div
      ref={trackRef}
      className="fixed left-6 top-[22vh] bottom-[22vh] w-28 pointer-events-none z-[999] hidden lg:block"
      aria-hidden="true"
    >
      {/* SciFi Telemetry Track (Dashed) */}
      <div 
        className="absolute left-[30px] top-0 bottom-0 w-[1px] opacity-25 -translate-x-1/2"
        style={{ borderLeft: '1px dashed var(--lp-text)' }}
      />

      {/* Active Laser Scrolled Progress Line */}
      <div 
        ref={progressLineRef}
        className="absolute left-[30px] top-0 w-[2px] bg-violet-500 -translate-x-1/2 shadow-[0_0_8px_#8b5cf6,0_0_20px_#8b5cf6]"
      />

      {/* Clickable Index Section Names */}
      <a 
        href="#intro" 
        className="lp-comet-nav absolute left-[44px] top-0 text-[8px] font-mono uppercase tracking-[0.18em] text-[var(--lp-text-secondary)] hover:text-violet-400 select-none pointer-events-auto transition-colors duration-250 whitespace-nowrap cursor-pointer"
      >
        Intro
      </a>
      <a 
        href="#features" 
        style={{ top: '16.6%' }}
        className="lp-comet-nav absolute left-[44px] text-[8px] font-mono uppercase tracking-[0.18em] text-[var(--lp-text-secondary)] hover:text-violet-400 select-none pointer-events-auto transition-colors duration-250 -translate-y-1/2 whitespace-nowrap cursor-pointer"
      >
        Capabilities
      </a>
      <a 
        href="#e2ee" 
        style={{ top: '33.3%' }}
        className="lp-comet-nav absolute left-[44px] text-[8px] font-mono uppercase tracking-[0.18em] text-[var(--lp-text-secondary)] hover:text-violet-400 select-none pointer-events-auto transition-colors duration-250 -translate-y-1/2 whitespace-nowrap cursor-pointer"
      >
        Security
      </a>
      <a 
        href="#chats" 
        style={{ top: '50%' }}
        className="lp-comet-nav absolute left-[44px] text-[8px] font-mono uppercase tracking-[0.18em] text-[var(--lp-text-secondary)] hover:text-violet-400 select-none pointer-events-auto transition-colors duration-250 -translate-y-1/2 whitespace-nowrap cursor-pointer"
      >
        Chats
      </a>
      <a 
        href="#how-it-works" 
        style={{ top: '66.6%' }}
        className="lp-comet-nav absolute left-[44px] text-[8px] font-mono uppercase tracking-[0.18em] text-[var(--lp-text-secondary)] hover:text-violet-400 select-none pointer-events-auto transition-colors duration-250 -translate-y-1/2 whitespace-nowrap cursor-pointer"
      >
        Workflow
      </a>
      <a 
        href="#vision" 
        style={{ top: '83.3%' }}
        className="lp-comet-nav absolute left-[44px] text-[8px] font-mono uppercase tracking-[0.18em] text-[var(--lp-text-secondary)] hover:text-violet-400 select-none pointer-events-auto transition-colors duration-250 -translate-y-1/2 whitespace-nowrap cursor-pointer"
      >
        Philosophy
      </a>
      <a 
        href="#cta" 
        className="lp-comet-nav absolute left-[44px] bottom-0 text-[8px] font-mono uppercase tracking-[0.18em] text-[var(--lp-text-secondary)] hover:text-violet-400 select-none pointer-events-auto transition-colors duration-250 whitespace-nowrap cursor-pointer"
      >
        Deploy
      </a>

      {/* Comet Head & Tail */}
      <div
        ref={cometRef}
        className="absolute left-[30px] top-0 flex flex-col-reverse items-center gap-1.5 -translate-x-1/2"
      >
        {/* Shutter Comet Head */}
        <div className="w-2.5 h-2.5 rounded-full bg-violet-400 shadow-[0_0_8px_#8b5cf6,0_0_15px_#8b5cf6,0_0_30px_#8b5cf6]" />
        
        {/* Lagging Telemetry Dash-Dot Tail */}
        <div className="w-1.5 h-1.5 rounded-full bg-violet-400/70 shadow-[0_0_6px_rgba(139,92,246,0.3)]" />
        <div className="w-1 h-1 rounded-full bg-violet-400/40" />
        <div className="w-[2px] h-[2px] rounded-full bg-violet-400/20" />
      </div>
    </div>
  )
}

export default ScrollComet
