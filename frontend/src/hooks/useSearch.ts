import { useState, useMemo } from 'react'
import type { Pipeline, Step, LibraryStep } from '../types'

export const useSearch = (
  pipelines: Pipeline[],
  activeSteps: Step[],
  librarySteps: LibraryStep[]
) => {
  const [pipelineSearch, setPipelineSearch] = useState('')
  const [stepSearch, setStepSearch] = useState('')
  const [librarySearch, setLibrarySearch] = useState('')

  const visiblePipelines = useMemo(() => {
    const query = pipelineSearch.trim().toLowerCase()
    if (!query) return pipelines
    return pipelines.filter((pipeline) => pipeline.title.toLowerCase().includes(query))
  }, [pipelineSearch, pipelines])

  const visibleSteps = useMemo(() => {
    const query = stepSearch.trim().toLowerCase()
    if (!query) return activeSteps
    return activeSteps.filter(
      (step) =>
        step.title.toLowerCase().includes(query) ||
        step.code.toLowerCase().includes(query)
    )
  }, [stepSearch, activeSteps])

  const visibleLibrarySteps = useMemo(() => {
    const query = librarySearch.trim().toLowerCase()
    if (!query) return librarySteps
    return librarySteps.filter(
      (step) =>
        step.title.toLowerCase().includes(query) ||
        step.code.toLowerCase().includes(query)
    )
  }, [librarySearch, librarySteps])

  return {
    pipelineSearch,
    stepSearch,
    librarySearch,
    visiblePipelines,
    visibleSteps,
    visibleLibrarySteps,
    setPipelineSearch,
    setStepSearch,
    setLibrarySearch,
  }
}
