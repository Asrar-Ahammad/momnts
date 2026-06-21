import { useEffect, useRef } from 'react'
import { ShieldCheck, Key, LockSimple } from '@phosphor-icons/react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

const E2EESection = () => {
  const sectionRef = useRef<HTMLElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const visualRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const scanLineRef = useRef<SVGLineElement>(null)
  const photoFrameRef = useRef<SVGRectElement>(null)
  const lockBadgeRef = useRef<SVGGElement>(null)

  const cols = 6
  const rows = 6
  const cellSize = 40
  const xOffset = 80
  const yOffset = 80

  const HEX_GLYPHS = ['0F', 'E2', '8B', '5C', 'F6', 'A9', 'D4', 'C1', '7B', 'FF', '3A', 'B8', 'E9', '2C', '9D', '4E']

  // Generate stylized coordinates & colors to construct a vector mountain landscape photo
  const getCellColor = (r: number, c: number) => {
    // Electric violet sun in rows 1-2, cols 2-3
    if ((r === 1 || r === 2) && (c === 2 || c === 3)) {
      return '#8b5cf6'
    }
    // Sky gradient
    if (r < 2) {
      return c % 2 === 0 ? '#1e1b4b' : '#312e81'
    }
    // Mountains
    if (r === 2 || r === 3) {
      if (c === 1 || c === 4) return '#4c1d95' // mid mountain
      if (c === 2 || c === 3) return '#1e1b4b' // deep mountain
      return '#0f172a' // sides
    }
    // Ground
    return r === 4 ? '#030712' : '#020617'
  }

  useEffect(() => {
    if (!sectionRef.current || !containerRef.current || !svgRef.current) return

    const section = sectionRef.current
    const header = section.querySelector('.lp-section-header')
    
    // Animate section header
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

    // ScrollTrigger to trigger the auto-playing E2EE Animation timeline (not scrubbed)
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: visualRef.current,
        start: 'top 75%',
        toggleActions: 'play none none none',
      }
    })

    const fragments = svgRef.current.querySelectorAll('.e2ee-fragment')
    const pixels = svgRef.current.querySelectorAll('.fragment-pixel')
    const ciphers = svgRef.current.querySelectorAll('.fragment-cipher')

    // Phase 1 & 2: Show scanning line and sweep down
    tl.set(scanLineRef.current, { opacity: 0, y: 0 })
      .to(scanLineRef.current, { opacity: 1, duration: 0.1 })
      .to(scanLineRef.current, {
        y: 240, // Height of the photo area
        duration: 0.8,
        ease: 'power1.inOut'
      })
      .to(scanLineRef.current, { opacity: 0, duration: 0.1 })

    // Phase 3: Shatter / Fragment the photo cells
    tl.to(photoFrameRef.current, {
      stroke: 'var(--lp-accent-color)',
      strokeDasharray: '4, 4',
      duration: 0.5,
    }, '-=0.3')

    // Rotate and disperse each cell fragment outwards
    fragments.forEach((fragment, i) => {
      // Generate some pseudo-randomized outward dispersion offsets
      const col = i % cols
      const row = Math.floor(i / cols)
      const dx = (col - (cols - 1) / 2) * 20 + (Math.random() - 0.5) * 40
      const dy = (row - (rows - 1) / 2) * 20 + (Math.random() - 0.5) * 40
      const rot = (Math.random() - 0.5) * 180

      tl.to(fragment, {
        x: dx,
        y: dy,
        rotation: rot,
        scale: 0.75,
        duration: 1.0,
        ease: 'power2.inOut'
      }, 0.5 + Math.random() * 0.3)
    })

    // Fade out colored pixels, fade in green/violet cipher text glyphs
    tl.to(pixels, {
      opacity: 0.05,
      fill: 'var(--lp-accent-color)',
      duration: 0.8,
      ease: 'power2.inOut'
    }, 0.8)

    tl.to(ciphers, {
      opacity: 1,
      duration: 0.8,
      ease: 'power2.inOut'
    }, 0.8)

    // Phase 4: Re-assemble fragments back to a neat, locked matrix grid
    fragments.forEach((fragment) => {
      tl.to(fragment, {
        x: 0,
        y: 0,
        rotation: 0,
        scale: 1,
        duration: 1.0,
        ease: 'power3.inOut'
      }, 1.8)
    })

    tl.to(photoFrameRef.current, {
      strokeDasharray: 'none',
      stroke: 'var(--lp-accent-color)',
      fill: 'rgba(139, 92, 246, 0.02)',
      duration: 0.8
    }, 1.8)

    // Fade in Lock Check Badge over the final encrypted cipher block
    tl.fromTo(lockBadgeRef.current,
      { opacity: 0, scale: 0.5 },
      { opacity: 1, scale: 1, duration: 0.8, ease: 'back.out(1.7)' },
      2.0
    )

  }, [])

  return (
    <section ref={sectionRef} id="e2ee" className="lp-section">
      <div className="lp-section-inner">
        <div className="lp-section-header">
          <p className="lp-section-label">
            <LockSimple size={16} weight="fill" />
            Security Architecture
          </p>
          <h2 className="lp-section-title">
            End-to-End Encrypted Photo Vault
          </h2>
          <p className="lp-section-desc">
            Complete zero-knowledge client privacy. Your keys never touch our servers, protecting your memories from external intrusion.
          </p>
        </div>

        <div ref={containerRef} className="lp-e2ee-container">
          {/* Left Column - Core Info */}
          <div className="lp-e2ee-content">
            <div className="lp-e2ee-features">
              <div className="lp-e2ee-feature">
                <div className="lp-e2ee-feature-icon">
                  <LockSimple size={20} weight="duotone" />
                </div>
                <div className="lp-e2ee-feature-text">
                  <h4>Client-Side Encryption</h4>
                  <p>
                    Photos are encrypted directly in the client browser using military-grade AES-256-GCM before transmission to object storage.
                  </p>
                </div>
              </div>

              <div className="lp-e2ee-feature">
                <div className="lp-e2ee-feature-icon">
                  <Key size={20} weight="duotone" />
                </div>
                <div className="lp-e2ee-feature-text">
                  <h4>Argon2 Key Derivation</h4>
                  <p>
                    Passphrases undergo high-entropy key stretching via CPU-intensive Argon2 hashing locally on your device.
                  </p>
                </div>
              </div>

              <div className="lp-e2ee-feature">
                <div className="lp-e2ee-feature-icon">
                  <ShieldCheck size={20} weight="duotone" />
                </div>
                <div className="lp-e2ee-feature-text">
                  <h4>Zero-Knowledge Proofs</h4>
                  <p>
                    Server maintains absolute zero visibility into raw vectors, unencrypted tags, metadata, or media file contents.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - SVG Scroll-Scrubbed Animation */}
          <div ref={visualRef} className="lp-e2ee-visual">
            <div className="lp-e2ee-visual-glow" />
            
            <svg
              ref={svgRef}
              viewBox="0 0 400 400"
              className="lp-e2ee-svg"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Photo outer frame border */}
              <rect
                ref={photoFrameRef}
                x="76"
                y="76"
                width="248"
                height="248"
                rx="12"
                stroke="var(--lp-border)"
                strokeWidth="2"
                fill="rgba(255, 255, 255, 0.01)"
              />

              {/* Photo content (Rendered as individual grid fragments) */}
              <g id="e2ee-photo-group">
                {Array.from({ length: rows }).map((_, r) =>
                  Array.from({ length: cols }).map((_, c) => {
                    const cx = xOffset + c * cellSize + cellSize / 2
                    const cy = yOffset + r * cellSize + cellSize / 2
                    const color = getCellColor(r, c)
                    const randomGlyph = HEX_GLYPHS[(r * cols + c) % HEX_GLYPHS.length]
                    
                    return (
                      <g
                        key={`${r}-${c}`}
                        className="e2ee-fragment"
                        style={{ transformOrigin: `${cx}px ${cy}px` }}
                      >
                        {/* High-res picture pixel blocks */}
                        <rect
                          className="fragment-pixel"
                          x={cx - 19}
                          y={cy - 19}
                          width="38"
                          height="38"
                          rx="4"
                          fill={color}
                        />
                        {/* Cipher text letters */}
                        <text
                          className="fragment-cipher e2ee-cipher-char"
                          x={cx}
                          y={cy}
                          opacity="0"
                        >
                          {randomGlyph}
                        </text>
                      </g>
                    )
                  })
                )}
              </g>

              {/* Horizontal sliding scanning line */}
              <line
                ref={scanLineRef}
                className="e2ee-scan-line"
                x1="76"
                y1="80"
                x2="324"
                y2="80"
                opacity="0"
              />

              {/* Success Badge (fades in at center when encryption wraps up) */}
              <g ref={lockBadgeRef} opacity="0">
                <circle
                  cx="200"
                  cy="200"
                  r="36"
                  fill="var(--lp-bg)"
                  stroke="var(--lp-accent-color)"
                  strokeWidth="2.5"
                  style={{ filter: 'drop-shadow(0 0 15px rgba(139, 92, 246, 0.25))' }}
                />
                {/* Shield Check Badge Icon */}
                <path
                  d="M185 200 L195 210 L215 190"
                  stroke="var(--lp-accent-color)"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <text
                  x="200"
                  y="248"
                  fill="var(--lp-accent-color)"
                  fontSize="11"
                  fontWeight="bold"
                  textAnchor="middle"
                  fontFamily="sans-serif"
                  letterSpacing="1"
                >
                  SECURE
                </text>
              </g>
            </svg>
          </div>
        </div>
      </div>
    </section>
  )
}

export default E2EESection
