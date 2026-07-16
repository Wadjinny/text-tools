export type Step = {
  id: string
  title: string
  code: string
  muted: boolean
  createdAt: number
  updatedAt: number
}

export type Pipeline = {
  id: string
  title: string
  steps: Step[]
  inputText?: string
  createdAt: number
  updatedAt: number
}

export type LibraryStep = {
  id: string
  title: string
  code: string
  createdAt: number
  updatedAt: number
}

export type StoredState = {
  version: 2
  pipelines: Pipeline[]
  selectedPipelineId: string | null
  selectedStepId: string | null
  librarySteps: LibraryStep[]
}

export type RunScope = 'all' | 'from' | 'to'
