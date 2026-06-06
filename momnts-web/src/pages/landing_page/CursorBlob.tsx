import { useEffect, useRef, useState } from 'react'
import { useTheme } from 'next-themes'

const CursorBlob = () => {
  const blobRef = useRef<HTMLDivElement>(null)
  const isHoveringRef = useRef(false)
  const { theme, resolvedTheme } = useTheme()

  const [isLight, setIsLight] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme')
      if (saved) return saved === 'light'
      return !window.matchMedia('(prefers-color-scheme: dark)').matches
    }
    return false
  })

  useEffect(() => {
    if (resolvedTheme === 'dark' || resolvedTheme === 'light') {
      setIsLight(resolvedTheme === 'light')
    }
  }, [resolvedTheme])

  const isLightRef = useRef(isLight)
  useEffect(() => {
    isLightRef.current = isLight
  }, [isLight])

  useEffect(() => {
    const blob = blobRef.current
    if (!blob) return

    // Position variables
    let currentX = window.innerWidth / 2
    let currentY = window.innerHeight / 2
    let targetX = currentX
    let targetY = currentY
    
    let speed = 0
    let angle = 0
    
    // Smooth transition tracking factors
    let currentHoverFactor = 0.0
    
    // Cinematic lens focus zoom-in factor
    let initialFocusFactor = 1.0

    const handleMouseMove = (e: MouseEvent) => {
      targetX = e.clientX
      targetY = e.clientY
    }

    window.addEventListener('mousemove', handleMouseMove, { passive: true })

    // Hover state event listeners for interactive items
    const handleMouseEnter = () => {
      isHoveringRef.current = true
    }
    const handleMouseLeave = () => {
      isHoveringRef.current = false
    }

    const addListeners = () => {
      const selectors = '.lp-btn, .lp-feature-card, .lp-step, .lp-nav-link, .lp-logo, .lp-stat, .lp-comet-nav'
      const elements = document.querySelectorAll(selectors)
      elements.forEach(el => {
        el.addEventListener('mouseenter', handleMouseEnter)
        el.addEventListener('mouseleave', handleMouseLeave)
      })
      return elements
    }

    const elements = addListeners()

    // Animation Loop
    let animationFrameId: number

    const tick = () => {
      const dx = targetX - currentX
      const dy = targetY - currentY

      // Smooth interpolation (lerp) for position
      currentX += dx * 0.15
      currentY += dy * 0.15

      // Compute velocity speed for squashing physics
      const vx = dx * 0.15
      const vy = dy * 0.15
      speed = Math.sqrt(vx * vx + vy * vy)

      // Angle calculation towards movement direction
      if (speed > 0.1) {
        angle = Math.atan2(vy, vx)
      }

      // Squash and stretch calculations based on speed
      const stretchFactor = Math.min(speed * 0.05, 0.6)
      const scaleX = 1 + stretchFactor
      const scaleY = 1 - stretchFactor * 0.4

      // Smooth interpolation for hover size/opacity factor (lerp)
      const targetHover = isHoveringRef.current ? 1.0 : 0.0
      currentHoverFactor += (targetHover - currentHoverFactor) * 0.15

      // Decay cinematic lens zoom factor over time
      if (initialFocusFactor > 0.001) {
        initialFocusFactor += (0.0 - initialFocusFactor) * 0.045
      } else {
        initialFocusFactor = 0.0
      }

      // Intermediate values calculation based on hover factor
      const hoverScale = 1.0 + currentHoverFactor * 1.5
      
      // Combine base hover scaling with cinematic camera iris zoom contraction
      const finalScale = hoverScale * (1.0 + initialFocusFactor * 80.0)
      const blurAmount = initialFocusFactor * 30.0 // starts at 30px blur

      const light = isLightRef.current
      const baseBgAlpha = light ? 0.65 : 0.35
      const baseBorderAlpha = light ? 0.9 : 0.6
      const baseShadowAlpha = light ? 0.5 : 0.2

      const bgAlpha = baseBgAlpha - currentHoverFactor * 0.23 + initialFocusFactor * 0.15
      const borderAlpha = baseBorderAlpha + currentHoverFactor * 0.3
      const shadowAlpha = baseShadowAlpha + currentHoverFactor * 0.2
      const shadowRadius = 15 + currentHoverFactor * 15 + initialFocusFactor * 50

      if (blob) {
        // Apply transform matrix combining positioning, squash/stretch and cinematic scale
        blob.style.transform = `translate3d(${currentX}px, ${currentY}px, 0) translate(-50%, -50%) rotate(${angle}rad) scale(${scaleX * finalScale}, ${scaleY * finalScale})`
        
        // Apply camera lens focus blur
        if (blurAmount > 0.1) {
          blob.style.backdropFilter = `blur(${blurAmount}px)`
          blob.style.webkitBackdropFilter = `blur(${blurAmount}px)`
        } else {
          blob.style.backdropFilter = 'none'
          blob.style.webkitBackdropFilter = 'none'
        }

        // Fluidly apply style transitions programmatically
        blob.style.background = `rgba(139, 92, 246, ${bgAlpha})`
        blob.style.borderColor = `rgba(139, 92, 246, ${borderAlpha})`
        blob.style.boxShadow = `0 0 ${shadowRadius}px rgba(139, 92, 246, ${shadowAlpha})`
      }

      animationFrameId = requestAnimationFrame(tick)
    }

    tick()

    // Clean up
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      cancelAnimationFrame(animationFrameId)
      elements.forEach(el => {
        el.removeEventListener('mouseenter', handleMouseEnter)
        el.removeEventListener('mouseleave', handleMouseLeave)
      })
    }
  }, [])

  return (
    <div
      ref={blobRef}
      className="fixed top-0 left-0 w-8 h-8 rounded-full border border-solid pointer-events-none z-[9998] hidden md:block"
      style={{
        transform: 'translate3d(0px, 0px, 0px) translate(-50%, -50%)',
        mixBlendMode: isLight ? 'normal' : 'screen',
        transformOrigin: 'center center',
      }}
    />
  )
}

export default CursorBlob
