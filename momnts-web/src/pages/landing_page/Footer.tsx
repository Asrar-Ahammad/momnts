import {
  GithubLogoIcon,
  TwitterLogoIcon,
  EnvelopeSimpleIcon,
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
            href="https://github.com/Asrar-Ahammad"
            target="_blank"
            rel="noopener noreferrer"
            className="lp-footer-link"
            aria-label="GitHub"
          >
            <GithubLogoIcon size={20} weight="fill" />
          </a>
          <a
            href="https://x.com/asrar_ahammad"
            target="_blank"
            rel="noopener noreferrer"
            className="lp-footer-link"
            aria-label="Twitter"
          >
            <TwitterLogoIcon size={20} weight="fill" />
          </a>
          <a
            href="mailto:asrarahammadshaik@gmail.com"
            className="lp-footer-link"
            aria-label="Email"
          >
            <EnvelopeSimpleIcon size={20} weight="fill" />
          </a>
        </div>
      </div>
    </footer>
  )
}

export default Footer
