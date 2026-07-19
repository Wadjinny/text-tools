import { Link, isRouteErrorResponse, useRouteError } from 'react-router'
import '../App.css'

function ErrorPage() {
  const error = useRouteError()

  let title = 'Something went wrong'
  let message = 'An unexpected error occurred while rendering this page.'
  let detail: string | null = null

  if (isRouteErrorResponse(error)) {
    title = error.status === 404 ? 'Page not found' : `${error.status} ${error.statusText}`
    message =
      typeof error.data === 'string' && error.data
        ? error.data
        : error.status === 404
          ? 'That route does not exist.'
          : message
  } else if (error instanceof Error) {
    message = error.message || message
    detail = error.stack ?? null
  }

  return (
    <div className="error-page">
      <section className="error-card" role="alert">
        <h1>{title}</h1>
        <p className="subtitle">{message}</p>
        {import.meta.env.DEV && detail && (
          <pre className="error-detail">{detail}</pre>
        )}
        <div className="error-actions">
          <Link to="/" className="primary feature">
            Back home
          </Link>
          <button
            type="button"
            className="ghost"
            onClick={() => window.location.reload()}
          >
            Reload
          </button>
        </div>
      </section>
    </div>
  )
}

export default ErrorPage
