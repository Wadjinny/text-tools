export const normalizeTitle = (title: string) => title.trim()

export const findStepWithTitle = <T extends { id: string; title: string }>(
  steps: T[],
  title: string,
  excludeId?: string,
) => {
  const normalized = normalizeTitle(title)
  if (!normalized) return null
  return (
    steps.find(
      (step) => step.id !== excludeId && normalizeTitle(step.title) === normalized,
    ) ?? null
  )
}

/** Returns `base` if free, otherwise `base (2)`, `base (3)`, … */
export const makeUniqueTitle = <T extends { id: string; title: string }>(
  steps: T[],
  base: string,
  excludeId?: string,
) => {
  const trimmed = normalizeTitle(base) || 'title'
  if (!findStepWithTitle(steps, trimmed, excludeId)) return trimmed
  let n = 2
  while (findStepWithTitle(steps, `${trimmed} (${n})`, excludeId)) {
    n += 1
  }
  return `${trimmed} (${n})`
}
