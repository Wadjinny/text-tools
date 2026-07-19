import { useEffect, useRef, useState } from 'react'
import { Link, Outlet, useMatch } from 'react-router'
import { usePipelinesContext } from '../hooks/usePipelinesContext'
import '../App.css'

function RootLayout() {
  const pipelineMatch = useMatch({ path: 'pipeline/:pipelineId', end: true })
  const pipelineId = pipelineMatch?.params.pipelineId
  const { pipelines, updatePipelineTitle } = usePipelinesContext()

  const activePipeline = pipelines.find((pipeline) => pipeline.id === pipelineId) ?? null
  const [draftTitle, setDraftTitle] = useState(activePipeline?.title ?? '')
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const titleInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    setDraftTitle(activePipeline?.title ?? '')
    setIsEditingTitle(false)
  }, [activePipeline?.id, activePipeline?.title])

  useEffect(() => {
    if (isEditingTitle) {
      titleInputRef.current?.focus()
      titleInputRef.current?.select()
    }
  }, [isEditingTitle])

  const commitTitle = () => {
    if (!activePipeline) return
    const next = draftTitle.trim()
    if (next && next !== activePipeline.title) {
      updatePipelineTitle(activePipeline.id, next)
    } else {
      setDraftTitle(activePipeline.title)
    }
    setIsEditingTitle(false)
  }

  return (
    <div className="app">
      <nav className="navbar">
        <div className="navbar-left">
          <Link to="/" className="navbar-brand">
            <span className="navbar-logo" aria-hidden="true">
              Tt
            </span>
            <span className="navbar-title">Text Tools</span>
          </Link>
          {activePipeline && (
            <>
              <span className="navbar-separator" aria-hidden="true">
                /
              </span>
              {isEditingTitle ? (
                <input
                  ref={titleInputRef}
                  className="navbar-pipeline-input"
                  value={draftTitle}
                  onChange={(event) => setDraftTitle(event.target.value)}
                  onBlur={commitTitle}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault()
                      commitTitle()
                    }
                    if (event.key === 'Escape') {
                      setDraftTitle(activePipeline.title)
                      setIsEditingTitle(false)
                    }
                  }}
                  aria-label="Pipeline title"
                />
              ) : (
                <button
                  type="button"
                  className="navbar-pipeline-title"
                  onClick={() => setIsEditingTitle(true)}
                  title="Click to rename pipeline"
                >
                  {activePipeline.title}
                </button>
              )}
            </>
          )}
        </div>
      </nav>
      <Outlet />
    </div>
  )
}

export default RootLayout
