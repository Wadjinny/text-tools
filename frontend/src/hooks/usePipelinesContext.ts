import { useContext } from 'react'
import { PipelinesContext } from '../context/pipelines-context'
import type { PipelinesContextValue } from '../context/pipelines-context'

export const usePipelinesContext = (): PipelinesContextValue => {
  const ctx = useContext(PipelinesContext)
  if (!ctx) {
    throw new Error('usePipelinesContext must be used within PipelinesProvider')
  }
  return ctx
}
