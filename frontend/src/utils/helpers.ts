export const helpers = {
  upper: (value: string) => value.toUpperCase(),
  lower: (value: string) => value.toLowerCase(),
  trim: (value: string) => value.trim(),
}

export const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error)

/** Format a pipeline value for the Output panel (steps keep structured data in between). */
export const formatPipelineOutput = (value: unknown): string => {
  if (value == null) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
    return String(value)
  }
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}
