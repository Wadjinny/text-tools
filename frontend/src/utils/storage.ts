import type { Pipeline, StoredState } from '../types'
import { STORAGE_KEY, STORAGE_VERSION } from './constants'

type LegacyStoredStateV1 = {
  version: 1
  stepGroups?: Pipeline[]
  selectedGroupId?: string | null
  selectedStepId?: string | null
  librarySteps?: StoredState['librarySteps']
}

const emptyState = (): StoredState => ({
  version: STORAGE_VERSION,
  pipelines: [],
  selectedPipelineId: null,
  selectedStepId: null,
  librarySteps: [],
})

const normalizePipelines = (pipelines: Pipeline[]): Pipeline[] =>
  pipelines.map((pipeline) => ({
    ...pipeline,
    inputText: pipeline.inputText ?? '',
  }))

const migrateFromV1 = (parsed: LegacyStoredStateV1): StoredState => ({
  version: STORAGE_VERSION,
  pipelines: Array.isArray(parsed.stepGroups)
    ? normalizePipelines(parsed.stepGroups)
    : [],
  selectedPipelineId: parsed.selectedGroupId ?? null,
  selectedStepId: parsed.selectedStepId ?? null,
  librarySteps: Array.isArray(parsed.librarySteps) ? parsed.librarySteps : [],
})

export const loadStoredState = (): StoredState => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return emptyState()

    const parsed = JSON.parse(raw) as LegacyStoredStateV1 | StoredState
    if (!parsed) return emptyState()

    if (parsed.version === 1) {
      return migrateFromV1(parsed)
    }

    if (parsed.version !== STORAGE_VERSION) {
      return emptyState()
    }

    const current = parsed as StoredState
    return {
      version: STORAGE_VERSION,
      pipelines: Array.isArray(current.pipelines)
        ? normalizePipelines(current.pipelines)
        : [],
      selectedPipelineId: current.selectedPipelineId ?? null,
      selectedStepId: current.selectedStepId ?? null,
      librarySteps: Array.isArray(current.librarySteps) ? current.librarySteps : [],
    }
  } catch {
    return emptyState()
  }
}

export const saveToLocalStorage = (key: string, value: any) => {
  try {
    localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value))
  } catch {
    // ignore
  }
}

export const loadFromLocalStorage = <T>(key: string, defaultValue: T): T => {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return defaultValue
    const parsed = JSON.parse(raw)
    return parsed ?? defaultValue
  } catch {
    return defaultValue
  }
}
