export const BUBBLE_DELAY = 20
export const STORAGE_KEY = 'text-transformer-steps-v1'
export const STORAGE_VERSION = 2
export const EDITOR_SPLIT_STORAGE_KEY = 'text-transformer-editor-split-v1'
export const IO_SPLIT_STORAGE_KEY = 'text-transformer-io-split-v1'
export const SIDEBAR_SPLIT_STORAGE_KEY = 'text-transformer-sidebar-split-v1'
export const LIBRARY_SPLIT_STORAGE_KEY = 'text-transformer-library-split-v1'
export const SIDEBAR_COLLAPSED_STORAGE_KEY = 'text-transformer-sidebar-collapsed-v1'
export const LIBRARY_COLLAPSED_STORAGE_KEY = 'text-transformer-library-collapsed-v1'
export const EDITOR_COLLAPSED_STORAGE_KEY = 'text-transformer-editor-collapsed-v1'
export const PANEL_COLLAPSE_THRESHOLD = 120
export const PANEL_RAIL_WIDTH = 32
export const PANEL_RAIL_HEIGHT = 28
export const DEFAULT_SIDEBAR_WIDTH = 220
export const DEFAULT_LIBRARY_WIDTH = 280
export const DEFAULT_EDITOR_HEIGHT = 280
export const MIN_IO_PANE = 90
export const DEFAULT_CODE = `return input`
export const HELPERS_LIB = `type Helpers = {
  upper(value: string): string
  lower(value: string): string
  trim(value: string): string
}

declare const helpers: Helpers
/** Previous step's return value (or the pipeline input string for the first step). */
declare const input: unknown
`
