import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

/**
 * Animated decorative SVG grid/flow lines that draw on scroll.
 * Used as a background element between sections.
 */
const DecorativeSVG = () => {
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    if (!svgRef.current) return

    const paths = svgRef.current.querySelectorAll('path')
    paths.forEach((path, i) => {
      const length = path.getTotalLength()
      path.style.strokeDasharray = `${length}`
      path.style.strokeDashoffset = `${length}`

      gsap.to(path, {
        strokeDashoffset: 0,
        duration: 2 + i * 0.3,
        ease: 'power2.inOut',
        scrollTrigger: {
          trigger: svgRef.current,
          start: 'top 80%',
          end: 'bottom 20%',
          scrub: 1,
        },
      })
    })

    // Float the circles
    const circles = svgRef.current.querySelectorAll('circle')
    circles.forEach((circle, i) => {
      gsap.fromTo(circle,
        { opacity: 0, scale: 0 },
        {
          opacity: 0.3, scale: 1, duration: 0.6, delay: 0.5 + i * 0.2,
          ease: 'back.out(1.7)',
          scrollTrigger: {
            trigger: svgRef.current,
            start: 'top 70%',
            toggleActions: 'play none none none',
          },
        }
      )
    })
  }, [])

  return (
    <div style={{ position: 'relative', height: 200, overflow: 'hidden', pointerEvents: 'none' }}>
      <svg
        ref={svgRef}
        viewBox="0 0 1200 200"
        fill="none"
        style={{ width: '100%', height: '100%', position: 'absolute', inset: 0 }}
        aria-hidden="true"
      >
        {/* Flowing curve 1 */}
        <path
          d="M0 100 C200 40, 400 160, 600 100 S1000 40, 1200 100"
          stroke="var(--lp-border)"
          strokeWidth="1"
          opacity="0.6"
        />
        {/* Flowing curve 2 */}
        <path
          d="M0 120 C300 60, 500 180, 700 100 S900 20, 1200 80"
          stroke="var(--lp-border)"
          strokeWidth="0.5"
          opacity="0.4"
        />
        {/* Flowing curve 3 */}
        <path
          d="M0 80 C150 140, 350 60, 550 120 S850 60, 1200 110"
          stroke="var(--lp-border)"
          strokeWidth="0.5"
          opacity="0.3"
        />

        {/* Intersection dots */}
        <circle cx="300" cy="90" r="3" fill="var(--lp-text-muted)" opacity="0" />
        <circle cx="600" cy="100" r="4" fill="var(--lp-text-muted)" opacity="0" />
        <circle cx="900" cy="80" r="3" fill="var(--lp-text-muted)" opacity="0" />
      </svg>
    </div>
  )
}

export default DecorativeSVG
