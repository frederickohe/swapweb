import { Link } from 'react-router-dom'
import { useAuth } from '../core/AuthContext'

export function UserAvatar({
  size = 50,
  to = '/profile',
  className = '',
}: {
  size?: number
  to?: string
  className?: string
}) {
  const { user, isAuthenticated } = useAuth()
  const photo = user?.profile_picture_url

  if (!isAuthenticated) {
    return (
      <div
        className={`user-avatar user-avatar-placeholder ${className}`.trim()}
        style={{ width: size, height: size }}
        aria-hidden
      >
        <i className="ri-user-fill" />
      </div>
    )
  }

  return (
    <Link
      to={to}
      className={`user-avatar ${className}`.trim()}
      style={{ width: size, height: size }}
      aria-label="Your profile"
    >
      {photo ? (
        <img src={photo} alt="" />
      ) : (
        <span className="user-avatar-placeholder">
          <i className="ri-user-fill" aria-hidden />
        </span>
      )}
    </Link>
  )
}
