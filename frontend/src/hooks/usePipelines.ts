import { useState } from 'react'
import type { Pipeline } from '../types'
import { createPipeline } from '../utils/factories'

export const usePipelines = (initialPipelines: Pipeline[]) => {
  const [pipelines, setPipelines] = useState<Pipeline[]>(initialPipelines)

  const addPipeline = (): string => {
    const pipeline = createPipeline(1)
    setPipelines((prev) => [
      ...prev,
      { ...pipeline, title: `Pipeline ${prev.length + 1}` },
    ])
    return pipeline.id
  }

  const updatePipelineTitle = (id: string, title: string) => {
    setPipelines((prev) =>
      prev.map((pipeline) =>
        pipeline.id === id ? { ...pipeline, title, updatedAt: Date.now() } : pipeline
      )
    )
  }

  const deletePipeline = (id: string) => {
    setPipelines((prev) => prev.filter((pipeline) => pipeline.id !== id))
  }

  const updatePipelineInputText = (id: string, inputText: string) => {
    setPipelines((prev) =>
      prev.map((pipeline) =>
        pipeline.id === id ? { ...pipeline, inputText, updatedAt: Date.now() } : pipeline
      )
    )
  }

  const getPipeline = (id: string): Pipeline | null =>
    pipelines.find((pipeline) => pipeline.id === id) ?? null

  return {
    pipelines,
    setPipelines,
    addPipeline,
    updatePipelineTitle,
    deletePipeline,
    updatePipelineInputText,
    getPipeline,
  }
}
