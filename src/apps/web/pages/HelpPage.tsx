import { ScreenTopBar } from '../components/ScreenTopBar'

export function HelpPage() {
  return (
    <div className="settings-subpage">
      <ScreenTopBar title="Help & Support" showAvatar={false} />

      <div className="settings-card">
        <a
          className="settings-link-row"
          href="mailto:support@useswappro.com?subject=Help%20Request"
        >
          <i className="ri-mail-line" aria-hidden />
          <span>
            <strong>Email Support</strong>
            <small>support@useswappro.com</small>
          </span>
          <i className="ri-arrow-right-s-line" aria-hidden />
        </a>
        <a
          className="settings-link-row"
          href="https://www.useswappro.com"
          target="_blank"
          rel="noreferrer"
        >
          <i className="ri-global-line" aria-hidden />
          <span>
            <strong>Our Website</strong>
            <small>www.useswappro.com</small>
          </span>
          <i className="ri-arrow-right-s-line" aria-hidden />
        </a>
      </div>
    </div>
  )
}
