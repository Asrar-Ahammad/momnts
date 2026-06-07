import { useEffect, useLayoutEffect, useState } from "react"
import { useNavigate } from "react-router"
import Navbar from "../landing_page/Navbar"
import Footer from "../landing_page/Footer"
import { Shield, CaretUp, ArrowLeft } from "@phosphor-icons/react"
import "../landing_page/landing.css"

const PrivacyPolicy = () => {
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
              <Shield size={32} weight="fill" />
              <span className="text-sm font-semibold uppercase tracking-wider">Legal Document</span>
            </div>

            <h1 className="lp-section-title text-left mb-2">
              Privacy Policy
            </h1>
            
            <p className="text-sm text-[var(--lp-text-muted)] mb-8 pb-8 border-b border-[var(--lp-border)]">
              Effective date: June 2, 2026 &bull; Last updated: June 2, 2026
            </p>

            <div className="space-y-8 text-[var(--lp-text-secondary)] leading-relaxed">
              
              <section className="space-y-3">
                <h2 className="text-xl md:text-2xl font-bold font-satoshi text-[var(--lp-text)] border-b border-[var(--lp-border)] pb-2">
                  1. Introduction
                </h2>
                <p>
                  Welcome to Momnts ("we", "our", "us"). Momnts is a face recognition-based event photo management platform that helps event organizers share photos with attendees privately and securely.
                </p>
                <p>
                  This Privacy Policy explains what personal data we collect, how we use it, and what rights you have over your data. By using Momnts, you agree to the practices described in this policy.
                </p>
                <p className="font-semibold text-[var(--lp-text)]">
                  We take privacy seriously — especially because Momnts processes biometric data in the form of facial embeddings. Please read this policy carefully.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-xl md:text-2xl font-bold font-satoshi text-[var(--lp-text)] border-b border-[var(--lp-border)] pb-2">
                  2. Data we collect
                </h2>
                
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold text-[var(--lp-text)]">
                    2.1 Account information
                  </h3>
                  <p>When you register, we collect:</p>
                  <ul className="list-disc pl-6 space-y-1">
                    <li>Full name</li>
                    <li>Email address</li>
                    <li>Password (stored as a bcrypt hash — we never store your actual password)</li>
                    <li>Account creation date</li>
                  </ul>
                </div>

                <div className="space-y-3 pt-2">
                  <h3 className="text-lg font-semibold text-[var(--lp-text)]">
                    2.2 Biometric data — facial embeddings
                  </h3>
                  <p>When you upload a selfie during onboarding or profile setup, we:</p>
                  <ul className="list-disc pl-6 space-y-1">
                    <li>Process your photo through a face recognition model (ArcFace)</li>
                    <li>Generate a 512-dimensional mathematical representation of your face called an "embedding vector"</li>
                    <li>Store this embedding in our database for the purpose of matching you to event photos</li>
                    <li>Store the original selfie photo in Cloudflare R2 cloud storage</li>
                  </ul>
                  <p className="bg-violet-500/5 dark:bg-violet-500/10 text-violet-700 dark:text-violet-300 p-4 rounded-[var(--lp-radius)] border border-violet-500/20 text-sm font-medium">
                    <strong>This is biometric data.</strong> We treat it with the highest level of care. See Section 5 for full details on how we use and protect it.
                  </p>
                </div>

                <div className="space-y-3 pt-2">
                  <h3 className="text-lg font-semibold text-[var(--lp-text)]">
                    2.3 Event photos
                  </h3>
                  <p>When photos are uploaded to an event:</p>
                  <ul className="list-disc pl-6 space-y-1">
                    <li>The photo files are stored in Cloudflare R2 cloud storage</li>
                    <li>Three versions are generated: thumbnail, display, and original</li>
                    <li>Face detection runs on each photo to identify faces</li>
                    <li>Bounding box coordinates and face embeddings are stored for each detected face</li>
                  </ul>
                </div>

                <div className="space-y-3 pt-2">
                  <h3 className="text-lg font-semibold text-[var(--lp-text)]">
                    2.4 Event and participation data
                  </h3>
                  <ul className="list-disc pl-6 space-y-1">
                    <li>Events you create, including name, location, date, and invite code</li>
                    <li>Events you join via invite code</li>
                    <li>Your role in each event (Organizer or Attendee)</li>
                    <li>Number of photos you have uploaded per event</li>
                  </ul>
                </div>

                <div className="space-y-3 pt-2">
                  <h3 className="text-lg font-semibold text-[var(--lp-text)]">
                    2.5 Technical data
                  </h3>
                  <ul className="list-disc pl-6 space-y-1">
                    <li>Authentication tokens (JWT) stored temporarily</li>
                    <li>Blacklisted tokens (for logout invalidation)</li>
                    <li>IP address and request logs (standard server logs)</li>
                    <li>Browser type and operating system (standard HTTP headers)</li>
                  </ul>
                </div>
              </section>

              <section className="space-y-3">
                <h2 className="text-xl md:text-2xl font-bold font-satoshi text-[var(--lp-text)] border-b border-[var(--lp-border)] pb-2">
                  3. How we use your data
                </h2>
                
                <div className="overflow-x-auto border border-[var(--lp-border)] rounded-[var(--lp-radius)]">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead>
                      <tr className="bg-[var(--lp-accent-soft)] border-b border-[var(--lp-border)]">
                        <th className="p-4 font-semibold text-[var(--lp-text)]">Data</th>
                        <th className="p-4 font-semibold text-[var(--lp-text)]">Purpose</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--lp-border)]">
                      <tr>
                        <td className="p-4 font-medium text-[var(--lp-text)]">Name, email</td>
                        <td className="p-4">Account identification, login, email notifications</td>
                      </tr>
                      <tr>
                        <td className="p-4 font-medium text-[var(--lp-text)]">Password hash</td>
                        <td className="p-4">Authentication</td>
                      </tr>
                      <tr>
                        <td className="p-4 font-medium text-[var(--lp-text)]">Selfie + embedding</td>
                        <td className="p-4">Matching you to photos you appear in across events</td>
                      </tr>
                      <tr>
                        <td className="p-4 font-medium text-[var(--lp-text)]">Event photos</td>
                        <td className="p-4">Displaying galleries to event members</td>
                      </tr>
                      <tr>
                        <td className="p-4 font-medium text-[var(--lp-text)]">Face embeddings (from photos)</td>
                        <td className="p-4">Grouping detected faces, enabling photo retrieval</td>
                      </tr>
                      <tr>
                        <td className="p-4 font-medium text-[var(--lp-text)]">Event data</td>
                        <td className="p-4">Managing event access, invite codes, photo organization</td>
                      </tr>
                      <tr>
                        <td className="p-4 font-medium text-[var(--lp-text)]">Upload counts</td>
                        <td className="p-4">Enforcing per-event upload limits for attendees</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <p className="text-sm italic pt-2">
                  We do not use your data for advertising. We do not sell your data to third parties. We do not use your data for any purpose beyond operating the Momnts platform.
                </p>
              </section>

              <section className="space-y-3">
                <h2 className="text-xl md:text-2xl font-bold font-satoshi text-[var(--lp-text)] border-b border-[var(--lp-border)] pb-2">
                  4. Event privacy model
                </h2>
                <p>Every event on Momnts is private by default:</p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Events are accessible only via invite code</li>
                  <li>Only users who join an event with the correct invite code can view its photos</li>
                  <li>Your photos from one event are never accessible to members of a different event</li>
                  <li>Face matching is scoped strictly per event — your face embedding is never compared across events you have not joined</li>
                  <li>Event organizers can remove attendees and moderate photos</li>
                </ul>
                <p className="font-semibold text-[var(--lp-text)]">
                  Even if your face appears in photos from an event you did not join, you will not be matched to those photos and cannot access them.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-xl md:text-2xl font-bold font-satoshi text-[var(--lp-text)] border-b border-[var(--lp-border)] pb-2">
                  5. Biometric data — special provisions
                </h2>
                <p>
                  Because Momnts processes facial embeddings which qualify as biometric data under applicable laws, we apply the following specific protections:
                </p>

                <div className="space-y-2">
                  <h3 className="font-semibold text-[var(--lp-text)]">Collection</h3>
                  <ul className="list-disc pl-6 space-y-1">
                    <li>Facial embeddings are generated only when you voluntarily upload a selfie</li>
                    <li>Uploading a selfie is optional — you may skip onboarding and use Momnts without facial matching</li>
                    <li>By uploading a selfie, you explicitly consent to biometric processing for the purpose of photo matching</li>
                  </ul>
                </div>

                <div className="space-y-2">
                  <h3 className="font-semibold text-[var(--lp-text)]">Storage</h3>
                  <ul className="list-disc pl-6 space-y-1">
                    <li>Facial embeddings are stored as mathematical vectors — they cannot be used to reconstruct your original photo</li>
                    <li>Selfie photos are stored in Cloudflare R2 with access controlled by our API</li>
                    <li>Embeddings are stored in a PostgreSQL database hosted on Supabase</li>
                  </ul>
                </div>

                <div className="space-y-2">
                  <h3 className="font-semibold text-[var(--lp-text)]">Use</h3>
                  <ul className="list-disc pl-6 space-y-1">
                    <li>Your facial embedding is used solely to match you to photos within events you have joined</li>
                    <li>Your embedding is never shared with other users</li>
                    <li>Your embedding is never used for identity verification outside of Momnts</li>
                    <li>Your embedding is never sold or licensed to third parties</li>
                  </ul>
                </div>

                <div className="space-y-2">
                  <h3 className="font-semibold text-[var(--lp-text)]">Deletion</h3>
                  <ul className="list-disc pl-6 space-y-1">
                    <li>You may delete your facial embedding at any time from your profile settings</li>
                    <li>Deleting your embedding removes your face matches but does not delete photos you appear in</li>
                    <li>Deleting your account permanently removes your embedding and all associated data</li>
                  </ul>
                </div>
              </section>

              <section className="space-y-3">
                <h2 className="text-xl md:text-2xl font-bold font-satoshi text-[var(--lp-text)] border-b border-[var(--lp-border)] pb-2">
                  6. Photo ownership and rights
                </h2>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Photos uploaded by organizers remain the property of the organizer</li>
                  <li>Photos uploaded by attendees remain the property of the attendee</li>
                  <li>By uploading photos to Momnts, you grant us a limited license to store, process, compress, and display those photos to authorized event members</li>
                  <li>We do not claim ownership of any photos uploaded to the platform</li>
                  <li>Organizers can remove any photo from their event</li>
                  <li>Attendees can delete photos they uploaded</li>
                </ul>
              </section>

              <section className="space-y-3">
                <h2 className="text-xl md:text-2xl font-bold font-satoshi text-[var(--lp-text)] border-b border-[var(--lp-border)] pb-2">
                  7. Data sharing and third parties
                </h2>
                <p>We share your data only with the following service providers, solely for the purpose of operating Momnts:</p>
                
                <div className="overflow-x-auto border border-[var(--lp-border)] rounded-[var(--lp-radius)]">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead>
                      <tr className="bg-[var(--lp-accent-soft)] border-b border-[var(--lp-border)]">
                        <th className="p-4 font-semibold text-[var(--lp-text)]">Provider</th>
                        <th className="p-4 font-semibold text-[var(--lp-text)]">Purpose</th>
                        <th className="p-4 font-semibold text-[var(--lp-text)]">Data shared</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--lp-border)]">
                      <tr>
                        <td className="p-4 font-medium text-[var(--lp-text)]">Supabase</td>
                        <td className="p-4">Database hosting</td>
                        <td className="p-4 text-xs font-mono">All structured data</td>
                      </tr>
                      <tr>
                        <td className="p-4 font-medium text-[var(--lp-text)]">Cloudflare R2</td>
                        <td className="p-4">Photo file storage</td>
                        <td className="p-4 text-xs font-mono">Photo files, selfies</td>
                      </tr>
                      <tr>
                        <td className="p-4 font-medium text-[var(--lp-text)]">Modal (modal.com)</td>
                        <td className="p-4">Face detection AI processing</td>
                        <td className="p-4 text-xs font-mono">Photo URLs (temporary access)</td>
                      </tr>
                      <tr>
                        <td className="p-4 font-medium text-[var(--lp-text)]">Vercel</td>
                        <td className="p-4">Frontend hosting</td>
                        <td className="p-4 text-xs font-mono">No personal data</td>
                      </tr>
                      <tr>
                        <td className="p-4 font-medium text-[var(--lp-text)]">Google (Gmail SMTP)</td>
                        <td className="p-4">Transactional email</td>
                        <td className="p-4 text-xs font-mono">Email address, name</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="space-y-3">
                <h2 className="text-xl md:text-2xl font-bold font-satoshi text-[var(--lp-text)] border-b border-[var(--lp-border)] pb-2">
                  8. Data retention
                </h2>
                
                <div className="overflow-x-auto border border-[var(--lp-border)] rounded-[var(--lp-radius)]">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead>
                      <tr className="bg-[var(--lp-accent-soft)] border-b border-[var(--lp-border)]">
                        <th className="p-4 font-semibold text-[var(--lp-text)]">Data type</th>
                        <th className="p-4 font-semibold text-[var(--lp-text)]">Retention period</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--lp-border)]">
                      <tr>
                        <td className="p-4 font-medium text-[var(--lp-text)]">Account data</td>
                        <td className="p-4">Until account deletion</td>
                      </tr>
                      <tr>
                        <td className="p-4 font-medium text-[var(--lp-text)]">Facial embedding</td>
                        <td className="p-4">Until you delete it or delete your account</td>
                      </tr>
                      <tr>
                        <td className="p-4 font-medium text-[var(--lp-text)]">Selfie photo</td>
                        <td className="p-4">Until you delete it or delete your account</td>
                      </tr>
                      <tr>
                        <td className="p-4 font-medium text-[var(--lp-text)]">Event photos</td>
                        <td className="p-4">Until organizer deletes event or photo</td>
                      </tr>
                      <tr>
                        <td className="p-4 font-medium text-[var(--lp-text)]">Authentication tokens</td>
                        <td className="p-4">7 days or until logout</td>
                      </tr>
                      <tr>
                        <td className="p-4 font-medium text-[var(--lp-text)]">Blacklisted tokens</td>
                        <td className="p-4">Until natural expiry</td>
                      </tr>
                      <tr>
                        <td className="p-4 font-medium text-[var(--lp-text)]">Server logs</td>
                        <td className="p-4">30 days</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="space-y-3">
                <h2 className="text-xl md:text-2xl font-bold font-satoshi text-[var(--lp-text)] border-b border-[var(--lp-border)] pb-2">
                  9. Data security
                </h2>
                <p>We implement the following security measures:</p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Passwords hashed using bcrypt with salt rounds</li>
                  <li>Authentication via JWT with server-side token blacklisting on logout</li>
                  <li>All data transmitted over HTTPS/TLS</li>
                  <li>API protected by authentication middleware on all private routes</li>
                  <li>Database access restricted to our backend API only</li>
                  <li>Photo storage on Cloudflare R2 with access controlled by our API</li>
                  <li>Role-based access control enforced per event</li>
                </ul>
                <p className="text-sm italic">
                  Despite these measures, no system is 100% secure. We encourage you to use a strong password and to contact us immediately if you suspect unauthorized access to your account.
                </p>
              </section>

              <section className="space-y-3">
                <h2 className="text-xl md:text-2xl font-bold font-satoshi text-[var(--lp-text)] border-b border-[var(--lp-border)] pb-2">
                  10. Your rights
                </h2>
                <p>You have the right to:</p>
                <ul className="list-disc pl-6 space-y-1">
                  <li><strong>Access</strong> — request a copy of all personal data we hold about you</li>
                  <li><strong>Correction</strong> — update your name or email from your profile settings</li>
                  <li><strong>Deletion</strong> — delete your account and all associated data</li>
                  <li><strong>Withdrawal of consent</strong> — delete your facial embedding at any time without deleting your account</li>
                  <li><strong>Data portability</strong> — request an export of your data in a machine-readable format</li>
                  <li><strong>Objection</strong> — object to processing of your biometric data at any time</li>
                </ul>
                <p>To exercise any of these rights, contact us at the email address in Section 14.</p>
              </section>

              <section className="space-y-3">
                <h2 className="text-xl md:text-2xl font-bold font-satoshi text-[var(--lp-text)] border-b border-[var(--lp-border)] pb-2">
                  11. Children's privacy
                </h2>
                <p>
                  Momnts is not intended for users under the age of 13. We do not knowingly collect personal data from children under 13. If you believe a child has provided us with personal data, contact us and we will delete it promptly.
                </p>
                <p>
                  Users between 13 and 18 should use Momnts only with parental consent.
                </p>
              </section>

              <section className="space-y-3">
                <h2 className="text-xl md:text-2xl font-bold font-satoshi text-[var(--lp-text)] border-b border-[var(--lp-border)] pb-2">
                  12. Cookies and local storage
                </h2>
                <p>
                  Momnts uses browser localStorage to store your authentication token. We do not use tracking cookies or third-party analytics cookies. We do not use advertising cookies of any kind.
                </p>
              </section>

              <section className="space-y-3">
                <h2 className="text-xl md:text-2xl font-bold font-satoshi text-[var(--lp-text)] border-b border-[var(--lp-border)] pb-2">
                  13. Changes to this policy
                </h2>
                <p>
                  We may update this Privacy Policy from time to time. When we make significant changes, we will notify you by email and display a notice in the app. Continued use of Momnts after changes take effect constitutes acceptance of the updated policy.
                </p>
              </section>

              <section className="space-y-3">
                <h2 className="text-xl md:text-2xl font-bold font-satoshi text-[var(--lp-text)] border-b border-[var(--lp-border)] pb-2">
                  14. Contact
                </h2>
                <p>For privacy questions, data requests, or concerns:</p>
                <p className="bg-[var(--lp-accent-soft)] p-4 rounded-[var(--lp-radius)] border border-[var(--lp-border)] text-sm">
                  <strong>Email:</strong> <a className="text-violet-500 dark:text-violet-400 hover:underline" href="mailto:asrarahammadshaik@gmail.com">asrarahammadshaik@gmail.com</a> <br />
                  <strong>Website:</strong> <a className="text-violet-500 dark:text-violet-400 hover:underline" href="http://asrar-ahammad.netlify.app">asrar-ahammad.netlify.app</a>
                </p>
                <p>We aim to respond to all privacy requests within 5 business days.</p>
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

export default PrivacyPolicy
