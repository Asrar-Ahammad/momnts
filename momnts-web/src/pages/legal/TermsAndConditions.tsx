import { useEffect, useLayoutEffect, useState } from "react"
import { useNavigate } from "react-router"
import Navbar from "../landing_page/Navbar"
import Footer from "../landing_page/Footer"
import { FileText, CaretUp, ArrowLeft } from "@phosphor-icons/react"
import "../landing_page/landing.css"

const TermsAndConditions = () => {
  const navigate = useNavigate()
  const [showScrollTop, setShowScrollTop] = useState(false)

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [])

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 300)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll()
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const handleScrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="landing-root min-h-screen flex flex-col pt-16">
      <style dangerouslySetInnerHTML={{__html: `
        html, body {
          scrollbar-width: none !important;
          -ms-overflow-style: none !important;
        }
        html::-webkit-scrollbar, body::-webkit-scrollbar {
          display: none !important;
        }
      `}} />
      <Navbar showProgress />

      <main className="flex-1 relative pt-6 md:pt-16 pb-12 md:pb-24 px-4 md:px-6">

        <div className="lp-section-inner max-w-4xl">
          <div className="bg-[var(--lp-gradient-card)] border border-[var(--lp-border)] rounded-[var(--lp-radius-lg)] p-8 md:p-12 shadow-sm backdrop-blur-md">
            
            <div className="flex items-center gap-3 mb-6 text-violet-500 dark:text-violet-400">
              <button 
                onClick={() => {
                  if (window.history.length > 1) {
                    navigate(-1)
                  } else if (window.opener) {
                    window.close()
                  } else {
                    navigate('/')
                  }
                }}
                className="p-2 -ml-2 rounded-full hover:bg-violet-500/10 transition-colors cursor-pointer"
                aria-label="Go back"
              >
                <ArrowLeft size={24} weight="bold" />
              </button>
              <FileText size={32} weight="fill" />
              <span className="text-sm font-semibold uppercase tracking-wider">Legal Document</span>
            </div>

            <h1 className="lp-section-title text-left mb-2">
              Terms and Conditions
            </h1>
            
            <p className="text-sm text-[var(--lp-text-muted)] mb-8 pb-8 border-b border-[var(--lp-border)]">
              Effective date: June 2, 2026 &bull; Last updated: June 2, 2026
            </p>

            <div className="space-y-8 text-[var(--lp-text-secondary)] leading-relaxed">
              
              <section className="space-y-3">
                <h2 className="text-xl md:text-2xl font-bold font-satoshi text-[var(--lp-text)] border-b border-[var(--lp-border)] pb-2">
                  1. Acceptance of terms
                </h2>
                <p>
                  By creating an account or using Momnts ("the Service"), you agree to be bound by these Terms and Conditions. If you do not agree, do not use the Service.
                </p>
                <p>
                  These terms apply to all users of Momnts, including event organizers and attendees.
                </p>
              </section>

              <section className="space-y-3">
                <h2 className="text-xl md:text-2xl font-bold font-satoshi text-[var(--lp-text)] border-b border-[var(--lp-border)] pb-2">
                  2. Description of service
                </h2>
                <p>
                  Momnts is a private event photo management platform that:
                </p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Allows event organizers to upload event photos</li>
                  <li>Uses face recognition AI to detect and group faces in photos</li>
                  <li>Allows attendees to find photos they appear in by uploading a selfie</li>
                  <li>Provides private, invite-code-gated event galleries</li>
                </ul>
              </section>

              <section className="space-y-3">
                <h2 className="text-xl md:text-2xl font-bold font-satoshi text-[var(--lp-text)] border-b border-[var(--lp-border)] pb-2">
                  3. Eligibility
                </h2>
                <p>
                  You must be at least 13 years old to use Momnts. By using the Service, you confirm that you meet this requirement. Users under 18 must have parental consent.
                </p>
              </section>

              <section className="space-y-3">
                <h2 className="text-xl md:text-2xl font-bold font-satoshi text-[var(--lp-text)] border-b border-[var(--lp-border)] pb-2">
                  4. User accounts
                </h2>
                <div className="space-y-2">
                  <h3 className="font-semibold text-[var(--lp-text)]">4.1 Registration</h3>
                  <p>
                    You must provide accurate and complete information when registering. You are responsible for maintaining the confidentiality of your account credentials.
                  </p>
                </div>
                <div className="space-y-2 pt-2">
                  <h3 className="font-semibold text-[var(--lp-text)]">4.2 Account security</h3>
                  <p>
                    You are responsible for all activity that occurs under your account. Notify us immediately if you suspect unauthorized access.
                  </p>
                </div>
                <div className="space-y-2 pt-2">
                  <h3 className="font-semibold text-[var(--lp-text)]">4.3 One account per person</h3>
                  <p>
                    Each person may maintain only one account. Creating duplicate accounts is prohibited.
                  </p>
                </div>
              </section>

              <section className="space-y-3">
                <h2 className="text-xl md:text-2xl font-bold font-satoshi text-[var(--lp-text)] border-b border-[var(--lp-border)] pb-2">
                  5. Organizer responsibilities
                </h2>
                <p>
                  If you create an event on Momnts, you are the event organizer and you agree to:
                </p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Only upload photos from events where you have permission to photograph and share attendees' images</li>
                  <li>Obtain appropriate consent from photographed individuals before uploading photos where required by applicable law</li>
                  <li>Not upload photos of minors without explicit parental or guardian consent</li>
                  <li>Moderate your event responsibly — remove inappropriate content promptly</li>
                  <li>Share invite codes only with intended attendees</li>
                  <li>Not use Momnts to collect or distribute photos for commercial purposes without attendees' consent</li>
                </ul>
                <p className="bg-violet-500/5 dark:bg-violet-500/10 text-violet-700 dark:text-violet-300 p-4 rounded-[var(--lp-radius)] border border-violet-500/20 text-sm font-medium">
                  <strong>As an organizer, you are responsible for ensuring you have the legal right to upload and share every photo you upload to Momnts.</strong>
                </p>
              </section>

              <section className="space-y-3">
                <h2 className="text-xl md:text-2xl font-bold font-satoshi text-[var(--lp-text)] border-b border-[var(--lp-border)] pb-2">
                  6. Attendee responsibilities
                </h2>
                <p>
                  As an event attendee, you agree to:
                </p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Only join events you have been legitimately invited to</li>
                  <li>Not share invite codes with unauthorized persons</li>
                  <li>Only upload photos taken at the relevant event</li>
                  <li>Respect other attendees' privacy — do not screenshot or redistribute other people's photos without consent</li>
                  <li>Upload a selfie only of yourself — not another person</li>
                </ul>
              </section>

              <section className="space-y-3">
                <h2 className="text-xl md:text-2xl font-bold font-satoshi text-[var(--lp-text)] border-b border-[var(--lp-border)] pb-2">
                  7. Prohibited conduct
                </h2>
                <p>You must not use Momnts to:</p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Upload photos you do not have the right to share</li>
                  <li>Upload content that is illegal, defamatory, harassing, hateful, or obscene</li>
                  <li>Upload photos of minors in any sexualized or inappropriate context</li>
                  <li>Impersonate another person</li>
                  <li>Attempt to access another user's account or photos without authorization</li>
                  <li>Attempt to reverse engineer, scrape, or extract data from the platform</li>
                  <li>Use automated tools to upload, download, or interact with the platform</li>
                  <li>Upload malicious files or attempt to compromise the security of the platform</li>
                  <li>Use the platform to collect biometric data for any purpose other than the intended photo-matching feature</li>
                  <li>Circumvent any access control or invite code system</li>
                  <li>Upload photos from events other than the event they belong to</li>
                </ul>
                <p className="text-sm font-semibold text-red-650 dark:text-red-400">
                  Violation of these prohibitions may result in immediate account termination.
                </p>
              </section>

              <section className="space-y-3">
                <h2 className="text-xl md:text-2xl font-bold font-satoshi text-[var(--lp-text)] border-b border-[var(--lp-border)] pb-2">
                  8. Content and intellectual property
                </h2>
                <div className="space-y-2">
                  <h3 className="font-semibold text-[var(--lp-text)]">8.1 Your content</h3>
                  <p>
                    You retain all ownership rights to photos and content you upload. By uploading content, you grant Momnts a limited, non-exclusive, royalty-free license to store, process, and display your content solely for the purpose of providing the Service to authorized event members.
                  </p>
                </div>
                <div className="space-y-2 pt-2">
                  <h3 className="font-semibold text-[var(--lp-text)]">8.2 Our intellectual property</h3>
                  <p>
                    The Momnts platform, including its design, code, algorithms, and branding, is our intellectual property. You may not copy, modify, distribute, or create derivative works from any part of the platform without our written permission.
                  </p>
                </div>
                <div className="space-y-2 pt-2">
                  <h3 className="font-semibold text-[var(--lp-text)]">8.3 Feedback</h3>
                  <p>
                    If you provide feedback or suggestions about the Service, we may use them without any obligation to compensate you.
                  </p>
                </div>
              </section>

              <section className="space-y-3">
                <h2 className="text-xl md:text-2xl font-bold font-satoshi text-[var(--lp-text)] border-b border-[var(--lp-border)] pb-2">
                  9. Biometric data consent
                </h2>
                <p>
                  By uploading a selfie to Momnts, you explicitly consent to:
                </p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>The processing of your photo to generate a facial embedding</li>
                  <li>Storage of that embedding for the purpose of matching you to event photos</li>
                  <li>Use of that embedding within events you have joined</li>
                </ul>
                <p>
                  You may withdraw this consent at any time by deleting your facial embedding from your profile. Withdrawal of consent does not affect the lawfulness of processing prior to withdrawal.
                </p>
                <p className="font-semibold text-[var(--lp-text)]">
                  You must not upload another person's photo as your selfie. Doing so constitutes a violation of these Terms and may violate applicable biometric privacy laws.
                </p>
              </section>

              <section className="space-y-3">
                <h2 className="text-xl md:text-2xl font-bold font-satoshi text-[var(--lp-text)] border-b border-[var(--lp-border)] pb-2">
                  10. Privacy
                </h2>
                <p>
                  Your use of Momnts is governed by our Privacy Policy, which is incorporated into these Terms by reference. Please read it carefully.
                </p>
              </section>

              <section className="space-y-3">
                <h2 className="text-xl md:text-2xl font-bold font-satoshi text-[var(--lp-text)] border-b border-[var(--lp-border)] pb-2">
                  11. Moderation and termination
                </h2>
                <div className="space-y-2">
                  <h3 className="font-semibold text-[var(--lp-text)]">11.1 Content removal</h3>
                  <p>
                    We reserve the right to remove any content that violates these Terms or our Privacy Policy, or that we determine in our sole discretion to be harmful, offensive, or inappropriate.
                  </p>
                </div>
                <div className="space-y-2 pt-2">
                  <h3 className="font-semibold text-[var(--lp-text)]">11.2 Account termination</h3>
                  <p>
                    We may suspend or terminate your account at any time for:
                  </p>
                  <ul className="list-disc pl-6 space-y-1">
                    <li>Violation of these Terms</li>
                    <li>Conduct harmful to other users or the platform</li>
                    <li>Extended periods of inactivity</li>
                    <li>Legal requirements</li>
                  </ul>
                </div>
                <div className="space-y-2 pt-2">
                  <h3 className="font-semibold text-[var(--lp-text)]">11.3 Your right to terminate</h3>
                  <p>
                    You may delete your account at any time from your profile settings. Account deletion is permanent and removes all your personal data within 30 days.
                  </p>
                </div>
              </section>

              <section className="space-y-3">
                <h2 className="text-xl md:text-2xl font-bold font-satoshi text-[var(--lp-text)] border-b border-[var(--lp-border)] pb-2">
                  12. Disclaimers
                </h2>
                <div className="space-y-2">
                  <h3 className="font-semibold text-[var(--lp-text)]">12.1 Face recognition accuracy</h3>
                  <p>
                    Momnts uses AI-based face recognition which is not 100% accurate. We do not guarantee that all photos of you will be matched or that no incorrect matches will occur. The similarity threshold is set to minimize false matches but cannot eliminate them entirely.
                  </p>
                </div>
                <div className="space-y-2 pt-2">
                  <h3 className="font-semibold text-[var(--lp-text)]">12.2 Service availability</h3>
                  <p>
                    We do not guarantee that the Service will be available at all times. The Service may be interrupted for maintenance, updates, or events beyond our control.
                  </p>
                </div>
                <div className="space-y-2 pt-2">
                  <h3 className="font-semibold text-[var(--lp-text)]">12.3 Third-party services</h3>
                  <p>
                    The Service depends on third-party providers including Supabase, Cloudflare, and Modal. We are not responsible for disruptions caused by these providers.
                  </p>
                </div>
              </section>

              <section className="space-y-3">
                <h2 className="text-xl md:text-2xl font-bold font-satoshi text-[var(--lp-text)] border-b border-[var(--lp-border)] pb-2">
                  13. Limitation of liability
                </h2>
                <p>
                  To the maximum extent permitted by applicable law, Momnts and its creators shall not be liable for:
                </p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Any indirect, incidental, or consequential damages arising from use of the Service</li>
                  <li>Loss of photos, data, or content</li>
                  <li>Unauthorized access to your account if caused by your failure to secure your credentials</li>
                  <li>Accuracy of face recognition results</li>
                  <li>Actions of other users including organizers or attendees</li>
                </ul>
                <p>
                  Our total liability to you for any claim arising from use of the Service shall not exceed the amount you paid us in the 12 months preceding the claim. If you have not paid anything, our liability is limited to INR 1,000.
                </p>
              </section>

              <section className="space-y-3">
                <h2 className="text-xl md:text-2xl font-bold font-satoshi text-[var(--lp-text)] border-b border-[var(--lp-border)] pb-2">
                  14. Governing law
                </h2>
                <p>
                  These Terms are governed by the laws of India. Any disputes arising from these Terms or your use of the Service shall be subject to the exclusive jurisdiction of the courts of Bangalore, Karnataka, India.
                </p>
              </section>

              <section className="space-y-3">
                <h2 className="text-xl md:text-2xl font-bold font-satoshi text-[var(--lp-text)] border-b border-[var(--lp-border)] pb-2">
                  15. Changes to terms
                </h2>
                <p>
                  We may update these Terms from time to time. We will notify you of significant changes by email and in-app notice at least 7 days before they take effect. Continued use of the Service after changes take effect constitutes acceptance.
                </p>
              </section>

              <section className="space-y-3">
                <h2 className="text-xl md:text-2xl font-bold font-satoshi text-[var(--lp-text)] border-b border-[var(--lp-border)] pb-2">
                  16. Contact
                </h2>
                <p>For questions about these Terms:</p>
                <p className="bg-[var(--lp-accent-soft)] p-4 rounded-[var(--lp-radius)] border border-[var(--lp-border)] text-sm">
                  <strong>Email:</strong> asrarahammadshaik@gmail.com<br />
                  <strong>Website:</strong> momnts.vercel.app
                </p>
              </section>

              <section className="space-y-3">
                <h2 className="text-xl md:text-2xl font-bold font-satoshi text-[var(--lp-text)] border-b border-[var(--lp-border)] pb-2">
                  17. Severability
                </h2>
                <p>
                  If any provision of these Terms is found to be unenforceable, the remaining provisions will continue in full force and effect.
                </p>
              </section>

              <section className="space-y-3">
                <h2 className="text-xl md:text-2xl font-bold font-satoshi text-[var(--lp-text)] border-b border-[var(--lp-border)] pb-2">
                  18. Entire agreement
                </h2>
                <p>
                  These Terms and our Privacy Policy constitute the entire agreement between you and Momnts regarding use of the Service and supersede all prior agreements.
                </p>
              </section>

            </div>
          </div>
        </div>
      </main>

      <Footer />

      {showScrollTop && (
        <button
          onClick={handleScrollToTop}
          className="fixed z-50 right-6 bottom-8 rounded-full shadow-lg border border-neutral-200/50 dark:border-neutral-800/50 bg-white/90 dark:bg-neutral-900/90 backdrop-blur-md hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-800 dark:text-neutral-200 cursor-pointer h-10 w-10 md:h-12 md:w-12 flex items-center justify-center transition-all duration-200 hover:scale-105"
          aria-label="Scroll to top"
        >
          <CaretUp size={22} weight="bold" />
        </button>
      )}
    </div>
  )
}

export default TermsAndConditions
