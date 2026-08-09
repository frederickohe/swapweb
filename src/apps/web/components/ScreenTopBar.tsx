import { useNavigate } from 'react-router-dom'
import { UserAvatar } from './UserAvatar'

export function ScreenTopBar({
  title,
  showBack = true,
  showAvatar = true,
  onBack,
  light = false,
}: {
  title: string
  showBack?: boolean
  showAvatar?: boolean
  onBack?: () => void
  light?: boolean
}) {
  const navigate = useNavigate()

  return (
    <header className={`screen-top-bar${light ? ' screen-top-bar-light' : ''}`}>
      {showBack ? (
        <button
          type="button"
          className="screen-top-back"
          aria-label="Go back"
          onClick={() => (onBack ? onBack() : navigate(-1))}
        >
          <i className="ri-arrow-left-s-line" aria-hidden />
        </button>
      ) : (
        <span className="screen-top-spacer" aria-hidden />
      )}

      <h1 className="screen-top-title">{title}</h1>

      {showAvatar ? (
        <UserAvatar size={50} />
      ) : (
        <span className="screen-top-spacer" aria-hidden />
      )}
    </header>
  )
}
