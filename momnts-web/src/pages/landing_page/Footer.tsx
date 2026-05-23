import {
  GithubLogo,
  TwitterLogo,
  EnvelopeSimple,
} from '@phosphor-icons/react'

const Footer = () => {
  return (
    <footer className="lp-footer">
      <div className="lp-footer-inner">
        <span className="lp-footer-logo">Momnts</span>
        <span className="lp-footer-copy">
          &copy; {new Date().getFullYear()} Momnts. All rights reserved.
        </span>
        <div className="lp-footer-links">
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="lp-footer-link"
            aria-label="GitHub"
          >
            <GithubLogo size={20} weight="fill" />
          </a>
          <a
            href="https://twitter.com"
            target="_blank"
            rel="noopener noreferrer"
            className="lp-footer-link"
            aria-label="Twitter"
          >
            <TwitterLogo size={20} weight="fill" />
          </a>
          <a
            href="mailto:hello@momnts.app"
            className="lp-footer-link"
            aria-label="Email"
          >
            <EnvelopeSimple size={20} weight="fill" />
          </a>
        </div>
      </div>
    </footer>
  )
}

export default Footer
