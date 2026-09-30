import { Component, Suspense } from 'react'

class ErrorBoundary extends Component {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error) {
    console.error(error)
  }

  render() {
    return this.state.failed ? null : this.props.children
  }
}

/** Isole chaque section : si l'une plante sur un vieux téléphone, les autres restent visibles. */
export default function SafeSection({ children }) {
  return (
    <ErrorBoundary>
      <Suspense fallback={null}>{children}</Suspense>
    </ErrorBoundary>
  )
}
