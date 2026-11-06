import { Link } from 'react-router-dom'

export function Brand() {
  return (
    <Link className="brand" to="/" aria-label="InsightInk">
      <span className="brand__mark" aria-hidden="true">
        <svg viewBox="0 0 24 24" focusable="false">
          <path d="M9 18h6M10 22h4M12 2a6 6 0 0 0-4 10.5c.7.7 1 1.4 1 2.5h6c0-1.1.3-1.8 1-2.5A6 6 0 0 0 12 2Z" />
        </svg>
      </span>
      <span className="brand__text">InsightInk</span>
    </Link>
  )
}
