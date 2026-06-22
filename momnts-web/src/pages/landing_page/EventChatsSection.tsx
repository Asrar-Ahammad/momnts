import { useEffect, useRef } from 'react'
import { ChatCenteredText, ChatCircleText, Users, Sparkle } from '@phosphor-icons/react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

const EventChatsSection = () => {
  const sectionRef = useRef<HTMLElement>(null)
  const visualRef = useRef<HTMLDivElement>(null)
  const typingIndicatorRef = useRef<SVGGElement>(null)
  const typingDot1Ref = useRef<SVGCircleElement>(null)
  const typingDot2Ref = useRef<SVGCircleElement>(null)
  const typingDot3Ref = useRef<SVGCircleElement>(null)
  
  const msg1Ref = useRef<SVGGElement>(null)
  const msg2Ref = useRef<SVGGElement>(null)
  const msg3Ref = useRef<SVGGElement>(null)
  
  const reaction1Ref = useRef<SVGGElement>(null)
  const reaction2Ref = useRef<SVGGElement>(null)
  const reaction3Ref = useRef<SVGGElement>(null)

  useEffect(() => {
    if (!sectionRef.current) return

    const header = sectionRef.current.querySelector('.lp-section-header')
    
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

    // ScrollTrigger to activate the animation timeline
    const mainTimeline = gsap.timeline({
      scrollTrigger: {
        trigger: visualRef.current,
        start: 'top 75%',
        toggleActions: 'play none none none',
      },
      repeat: -1,
      repeatDelay: 3.5,
    })

    // Typing dots sub-animation (continues running during typing phases)
    const playTypingAnimation = () => {
      const dots = [typingDot1Ref.current, typingDot2Ref.current, typingDot3Ref.current]
      return gsap.fromTo(dots,
        { y: 0 },
        {
          y: -4,
          duration: 0.45,
          stagger: 0.15,
          yoyo: true,
          repeat: -1,
          ease: 'power1.inOut'
        }
      )
    };

    const dotsAnim = playTypingAnimation()

    // --- Timeline Setup ---
    // Hide all items initially
    mainTimeline.set([msg1Ref.current, msg2Ref.current, msg3Ref.current], { opacity: 0, y: 15 })
    mainTimeline.set([reaction1Ref.current, reaction2Ref.current, reaction3Ref.current], { opacity: 0, scale: 0, transformOrigin: '50% 50%' })
    mainTimeline.set(typingIndicatorRef.current, { opacity: 0, y: 0 })

    // 1. Show typing indicator for Message 1 (from A)
    mainTimeline
      .to(typingIndicatorRef.current, { opacity: 1, duration: 0.3 })
      .to(typingIndicatorRef.current, { opacity: 0, duration: 0.2, delay: 1.2 })
      
      // 2. Animate in Message 1
      .to(msg1Ref.current, { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' })
      
      // 3. Animate in Message 2 (User reply, without typing indicator since user sent it)
      .to(msg2Ref.current, { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' }, '+=0.8')
      
      // 4. Move typing indicator down to position for Message 3 (from K) and show it
      .set(typingIndicatorRef.current, { y: 96 })
      .to(typingIndicatorRef.current, { opacity: 1, duration: 0.3, delay: 0.5 })
      .to(typingIndicatorRef.current, { opacity: 0, duration: 0.2, delay: 1.2 })
      
      // 5. Animate in Message 3 (Media Attachment card)
      .to(msg3Ref.current, { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out' })
      
      // 6. Pop in Emoji reactions sequentially
      .to(reaction1Ref.current, { opacity: 1, scale: 1, duration: 0.45, ease: 'back.out(1.8)' }, '+=0.2')
      .to(reaction2Ref.current, { opacity: 1, scale: 1, duration: 0.45, ease: 'back.out(1.8)' }, '-=0.35')
      .to(reaction3Ref.current, { opacity: 1, scale: 1, duration: 0.45, ease: 'back.out(1.8)' }, '-=0.35')

    return () => {
      dotsAnim.kill()
      mainTimeline.kill()
      ScrollTrigger.getAll().forEach(t => {
        if (t.trigger === header || t.trigger === visualRef.current) {
          t.kill()
        }
      })
    }
  }, [])

  return (
    <section ref={sectionRef} id="chats" className="lp-section">
      <div className="lp-section-inner">
        <div className="lp-section-header">
          <p className="lp-section-label">
            <ChatCenteredText size={16} weight="fill" />
            Live Interactions
          </p>
          <h2 className="lp-section-title">
            Contextual Event Chats & Threading
          </h2>
          <p className="lp-section-desc">
            Keep attendees connected. Discuss specific photos, exchange thoughts in real-time, and react to highlights as they happen.
          </p>
        </div>

        <div className="lp-chats-container">
          {/* Left Column - SVG Phone Mockup Animation */}
          <div ref={visualRef} className="lp-chats-visual">
            <div className="lp-chats-visual-glow" />
            
            <svg
              viewBox="0 0 400 400"
              className="lp-chats-svg"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Phone Frame Masking (Screen clipping path) */}
              <defs>
                <clipPath id="phone-screen-clip">
                  <rect x="82" y="42" width="236" height="316" rx="18" />
                </clipPath>
              </defs>

              {/* Outer Phone Mockup Frame */}
              <rect
                x="80"
                y="40"
                width="240"
                height="320"
                rx="20"
                stroke="var(--lp-border)"
                strokeWidth="2.5"
                fill="var(--lp-bg)"
                style={{ filter: 'drop-shadow(0 25px 50px -12px rgba(0, 0, 0, 0.5))' }}
              />

              {/* Inside Screen Content (Clipped) */}
              <g clipPath="url(#phone-screen-clip)">
                {/* Scrollable messages container background */}
                <rect x="82" y="42" width="236" height="316" fill="var(--lp-bg)" />

                {/* Header Bar */}
                <g id="phone-header">
                  <rect x="82" y="42" width="236" height="36" fill="var(--lp-surface-card)" />
                  <line x1="82" y1="78" x2="318" y2="78" stroke="var(--lp-border)" strokeWidth="1" />
                  
                  {/* Status Indicator Green dot */}
                  <circle cx="102" cy="60" r="3.5" className="chat-status-glow" />
                  
                  {/* Chat title / Room Label */}
                  <text x="114" y="60" fill="var(--lp-text)" fontSize="10.5" fontWeight="bold" fontFamily="sans-serif" dominantBaseline="central">
                    #general-thread
                  </text>
                  
                  {/* Participant count (Moved x to 286 to completely avoid rounded corner clipping path) */}
                  <text x="286" y="60" fill="var(--lp-text-secondary)" fontSize="8" fontFamily="monospace" textAnchor="end" dominantBaseline="central">
                    128 Online
                  </text>
                </g>

                {/* Message List Area */}
                <g id="phone-messages-group">
                  
                  {/* Message 1 (Left - Recieved) */}
                  <g ref={msg1Ref} id="msg-1">
                    {/* Avatar circle */}
                    <circle cx="104" cy="106" r="10" className="chat-avatar-ring" />
                    <text x="104" y="106" fill="var(--lp-accent-color)" fontSize="8.5" fontWeight="bold" fontFamily="sans-serif" textAnchor="middle" dominantBaseline="central">
                      A
                    </text>
                    {/* Message box */}
                    <rect
                      x="120"
                      y="88"
                      width="132"
                      height="36"
                      rx="10"
                      className="chat-bubble-bg"
                    />
                    <text x="130" y="99" className="chat-bubble-text" dominantBaseline="central">
                      Hey everyone! Welcome
                    </text>
                    <text x="130" y="113" className="chat-bubble-text" dominantBaseline="central">
                      to the event space! 📸
                    </text>
                    <text x="258" y="120" className="chat-timestamp" dominantBaseline="baseline">
                      10:04
                    </text>
                  </g>

                  {/* Message 2 (Right - User Sent) */}
                  <g ref={msg2Ref} id="msg-2">
                    {/* Avatar circle */}
                    <circle cx="296" cy="154" r="10" className="chat-avatar-ring-user" />
                    <text x="296" y="154" fill="var(--lp-text)" fontSize="8.5" fontWeight="bold" fontFamily="sans-serif" textAnchor="middle" dominantBaseline="central">
                      Me
                    </text>
                    {/* Message box */}
                    <rect
                      x="140"
                      y="136"
                      width="142"
                      height="36"
                      rx="10"
                      className="chat-bubble-bg-user"
                    />
                    <text x="150" y="147" className="chat-bubble-text-user" dominantBaseline="central">
                      Who captured the closing
                    </text>
                    <text x="150" y="161" className="chat-bubble-text-user" dominantBaseline="central">
                      keynote speech slides?
                    </text>
                    <text x="134" y="168" className="chat-timestamp" textAnchor="end" dominantBaseline="baseline">
                      10:05
                    </text>
                  </g>

                  {/* Message 3 (Left - Recieved Media attachment) */}
                  <g ref={msg3Ref} id="msg-3">
                    {/* Avatar circle */}
                    <circle cx="104" cy="202" r="10" className="chat-avatar-ring" />
                    <text x="104" y="202" fill="var(--lp-accent-color)" fontSize="8.5" fontWeight="bold" fontFamily="sans-serif" textAnchor="middle" dominantBaseline="central">
                      K
                    </text>
                    
                    {/* Message box (Taller for image) */}
                    <rect
                      x="120"
                      y="184"
                      width="142"
                      height="106"
                      rx="10"
                      className="chat-bubble-bg"
                    />
                    
                    {/* Stylized vector Photo attachment block inside message */}
                    <g id="attached-photo">
                      <rect x="126" y="190" width="130" height="74" rx="6" fill="var(--lp-surface)" className="chat-photo-card" />
                      <rect x="126" y="190" width="130" height="74" rx="6" className="chat-photo-overlay" />
                      
                      {/* Photo Vector art details (Sunrise over mountains) */}
                      {/* Sun */}
                      <circle cx="191" cy="214" r="10" fill="var(--lp-accent-soft)" stroke="var(--lp-accent-color)" strokeWidth="1" />
                      {/* Mountains */}
                      <polygon points="128,260 160,225 190,260" fill="var(--lp-bg)" stroke="var(--lp-border)" strokeWidth="1" />
                      <polygon points="170,260 210,215 250,260" fill="var(--lp-bg)" stroke="var(--lp-accent-color)" strokeWidth="1.2" opacity="0.8" />
                      <polygon points="215,260 235,235 252,260" fill="var(--lp-bg)" stroke="var(--lp-border)" strokeWidth="1" />
                    </g>
                    
                    <text x="128" y="278" className="chat-bubble-text" dominantBaseline="central">
                      I just uploaded this one! 🚀
                    </text>
                    <text x="266" y="286" className="chat-timestamp" dominantBaseline="baseline">
                      10:06
                    </text>

                    {/* Chat emoji reactions (Widened pills, centered texts, and explicit text fills) */}
                    <g ref={reaction1Ref} id="reaction-1">
                      <rect x="128" y="296" width="30" height="14" rx="7" className="chat-reaction-pill" />
                      <text x="134" y="303" fill="var(--lp-text)" className="chat-reaction-emoji" dominantBaseline="central">❤️</text>
                      <text x="148" y="303" fill="var(--lp-text-secondary)" className="chat-reaction-count" dominantBaseline="central">3</text>
                    </g>
                    <g ref={reaction2Ref} id="reaction-2">
                      <rect x="164" y="296" width="30" height="14" rx="7" className="chat-reaction-pill" />
                      <text x="170" y="303" fill="var(--lp-text)" className="chat-reaction-emoji" dominantBaseline="central">🔥</text>
                      <text x="184" y="303" fill="var(--lp-text-secondary)" className="chat-reaction-count" dominantBaseline="central">5</text>
                    </g>
                    <g ref={reaction3Ref} id="reaction-3">
                      <rect x="200" y="296" width="30" height="14" rx="7" className="chat-reaction-pill" />
                      <text x="206" y="303" fill="var(--lp-text)" className="chat-reaction-emoji" dominantBaseline="central">⚡</text>
                      <text x="220" y="303" fill="var(--lp-text-secondary)" className="chat-reaction-count" dominantBaseline="central">2</text>
                    </g>
                  </g>

                  {/* Pulsing Typing Indicator bubble */}
                  <g ref={typingIndicatorRef} id="typing-indicator" opacity="0">
                    <circle cx="104" cy="106" r="10" className="chat-avatar-ring" />
                    <text x="104" y="106" fill="var(--lp-accent-color)" fontSize="12" textAnchor="middle" dominantBaseline="central">
                      •
                    </text>
                    <rect
                      x="120"
                      y="88"
                      width="54"
                      height="36"
                      rx="10"
                      className="chat-bubble-bg"
                    />
                    <circle ref={typingDot1Ref} cx="137" cy="106" r="2.2" fill="var(--lp-text-secondary)" />
                    <circle ref={typingDot2Ref} cx="147" cy="106" r="2.2" fill="var(--lp-text-secondary)" />
                    <circle ref={typingDot3Ref} cx="157" cy="106" r="2.2" fill="var(--lp-text-secondary)" />
                  </g>
                </g>

                {/* Message Input Area at Bottom */}
                <g id="phone-input">
                  <rect x="82" y="320" width="236" height="38" fill="var(--lp-surface-card)" />
                  <line x1="82" y1="320" x2="318" y2="320" stroke="var(--lp-border)" strokeWidth="1" />
                  
                  {/* Text Input mock shape */}
                  <rect x="92" y="327" width="186" height="24" rx="12" fill="var(--lp-bg)" stroke="var(--lp-border)" strokeWidth="1" />
                  <text x="104" y="339" fill="var(--lp-text-muted)" fontSize="8" fontFamily="sans-serif" dominantBaseline="central">
                    Reply in thread...
                  </text>
                  
                  {/* Send Button circle */}
                  <circle cx="298" cy="339" r="11" fill="var(--lp-accent-color)" />
                  <path d="M 295 335 L 302 339 L 295 343 L 297 339 Z" fill="#ffffff" />
                </g>
              </g>
            </svg>
          </div>

          {/* Right Column - Features List */}
          <div className="lp-chats-content">
            <div className="lp-chats-features">
              <div className="lp-chats-feature">
                <div className="lp-chats-feature-icon">
                  <ChatCircleText size={20} weight="duotone" />
                </div>
                <div className="lp-chats-feature-text">
                  <h4>Contextual Media Threads</h4>
                  <p>
                    Reply directly to any uploaded image, establishing scoped, high-resolution comment threads without cluttering the main channel.
                  </p>
                </div>
              </div>

              <div className="lp-chats-feature">
                <div className="lp-chats-feature-icon">
                  <Users size={20} weight="duotone" />
                </div>
                <div className="lp-chats-feature-text">
                  <h4>Live Participant Presence</h4>
                  <p>
                    Track active engagement dynamically. Presence status updates instantly as attendees interact, share, or react.
                  </p>
                </div>
              </div>

              <div className="lp-chats-feature">
                <div className="lp-chats-feature-icon">
                  <Sparkle size={20} weight="duotone" />
                </div>
                <div className="lp-chats-feature-text">
                  <h4>Instant Emojis & Reaction Sync</h4>
                  <p>
                    Send real-time feedback on shared content. Lightweight WebSocket pipelines sync emoji reactions instantly for all connected clients.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default EventChatsSection
