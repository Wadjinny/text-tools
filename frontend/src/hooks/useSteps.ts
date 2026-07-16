import { useMemo, useCallback, useState } from 'react'
import type { Step, Pipeline } from '../types'
import { createStep } from '../utils/factories'
import { findStepWithTitle, makeUniqueTitle, normalizeTitle } from '../utils/titles'

export const useSteps = (
  activePipeline: Pipeline | null,
  selectedStepId: string | null,
  setSelectedStepId: (id: string | null) => void,
  setPipelines: React.Dispatch<React.SetStateAction<Pipeline[]>>
) => {
  const [editingTitleStepId, setEditingTitleStepId] = useState<string | null>(null)
  const [deletingStepIds, setDeletingStepIds] = useState<Record<string, true>>({})

  const activeSteps = useMemo(() => activePipeline?.steps ?? [], [activePipeline])

  const selectedStep = useMemo(
    () => activeSteps.find((step) => step.id === selectedStepId) ?? null,
    [activeSteps, selectedStepId]
  )

  const updateActiveSteps = useCallback(
    (updater: (prev: Step[]) => Step[]) => {
      if (!activePipeline) return
      setPipelines((prev) =>
        prev.map((pipeline) =>
          pipeline.id === activePipeline.id
            ? { ...pipeline, steps: updater(pipeline.steps), updatedAt: Date.now() }
            : pipeline
        )
      )
    },
    [activePipeline, setPipelines]
  )

  const addStep = () => {
    if (!activePipeline) return
    updateActiveSteps((prev) => {
      const step = createStep(prev.length + 1)
      step.title = makeUniqueTitle(prev, step.title)
      const next = [...prev, step]
      setSelectedStepId(next[next.length - 1].id)
      return next
    })
  }

  const updateStep = (
    id: string,
    updates: Partial<Step>,
  ):
    | { ok: true }
    | { ok: false; reason: 'duplicate-title'; existing: Step }
    | { ok: false; reason: 'empty-title' } => {
    if (updates.title !== undefined) {
      const nextTitle = normalizeTitle(updates.title)
      if (!nextTitle) {
        return { ok: false, reason: 'empty-title' }
      }
      const existing = findStepWithTitle(activeSteps, nextTitle, id)
      if (existing) {
        return { ok: false, reason: 'duplicate-title', existing }
      }
      updates = { ...updates, title: nextTitle }
    }

    updateActiveSteps((prev) =>
      prev.map((step) =>
        step.id === id ? { ...step, ...updates, updatedAt: Date.now() } : step
      )
    )
    return { ok: true }
  }

  const deleteStep = (id: string) => {
    updateActiveSteps((prev) => {
      const next = prev.filter((step) => step.id !== id)
      if (selectedStepId === id) {
        setSelectedStepId(next[0]?.id ?? null)
      }
      return next
    })
  }

  const requestDeleteStep = (id: string) => {
    setDeletingStepIds((prev) => ({ ...prev, [id]: true }))
    window.setTimeout(() => {
      deleteStep(id)
      window.setTimeout(() => {
        setDeletingStepIds((prev) => {
          const next = { ...prev }
          delete next[id]
          return next
        })
      }, 0)
    }, 220)
  }

  const moveStep = (fromIndex: number, toIndex: number) => {
    if (!activePipeline) return
    updateActiveSteps((prev) => {
      const next = [...prev]
      if (fromIndex < 0 || fromIndex >= next.length || toIndex < 0 || toIndex >= next.length) {
        return next
      }
      const [moved] = next.splice(fromIndex, 1)
      next.splice(toIndex, 0, moved)
      return next
    })
  }

  return {
    activeSteps,
    selectedStepId,
    selectedStep,
    editingTitleStepId,
    deletingStepIds,
    addStep,
    updateStep,
    deleteStep,
    requestDeleteStep,
    moveStep,
    setSelectedStepId,
    setEditingTitleStepId,
    updateActiveSteps,
  }
}
