import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

const stats = [
  { value: '10K+', label: 'Photos Sorted' },
  { value: '500+', label: 'Events Hosted' },
  { value: '99%', label: 'Face Match Rate' },
  { value: '<2s', label: 'Per Photo, Done' },
]

const StatsSection = () => {
  const containerRef = useRef<HTMLDivElement>(null)
  const statsRef = useRef<(HTMLDivElement | null)[]>([])

  useEffect(() => {
    if (!containerRef.current) return

    gsap.fromTo(containerRef.current,
      { opacity: 0, y: 40 },
      {
        opacity: 1, y: 0, duration: 0.8, ease: 'power3.out',
        scrollTrigger: { trigger: containerRef.current, start: 'top 85%', toggleActions: 'play none none none' }
      }
    )

    statsRef.current.forEach((stat, i) => {
      if (!stat) return
      const valueEl = stat.querySelector('.lp-stat-value')
      if (!valueEl) return

      gsap.fromTo(valueEl,
        { opacity: 0, scale: 0.5 },
        {
          opacity: 1, scale: 1, duration: 0.6, delay: i * 0.1,
          ease: 'back.out(1.7)',
          scrollTrigger: { trigger: stat, start: 'top 90%', toggleActions: 'play none none none' }
        }
      )
    })
  }, [])

  return (
    <div ref={containerRef} className="lp-section-inner" style={{ opacity: 0 }}>
      <div className="lp-stats">
        {stats.map((s, i) => (
          <div
            key={s.label}
            ref={el => { statsRef.current[i] = el }}
            className="lp-stat"
          >
            <div className="lp-stat-value">{s.value}</div>
            <div className="lp-stat-label">{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default StatsSection
