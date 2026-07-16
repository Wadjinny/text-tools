import type { Step, Pipeline, LibraryStep } from '../types'
import { DEFAULT_CODE } from './constants'

export const createStep = (index: number): Step => ({
  id: crypto.randomUUID(),
  title: `title ${index}`,
  code: DEFAULT_CODE,
  muted: false,
  createdAt: Date.now(),
  updatedAt: Date.now(),
})

export const createPipeline = (index: number): Pipeline => ({
  id: crypto.randomUUID(),
  title: `Pipeline ${index}`,
  steps: [],
  inputText: '',
  createdAt: Date.now(),
  updatedAt: Date.now(),
})

export const createLibraryStep = (index: number, seed?: Step): LibraryStep => ({
  id: crypto.randomUUID(),
  title: seed?.title ?? `Library Step ${index}`,
  code: seed?.code ?? DEFAULT_CODE,
  createdAt: Date.now(),
  updatedAt: Date.now(),
})
