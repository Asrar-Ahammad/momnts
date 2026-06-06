import { useEffect, useRef } from 'react'
import * as THREE from 'three'

interface ThreeDShowcaseProps {
  theme: string
}

const ThreeDShowcase = ({ theme }: ThreeDShowcaseProps) => {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return

    const container = containerRef.current
    const width = container.clientWidth
    const height = container.clientHeight

    // Scene
    const scene = new THREE.Scene()

    // Camera
    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000)
    camera.position.z = 8

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    container.appendChild(renderer.domElement)

    // Particles (Neural Net representation)
    const particleCount = 120
    const geometry = new THREE.BufferGeometry()
    const positions = new Float32Array(particleCount * 3)
    const colors = new Float32Array(particleCount * 3)

    const isLight = theme === 'light'

    // Strictly Monochrome + Electric Violet Accent
    const colorAccent = new THREE.Color('#8b5cf6') // Electric Violet
    const colorWhite = isLight ? new THREE.Color('#09090b') : new THREE.Color('#ffffff')  // Theme base color
    const colorGrey = isLight ? new THREE.Color('#a1a1aa') : new THREE.Color('#52525b')   // Theme muted color

    for (let i = 0; i < particleCount; i++) {
      const u = Math.random()
      const v = Math.random()
      const theta = u * 2.0 * Math.PI
      const phi = Math.acos(2.0 * v - 1.0)
      const r = Math.cbrt(Math.random()) * 4.5

      const x = r * Math.sin(phi) * Math.cos(theta)
      const y = r * Math.sin(phi) * Math.sin(theta)
      const z = r * Math.cos(phi)

      positions[i * 3] = x
      positions[i * 3 + 1] = y
      positions[i * 3 + 2] = z

      const rand = Math.random()
      const chosenColor = rand < 0.2 ? colorAccent : rand < 0.6 ? colorWhite : colorGrey
      colors[i * 3] = chosenColor.r
      colors[i * 3 + 1] = chosenColor.g
      colors[i * 3 + 2] = chosenColor.b
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))

    // Programmatically create dot texture
    const canvas = document.createElement('canvas')
    canvas.width = 32
    canvas.height = 32
    const ctx = canvas.getContext('2d')
    if (ctx) {
      const colorVal = isLight ? '9, 9, 11' : '255, 255, 255'
      const grad = ctx.createRadialGradient(16, 16, 0, 16, 16, 16)
      grad.addColorStop(0, `rgba(${colorVal}, 1)`)
      grad.addColorStop(0.2, `rgba(${colorVal}, 0.8)`)
      grad.addColorStop(1, `rgba(${colorVal}, 0)`)
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, 32, 32)
    }

    const texture = new THREE.CanvasTexture(canvas)
    const material = new THREE.PointsMaterial({
      size: 0.15,
      vertexColors: true,
      map: texture,
      transparent: true,
      blending: isLight ? THREE.NormalBlending : THREE.AdditiveBlending,
      depthWrite: false,
    })

    const pointCloud = new THREE.Points(geometry, material)
    scene.add(pointCloud)

    // Connecting Lines
    const lineIndices: number[] = []
    const maxDistance = 1.8

    for (let i = 0; i < particleCount; i++) {
      for (let j = i + 1; j < particleCount; j++) {
        const dx = positions[i * 3] - positions[j * 3]
        const dy = positions[i * 3 + 1] - positions[j * 3 + 1]
        const dz = positions[i * 3 + 2] - positions[j * 3 + 2]
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)

        if (dist < maxDistance) {
          lineIndices.push(i, j)
        }
      }
    }

    const lineGeometry = new THREE.BufferGeometry()
    lineGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    lineGeometry.setIndex(lineIndices)

    const lineMaterial = new THREE.LineBasicMaterial({
      color: 0x8b5cf6, // Solid Electric Violet Accent
      transparent: true,
      opacity: isLight ? 0.12 : 0.2,
      blending: isLight ? THREE.NormalBlending : THREE.AdditiveBlending,
    })

    const lines = new THREE.LineSegments(lineGeometry, lineMaterial)
    scene.add(lines)

    // Floating card meshes
    const cardGroup = new THREE.Group()
    const cardCount = 6
    const cards: THREE.Mesh[] = []

    for (let i = 0; i < cardCount; i++) {
      const w = 1.2
      const h = 1.6
      const cardGeom = new THREE.PlaneGeometry(w, h)
      
      const cardMat = new THREE.MeshBasicMaterial({
        color: isLight ? 0xe4e4e7 : 0x18181b,
        transparent: true,
        opacity: isLight ? 0.6 : 0.4,
        side: THREE.DoubleSide,
      })

      const card = new THREE.Mesh(cardGeom, cardMat)

      const angle = (i / cardCount) * Math.PI * 2
      const radius = 3.5
      card.position.set(
        Math.cos(angle) * radius,
        (Math.random() - 0.5) * 2,
        Math.sin(angle) * radius
      )
      
      card.lookAt(0, 0, 0)
      cardGroup.add(card)
      cards.push(card)
    }
    scene.add(cardGroup)

    let mouseX = 0
    let mouseY = 0
    let targetX = 0
    let targetY = 0

    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect()
      mouseX = ((e.clientX - rect.left) / rect.width) * 2 - 1
      mouseY = -((e.clientY - rect.top) / rect.height) * 2 + 1
    }

    window.addEventListener('mousemove', handleMouseMove)

    const handleResize = () => {
      if (!container) return
      const w = container.clientWidth
      const h = container.clientHeight
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
    }

    const resizeObserver = new ResizeObserver(handleResize)
    resizeObserver.observe(container)

    let animationFrameId: number

    const tick = () => {
      targetX += (mouseX - targetX) * 0.05
      targetY += (mouseY - targetY) * 0.05

      pointCloud.rotation.y += 0.001
      pointCloud.rotation.x += 0.0005

      lines.rotation.y = pointCloud.rotation.y
      lines.rotation.x = pointCloud.rotation.x

      cardGroup.rotation.y -= 0.002
      cards.forEach((card, idx) => {
        card.position.y += Math.sin(Date.now() * 0.001 + idx) * 0.002
        card.rotation.z = Math.sin(Date.now() * 0.0005 + idx) * 0.05
      })

      scene.rotation.y = targetX * 0.3
      scene.rotation.x = -targetY * 0.3

      renderer.render(scene, camera)
      animationFrameId = requestAnimationFrame(tick)
    }

    tick()

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      resizeObserver.disconnect()
      cancelAnimationFrame(animationFrameId)
      renderer.dispose()
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement)
      }
    }
  }, [theme])

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 w-full h-full pointer-events-none z-0 overflow-hidden opacity-70"
      style={{ minHeight: '100%' }}
    />
  )
}

export default ThreeDShowcase
