import { useState, useCallback, useEffect, useRef } from 'react'
import type { Step, RunScope } from '../types'
import { helpers, getErrorMessage, formatPipelineOutput } from '../utils/helpers'
import { BUBBLE_DELAY } from '../utils/constants'

export const usePipeline = (
  activeSteps: Step[],
  hasActivePipeline: boolean,
  initialInputText: string,
  onInputTextChange?: (inputText: string) => void
) => {
  const [inputText, setInputText] = useState(initialInputText)
  const [outputText, setOutputText] = useState('')
  const [stepErrors, setStepErrors] = useState<Record<string, string>>({})
  const [runScope] = useState<RunScope>('all')
  const [scopeStepId, setScopeStepId] = useState<string | null>(null)
  const onInputTextChangeRef = useRef(onInputTextChange)

  useEffect(() => {
    onInputTextChangeRef.current = onInputTextChange
  }, [onInputTextChange])

  useEffect(() => {
    setInputText(initialInputText)
  }, [initialInputText])

  useEffect(() => {
    if (onInputTextChangeRef.current) {
      onInputTextChangeRef.current(inputText)
    }
  }, [inputText])

  const resolveScopeSteps = useCallback(
    (scope: RunScope, anchorId: string | null) => {
      if (scope === 'all') return activeSteps
      const anchor = anchorId
      if (!anchor) return activeSteps
      const anchorIndex = activeSteps.findIndex((step) => step.id === anchor)
      if (anchorIndex < 0) return activeSteps
      if (scope === 'from') return activeSteps.slice(anchorIndex)
      return activeSteps.slice(0, anchorIndex + 1)
    },
    [activeSteps]
  )

  const executePipeline = useCallback(
    (scope: RunScope, anchorId: string | null) => {
      const errors: Record<string, string> = {}
      let current: unknown = inputText
      const pipeline = resolveScopeSteps(scope, anchorId)
      for (const step of pipeline) {
        if (step.muted) continue
        try {
          const fn = new Function('input', 'helpers', step.code) as (
            input: unknown,
            stepHelpers: typeof helpers,
          ) => unknown
          current = fn(current, helpers)
        } catch (error) {
          errors[step.id] = getErrorMessage(error)
          return { output: current, errors, failedStep: step }
        }
      }
      return { output: current, errors, failedStep: null as Step | null }
    },
    [inputText, resolveScopeSteps]
  )

  const runPipeline = useCallback(
    (scope = runScope, anchorId = scopeStepId) => {
      const result = executePipeline(scope, anchorId)
      setStepErrors(result.errors)
      if (result.failedStep) {
        setOutputText(
          `Error in "${result.failedStep.title}": ${result.errors[result.failedStep.id]}`
        )
      } else {
        setOutputText(formatPipelineOutput(result.output))
      }
    },
    [executePipeline, runScope, scopeStepId]
  )

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (!hasActivePipeline) return
      runPipeline()
    }, BUBBLE_DELAY)
    return () => window.clearTimeout(timer)
  }, [inputText, activeSteps, runScope, scopeStepId, runPipeline, hasActivePipeline])

  return {
    inputText,
    outputText,
    stepErrors,
    runScope,
    scopeStepId,
    setInputText,
    setScopeStepId,
    executePipeline,
    runPipeline,
  }
}
