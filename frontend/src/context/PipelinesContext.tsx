import { useEffect, useMemo, useState, type ReactNode } from 'react'
import type { LibraryStep, StoredState } from '../types'
import { STORAGE_KEY, STORAGE_VERSION } from '../utils/constants'
import { loadStoredState } from '../utils/storage'
import { usePipelines } from '../hooks/usePipelines'
import { PipelinesContext, type PipelinesContextValue } from './pipelines-context'

export const PipelinesProvider = ({ children }: { children: ReactNode }) => {
  const stored = useMemo(() => loadStoredState(), [])
  const pipelinesAPI = usePipelines(stored.pipelines)
  const [librarySteps, setLibrarySteps] = useState<LibraryStep[]>(stored.librarySteps)
  const [selectedStepId, setSelectedStepId] = useState<string | null>(stored.selectedStepId)

  useEffect(() => {
    const state: StoredState = {
      version: STORAGE_VERSION,
      pipelines: pipelinesAPI.pipelines,
      selectedPipelineId: null,
      selectedStepId,
      librarySteps,
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      // ignore
    }
  }, [pipelinesAPI.pipelines, selectedStepId, librarySteps])

  const value = useMemo<PipelinesContextValue>(
    () => ({
      pipelines: pipelinesAPI.pipelines,
      setPipelines: pipelinesAPI.setPipelines,
      addPipeline: pipelinesAPI.addPipeline,
      updatePipelineTitle: pipelinesAPI.updatePipelineTitle,
      deletePipeline: pipelinesAPI.deletePipeline,
      updatePipelineInputText: pipelinesAPI.updatePipelineInputText,
      getPipeline: pipelinesAPI.getPipeline,
      librarySteps,
      setLibrarySteps,
      selectedStepId,
      setSelectedStepId,
    }),
    [
      pipelinesAPI.pipelines,
      pipelinesAPI.setPipelines,
      pipelinesAPI.addPipeline,
      pipelinesAPI.updatePipelineTitle,
      pipelinesAPI.deletePipeline,
      pipelinesAPI.updatePipelineInputText,
      pipelinesAPI.getPipeline,
      librarySteps,
      selectedStepId,
    ]
  )

  return (
    <PipelinesContext.Provider value={value}>{children}</PipelinesContext.Provider>
  )
}
