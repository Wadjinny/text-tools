import { createContext } from 'react'
import type { LibraryStep, Pipeline } from '../types'

export type PipelinesContextValue = {
  pipelines: Pipeline[]
  setPipelines: React.Dispatch<React.SetStateAction<Pipeline[]>>
  addPipeline: () => string
  updatePipelineTitle: (id: string, title: string) => void
  deletePipeline: (id: string) => void
  updatePipelineInputText: (id: string, inputText: string) => void
  getPipeline: (id: string) => Pipeline | null
  librarySteps: LibraryStep[]
  setLibrarySteps: React.Dispatch<React.SetStateAction<LibraryStep[]>>
  selectedStepId: string | null
  setSelectedStepId: (id: string | null) => void
}

export const PipelinesContext = createContext<PipelinesContextValue | null>(null)
