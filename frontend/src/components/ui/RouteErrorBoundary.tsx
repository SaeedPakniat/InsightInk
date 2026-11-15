import { Component, type ReactNode } from 'react'
import { Link } from 'react-router-dom'

type RouteErrorBoundaryProps = {
  children: ReactNode
  title: string
  body: string
  reloadLabel: string
  homeLabel: string
  homePath: string
}

type RouteErrorBoundaryState = {
  hasError: boolean
}

export class RouteErrorBoundary extends Component<
  RouteErrorBoundaryProps,
  RouteErrorBoundaryState
> {
  state: RouteErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(): RouteErrorBoundaryState {
    return { hasError: true }
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <section className="route-error" role="alert">
        <p className="eyebrow">InsightInk</p>
        <h1>{this.props.title}</h1>
        <p>{this.props.body}</p>
        <div className="route-error__actions">
          <button
            className="button button--primary"
            type="button"
            onClick={() => window.location.reload()}
          >
            {this.props.reloadLabel}
          </button>
          <Link className="button button--secondary" to={this.props.homePath}>
            {this.props.homeLabel}
          </Link>
        </div>
      </section>
    )
  }
}
