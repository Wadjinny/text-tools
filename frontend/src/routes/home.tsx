import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { SearchX, Trash2 } from 'lucide-react'
import { usePipelinesContext } from '../hooks/usePipelinesContext'
import { EmptyState } from '../components/EmptyState'
import type { Pipeline } from '../types'

function HomePage() {
  const navigate = useNavigate()
  const { pipelines, addPipeline, deletePipeline } = usePipelinesContext()
  const [search, setSearch] = useState('')
  const [pendingDelete, setPendingDelete] = useState<Pipeline | null>(null)

  const visiblePipelines = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return pipelines
    return pipelines.filter((pipeline) => pipeline.title.toLowerCase().includes(query))
  }, [pipelines, search])

  const handleCreate = () => {
    const id = addPipeline()
    navigate(`/pipeline/${id}`)
  }

  const requestDelete = (pipeline: Pipeline) => {
    if (pipeline.steps.length === 0) {
      deletePipeline(pipeline.id)
      return
    }
    setPendingDelete(pipeline)
  }

  const confirmDelete = () => {
    if (!pendingDelete) return
    deletePipeline(pendingDelete.id)
    setPendingDelete(null)
  }

  useEffect(() => {
    if (!pendingDelete) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setPendingDelete(null)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [pendingDelete])

  return (
    <div className="home-page">
      <section className="home-card">
        {pipelines.length === 0 ? (
          <div className="home-empty">
            <p className="subtitle">No pipelines yet. Create one to start transforming text.</p>
            <button type="button" className="primary feature" onClick={handleCreate}>
              Create pipeline
            </button>
          </div>
        ) : (
          <>
            <div className="panel-header home-header">
              <h2>Pipelines</h2>
              <button type="button" className="primary feature" onClick={handleCreate}>
                Create pipeline
              </button>
            </div>
            <input
              className="search"
              placeholder="Search pipelines"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <div className="pipeline-list home-pipeline-list">
              {visiblePipelines.map((pipeline) => (
                <div key={pipeline.id} className="pipeline-item">
                  <button
                    type="button"
                    className="pipeline-item-main"
                    onClick={() => navigate(`/pipeline/${pipeline.id}`)}
                  >
                    <span className="pipeline-item-title">{pipeline.title}</span>
                    <span className="muted">
                      {pipeline.steps.length}{' '}
                      {pipeline.steps.length === 1 ? 'step' : 'steps'}
                    </span>
                  </button>
                  <button
                    type="button"
                    className="ghost icon-btn danger"
                    aria-label={`Delete ${pipeline.title}`}
                    title="Delete pipeline"
                    onClick={(event) => {
                      event.stopPropagation()
                      requestDelete(pipeline)
                    }}
                  >
                    <Trash2 size={14} strokeWidth={1.75} aria-hidden="true" />
                  </button>
                </div>
              ))}
              {!visiblePipelines.length && (
                <EmptyState icon={SearchX} label="No pipelines match your search." />
              )}
            </div>
          </>
        )}
      </section>

      {pendingDelete && (
        <div
          className="confirm-backdrop"
          role="presentation"
          onClick={() => setPendingDelete(null)}
        >
          <div
            className="confirm-dialog"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-pipeline-title"
            aria-describedby="delete-pipeline-desc"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 id="delete-pipeline-title">Delete pipeline?</h3>
            <p id="delete-pipeline-desc" className="subtitle">
              <strong>{pendingDelete.title}</strong> has {pendingDelete.steps.length}{' '}
              {pendingDelete.steps.length === 1 ? 'step' : 'steps'}. This cannot be undone.
            </p>
            <div className="confirm-actions">
              <button
                type="button"
                className="ghost"
                onClick={() => setPendingDelete(null)}
              >
                Cancel
              </button>
              <button type="button" className="primary danger" onClick={confirmDelete}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default HomePage
