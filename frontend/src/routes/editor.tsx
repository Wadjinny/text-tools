import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Editor from '@monaco-editor/react'
import type { Monaco } from '@monaco-editor/react'
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import type {
  DragStartEvent,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { motion } from 'framer-motion'
import { Navigate, useParams } from 'react-router'
import {
  ListPlus,
  Library,
  MousePointerClick,
  Plus,
  ChevronDown,
  ChevronRight,
  PanelLeftClose,
  PanelRightClose,
  PanelLeftOpen,
  PanelRightOpen,
  PanelTopClose,
  PanelTopOpen,
  Volume2,
  VolumeX,
  BookmarkPlus,
  Trash2,
} from 'lucide-react'
import { StepItem } from '../components/StepItem'
import { SortableStepItem } from '../components/SortableStepItem'
import { Droppable } from '../components/Droppable'
import { EmptyState } from '../components/EmptyState'
import type { LibraryStep } from '../types'
import {
  EDITOR_SPLIT_STORAGE_KEY,
  IO_SPLIT_STORAGE_KEY,
  SIDEBAR_SPLIT_STORAGE_KEY,
  LIBRARY_SPLIT_STORAGE_KEY,
  SIDEBAR_COLLAPSED_STORAGE_KEY,
  LIBRARY_COLLAPSED_STORAGE_KEY,
  EDITOR_COLLAPSED_STORAGE_KEY,
  PANEL_COLLAPSE_THRESHOLD,
  PANEL_RAIL_WIDTH,
  PANEL_RAIL_HEIGHT,
  DEFAULT_SIDEBAR_WIDTH,
  DEFAULT_LIBRARY_WIDTH,
  DEFAULT_EDITOR_HEIGHT,
  MIN_IO_PANE,
  HELPERS_LIB,
} from '../utils/constants'
import { usePipelinesContext } from '../hooks/usePipelinesContext'
import { useSteps } from '../hooks/useSteps'
import { useLibrary } from '../hooks/useLibrary'
import { usePipeline } from '../hooks/usePipeline'
import { useSearch } from '../hooks/useSearch'

function EditorPage() {
  const { pipelineId } = useParams<{ pipelineId: string }>()
  const {
    pipelines,
    setPipelines,
    updatePipelineInputText,
    librarySteps,
    setLibrarySteps,
    selectedStepId,
    setSelectedStepId,
  } = usePipelinesContext()

  const activePipeline = useMemo(
    () => pipelines.find((pipeline) => pipeline.id === pipelineId) ?? null,
    [pipelines, pipelineId]
  )

  // Monaco editor configuration
  const didInitMonaco = useRef(false)
  const [inputLanguage, setInputLanguage] = useState('plaintext')
  const [outputLanguage, setOutputLanguage] = useState('plaintext')

  const handleEditorBeforeMount = useCallback((monaco: Monaco) => {
    if (didInitMonaco.current) return
    didInitMonaco.current = true
    monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
      allowJs: true,
      allowNonTsExtensions: true,
      target: monaco.languages.typescript.ScriptTarget.ES2020,
    })
    monaco.languages.typescript.javascriptDefaults.addExtraLib(
      HELPERS_LIB,
      'file:///helpers.d.ts',
    )
  }, [])

  const stepsAPI = useSteps(activePipeline, selectedStepId, setSelectedStepId, setPipelines)
  const libraryAPI = useLibrary(
    stepsAPI.activeSteps,
    librarySteps,
    setLibrarySteps,
    stepsAPI.updateActiveSteps,
    setSelectedStepId
  )
  const pipelineAPI = usePipeline(
    stepsAPI.activeSteps,
    !!activePipeline,
    activePipeline?.inputText ?? '',
    useCallback(
      (inputText: string) => {
        if (activePipeline) {
          updatePipelineInputText(activePipeline.id, inputText)
        }
      },
      [activePipeline, updatePipelineInputText]
    )
  )
  const searchAPI = useSearch(
    pipelines,
    stepsAPI.activeSteps,
    libraryAPI.librarySteps
  )

  // 5. UI state
  const [stepTitleDraft, setStepTitleDraft] = useState('')
  const [ioLayout, setIoLayout] = useState<'horizontal' | 'vertical'>('vertical')
  const [ioSplitPx, setIoSplitPx] = useState<number | null>(() => {
    try {
      const raw = localStorage.getItem(IO_SPLIT_STORAGE_KEY)
      if (!raw) return null
      const n = Number(raw)
      return Number.isFinite(n) && n > 0 ? n : null
    } catch {
      return null
    }
  })
  const [isResizingIo, setIsResizingIo] = useState(false)
  const ioSectionRef = useRef<HTMLElement | null>(null)
  const resizeStartIoRef = useRef(0)
  const resizeStartIoSplitRef = useRef(0)
  const [isLibraryExpanded, setIsLibraryExpanded] = useState(true)
  const [saveNotice, setSaveNotice] = useState<string | null>(null)
  const saveNoticeTimerRef = useRef<number | null>(null)
  const [contextMenu, setContextMenu] = useState<{
    x: number
    y: number
    stepId: string
  } | null>(null)

  const showSaveNotice = useCallback((message: string) => {
    setSaveNotice(message)
    if (saveNoticeTimerRef.current != null) {
      window.clearTimeout(saveNoticeTimerRef.current)
    }
    saveNoticeTimerRef.current = window.setTimeout(() => {
      setSaveNotice(null)
      saveNoticeTimerRef.current = null
    }, 3200)
  }, [])

  const trySaveStepToLibrary = useCallback(
    (step?: (typeof stepsAPI.activeSteps)[number]) => {
      const result = libraryAPI.saveStepToLibrary(step)
      if (!result.saved && result.duplicate && result.reason) {
        showSaveNotice(
          libraryAPI.duplicateSaveMessage(result.duplicate, result.reason),
        )
      }
    },
    [
      libraryAPI.saveStepToLibrary,
      libraryAPI.duplicateSaveMessage,
      showSaveNotice,
    ],
  )

  const applyStepTitle = useCallback(
    (id: string, title: string) => {
      const result = stepsAPI.updateStep(id, { title })
      if (!result.ok && result.reason === 'duplicate-title') {
        showSaveNotice(
          `${result.existing.title} is already used by another step.`,
        )
        return false
      }
      if (!result.ok && result.reason === 'empty-title') {
        return false
      }
      return true
    },
    [stepsAPI.updateStep, showSaveNotice],
  )

  const selectedLibraryDuplicate = useMemo(() => {
    if (!stepsAPI.selectedStep) return null
    return libraryAPI.findLibraryDuplicate(stepsAPI.selectedStep)
  }, [
    stepsAPI.selectedStep,
    libraryAPI.findLibraryDuplicate,
    libraryAPI.librarySteps,
  ])

  useEffect(() => {
    setStepTitleDraft(stepsAPI.selectedStep?.title ?? '')
  }, [stepsAPI.selectedStep?.id, stepsAPI.selectedStep?.title])

  useEffect(() => {
    return () => {
      if (saveNoticeTimerRef.current != null) {
        window.clearTimeout(saveNoticeTimerRef.current)
      }
    }
  }, [])

  // 6. Drag-and-drop state
  const [isDraggingOverSidebar, setIsDraggingOverSidebar] = useState(false)
  const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null)
  const [activeDragId, setActiveDragId] = useState<string | null>(null)

  // 6. Layout/resize state
  const appRef = useRef<HTMLDivElement | null>(null)
  const appMainRef = useRef<HTMLElement | null>(null)
  const [editorPanelHeight, setEditorPanelHeight] = useState<number | null>(() => {
    try {
      const raw = localStorage.getItem(EDITOR_SPLIT_STORAGE_KEY)
      if (!raw) return null
      const n = Number(raw)
      return Number.isFinite(n) ? n : null
    } catch {
      return null
    }
  })
  const [editorCollapsed, setEditorCollapsed] = useState(() => {
    try {
      return localStorage.getItem(EDITOR_COLLAPSED_STORAGE_KEY) === '1'
    } catch {
      return false
    }
  })
  const [isResizingEditorSplit, setIsResizingEditorSplit] = useState(false)
  const resizeStartYRef = useRef(0)
  const resizeStartHeightRef = useRef(0)
  const resizeStartEditorCollapsedRef = useRef(false)

  const [sidebarWidth, setSidebarWidth] = useState<number>(() => {
    try {
      const raw = localStorage.getItem(SIDEBAR_SPLIT_STORAGE_KEY)
      const n = Number(raw)
      return Number.isFinite(n) && n > 0 ? n : DEFAULT_SIDEBAR_WIDTH
    } catch {
      return DEFAULT_SIDEBAR_WIDTH
    }
  })
  const [libraryWidth, setLibraryWidth] = useState<number>(() => {
    try {
      const raw = localStorage.getItem(LIBRARY_SPLIT_STORAGE_KEY)
      const n = Number(raw)
      return Number.isFinite(n) && n > 0 ? n : DEFAULT_LIBRARY_WIDTH
    } catch {
      return DEFAULT_LIBRARY_WIDTH
    }
  })
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY) === '1'
    } catch {
      return false
    }
  })
  const [libraryCollapsed, setLibraryCollapsed] = useState(() => {
    try {
      return localStorage.getItem(LIBRARY_COLLAPSED_STORAGE_KEY) === '1'
    } catch {
      return false
    }
  })
  const [isWideLayout, setIsWideLayout] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth > 1024 : true,
  )
  const [isResizingCols, setIsResizingCols] = useState<null | 'sidebar' | 'library'>(null)
  const resizeStartXRef = useRef(0)
  const resizeStartSidebarWidthRef = useRef(DEFAULT_SIDEBAR_WIDTH)
  const resizeStartLibraryWidthRef = useRef(DEFAULT_LIBRARY_WIDTH)
  const resizeStartSidebarCollapsedRef = useRef(false)
  const resizeStartLibraryCollapsedRef = useRef(false)


  // 7. Drag-and-drop handlers
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(event.active.id as string)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && over.id === 'library-droppable' && activePipeline) {
      const stepToSave = stepsAPI.activeSteps.find((step) => step.id === active.id)
      if (stepToSave) {
        trySaveStepToLibrary(stepToSave)
      }
    } else if (over && active.id !== over.id && activePipeline) {
      const oldIndex = stepsAPI.activeSteps.findIndex((step) => step.id === active.id)
      const newIndex = stepsAPI.activeSteps.findIndex((step) => step.id === over.id)

      if (oldIndex !== -1 && newIndex !== -1) {
        stepsAPI.moveStep(oldIndex, newIndex)
      }
    }

    setActiveDragId(null)
  }

  // 8. Effects
  useEffect(() => {
    const handleClick = () => setContextMenu(null)
    window.addEventListener('click', handleClick)
    return () => window.removeEventListener('click', handleClick)
  }, [])

  // HTML5 dragend/drop fire on the source (or window), not the sidebar drop target.
  // Always clear the highlight when a native drag finishes.
  useEffect(() => {
    const clearSidebarDragOver = () => setIsDraggingOverSidebar(false)
    window.addEventListener('dragend', clearSidebarDragOver)
    window.addEventListener('drop', clearSidebarDragOver)
    return () => {
      window.removeEventListener('dragend', clearSidebarDragOver)
      window.removeEventListener('drop', clearSidebarDragOver)
    }
  }, [])

  useEffect(() => {
    if (editorPanelHeight == null) return
    try {
      localStorage.setItem(EDITOR_SPLIT_STORAGE_KEY, String(editorPanelHeight))
    } catch {
      // ignore
    }
  }, [editorPanelHeight])

  useEffect(() => {
    if (ioSplitPx == null) return
    try {
      localStorage.setItem(IO_SPLIT_STORAGE_KEY, String(ioSplitPx))
    } catch {
      // ignore
    }
  }, [ioSplitPx])

  const ioSplitAxis = ioLayout === 'horizontal' || !isWideLayout ? 'y' : 'x'

  useEffect(() => {
    if (!isResizingIo) return
    const handleMove = (event: PointerEvent) => {
      const section = ioSectionRef.current
      if (!section) return
      const rect = section.getBoundingClientRect()
      const handleSize = 4
      const startSize = resizeStartIoSplitRef.current
      if (ioSplitAxis === 'x') {
        const delta = event.clientX - resizeStartIoRef.current
        const max = Math.max(MIN_IO_PANE, rect.width - MIN_IO_PANE - handleSize)
        setIoSplitPx(Math.min(max, Math.max(MIN_IO_PANE, startSize + delta)))
      } else {
        const delta = event.clientY - resizeStartIoRef.current
        const max = Math.max(MIN_IO_PANE, rect.height - MIN_IO_PANE - handleSize)
        setIoSplitPx(Math.min(max, Math.max(MIN_IO_PANE, startSize + delta)))
      }
    }
    const handleUp = () => setIsResizingIo(false)
    window.addEventListener('pointermove', handleMove)
    window.addEventListener('pointerup', handleUp, { once: true })
    return () => {
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerup', handleUp)
    }
  }, [isResizingIo, ioSplitAxis])

  useEffect(() => {
    const onResize = () => setIsWideLayout(window.innerWidth > 1024)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_SPLIT_STORAGE_KEY, String(sidebarWidth))
    } catch {
      // ignore
    }
  }, [sidebarWidth])

  useEffect(() => {
    try {
      localStorage.setItem(LIBRARY_SPLIT_STORAGE_KEY, String(libraryWidth))
    } catch {
      // ignore
    }
  }, [libraryWidth])

  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_COLLAPSED_STORAGE_KEY, sidebarCollapsed ? '1' : '0')
    } catch {
      // ignore
    }
  }, [sidebarCollapsed])

  useEffect(() => {
    try {
      localStorage.setItem(LIBRARY_COLLAPSED_STORAGE_KEY, libraryCollapsed ? '1' : '0')
    } catch {
      // ignore
    }
  }, [libraryCollapsed])

  useEffect(() => {
    try {
      localStorage.setItem(EDITOR_COLLAPSED_STORAGE_KEY, editorCollapsed ? '1' : '0')
    } catch {
      // ignore
    }
  }, [editorCollapsed])

  useEffect(() => {
    if (!isResizingEditorSplit) return
    const handleMove = (event: PointerEvent) => {
      const delta = event.clientY - resizeStartYRef.current
      const main = appMainRef.current
      const container = main?.querySelector('.editor-io-stack') as HTMLDivElement | null
      const containerHeight = container?.clientHeight ?? main?.clientHeight ?? 0

      const minIo = 180
      const startHeight = resizeStartEditorCollapsedRef.current
        ? PANEL_RAIL_HEIGHT
        : resizeStartHeightRef.current
      const maxEditor = Math.max(0, containerHeight - minIo - 16)
      const next = Math.min(maxEditor, Math.max(0, startHeight + delta))

      if (next <= PANEL_COLLAPSE_THRESHOLD) {
        setEditorCollapsed(true)
      } else {
        setEditorCollapsed(false)
        setEditorPanelHeight(next)
      }
    }
    const handleUp = () => setIsResizingEditorSplit(false)

    window.addEventListener('pointermove', handleMove)
    window.addEventListener('pointerup', handleUp, { once: true })
    return () => {
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerup', handleUp)
    }
  }, [isResizingEditorSplit])

  const collapseEditor = () => setEditorCollapsed(true)
  const expandEditor = () => {
    setEditorCollapsed(false)
    setEditorPanelHeight((h) =>
      h == null || h < PANEL_COLLAPSE_THRESHOLD ? DEFAULT_EDITOR_HEIGHT : h,
    )
  }

  const sidebarWidthRef = useRef(sidebarWidth)
  const libraryWidthRef = useRef(libraryWidth)
  const sidebarCollapsedRef = useRef(sidebarCollapsed)
  const libraryCollapsedRef = useRef(libraryCollapsed)
  sidebarWidthRef.current = sidebarWidth
  libraryWidthRef.current = libraryWidth
  sidebarCollapsedRef.current = sidebarCollapsed
  libraryCollapsedRef.current = libraryCollapsed

  useEffect(() => {
    if (!isResizingCols) return

    const handleMove = (event: PointerEvent) => {
      const appWidth = appRef.current?.getBoundingClientRect().width ?? window.innerWidth
      const handleTotal = 24
      const minMain = 360

      if (isResizingCols === 'sidebar') {
        const startWidth = resizeStartSidebarCollapsedRef.current
          ? PANEL_RAIL_WIDTH
          : resizeStartSidebarWidthRef.current
        const delta = event.clientX - resizeStartXRef.current
        const otherWidth = libraryCollapsedRef.current
          ? PANEL_RAIL_WIDTH
          : libraryWidthRef.current
        const maxSidebar = Math.max(0, appWidth - otherWidth - handleTotal - minMain)
        const next = Math.min(maxSidebar, Math.max(0, startWidth + delta))
        if (next <= PANEL_COLLAPSE_THRESHOLD) {
          setSidebarCollapsed(true)
        } else {
          setSidebarCollapsed(false)
          setSidebarWidth(next)
        }
      } else {
        const startWidth = resizeStartLibraryCollapsedRef.current
          ? PANEL_RAIL_WIDTH
          : resizeStartLibraryWidthRef.current
        const delta = event.clientX - resizeStartXRef.current
        const otherWidth = sidebarCollapsedRef.current
          ? PANEL_RAIL_WIDTH
          : sidebarWidthRef.current
        const maxLibrary = Math.max(0, appWidth - otherWidth - handleTotal - minMain)
        // Dragging handle left (delta negative) should increase library width
        const next = Math.min(maxLibrary, Math.max(0, startWidth - delta))
        if (next <= PANEL_COLLAPSE_THRESHOLD) {
          setLibraryCollapsed(true)
        } else {
          setLibraryCollapsed(false)
          setLibraryWidth(next)
        }
      }
    }

    const handleUp = () => setIsResizingCols(null)

    window.addEventListener('pointermove', handleMove)
    window.addEventListener('pointerup', handleUp, { once: true })
    return () => {
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerup', handleUp)
    }
  }, [isResizingCols])

  const collapseSidebar = () => setSidebarCollapsed(true)
  const expandSidebar = () => {
    setSidebarCollapsed(false)
    setSidebarWidth((w) => (w < PANEL_COLLAPSE_THRESHOLD ? DEFAULT_SIDEBAR_WIDTH : w))
  }
  const collapseLibrary = () => setLibraryCollapsed(true)
  const expandLibrary = () => {
    setLibraryCollapsed(false)
    setLibraryWidth((w) => (w < PANEL_COLLAPSE_THRESHOLD ? DEFAULT_LIBRARY_WIDTH : w))
  }

  const sidebarColumnWidth =
    isWideLayout && sidebarCollapsed ? PANEL_RAIL_WIDTH : sidebarWidth
  const libraryColumnWidth =
    isWideLayout && libraryCollapsed ? PANEL_RAIL_WIDTH : libraryWidth

  useEffect(() => {
    if (!activePipeline) {
      setSelectedStepId(null)
      return
    }
    if (!stepsAPI.activeSteps.length) {
      setSelectedStepId(null)
      return
    }
    if (!selectedStepId || !stepsAPI.activeSteps.some((step) => step.id === selectedStepId)) {
      setSelectedStepId(stepsAPI.activeSteps[0].id)
    }
  }, [activePipeline, stepsAPI.activeSteps, selectedStepId, setSelectedStepId])

  useEffect(() => {
    if (pipelineAPI.runScope !== 'all' && stepsAPI.selectedStep) {
      pipelineAPI.setScopeStepId(stepsAPI.selectedStep.id)
    }
  }, [pipelineAPI, stepsAPI.selectedStep])

  if (!pipelineId || !activePipeline) {
    return <Navigate to="/" replace />
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div
        className={`editor-shell ${isResizingCols ? 'is-resizing-cols' : ''}`}
        ref={appRef}
        style={
          isWideLayout
            ? ({
                ['--sidebar-w' as string]: `${sidebarColumnWidth}px`,
                ['--library-w' as string]: `${libraryColumnWidth}px`,
              } as React.CSSProperties)
            : undefined
        }
      >
        <div className="app-content">
        {isWideLayout && sidebarCollapsed ? (
          <div className="panel-rail">
            <button
              type="button"
              className="ghost icon-btn"
              onClick={expandSidebar}
              aria-label="Expand steps panel"
              title="Expand steps"
            >
              <PanelLeftOpen size={14} strokeWidth={1.75} aria-hidden="true" />
            </button>
          </div>
        ) : (
        <aside
          className={`sidebar ${isDraggingOverSidebar ? 'drag-over' : ''}`}
          onDragOver={(event) => {
            event.preventDefault()
            const isReorder = event.dataTransfer.types.includes('text/plain')
            event.dataTransfer.dropEffect = isReorder ? 'move' : 'copy'
            if (!isDraggingOverSidebar) setIsDraggingOverSidebar(true)
          }}
          onDragLeave={(event) => {
            // Only unset if we are actually leaving the sidebar, not entering a child
            const related = event.relatedTarget as Node | null
            if (!related || !event.currentTarget.contains(related)) {
              setIsDraggingOverSidebar(false)
            }
          }}
          onDrop={(event) => {
            event.preventDefault()
            setIsDraggingOverSidebar(false)
            
            const textData = event.dataTransfer.getData('text/plain')
            if (textData && textData.startsWith('REORDER:')) {
               const fromIndex = parseInt(textData.replace('REORDER:', ''), 10)
               if (!isNaN(fromIndex)) {
                   stepsAPI.moveStep(fromIndex, stepsAPI.activeSteps.length - 1)
               }
               return
            }

            const data = event.dataTransfer.getData('application/json')
            if (!data) return
            try {
              const libraryStep = JSON.parse(data) as LibraryStep
              libraryAPI.addStepFromLibrary(libraryStep)
            } catch {
              // ignore
            }
          }}
        >
          <div className="sidebar-header">
            <h2>Steps</h2>
            <div className="sidebar-header-actions">
              {isWideLayout && (
                <button
                  type="button"
                  className="ghost icon-btn"
                  onClick={collapseSidebar}
                  aria-label="Collapse steps panel"
                  title="Collapse steps"
                >
                  <PanelLeftClose size={14} strokeWidth={1.75} aria-hidden="true" />
                </button>
              )}
              <button
                type="button"
                className="primary icon-btn"
                onClick={stepsAPI.addStep}
                aria-label="Add step"
                title="Add step"
              >
                <Plus size={14} strokeWidth={2.25} aria-hidden="true" />
              </button>
            </div>
          </div>
          <input
            className="search"
            placeholder="Search steps"
            value={searchAPI.stepSearch}
            onChange={(event) => searchAPI.setStepSearch(event.target.value)}
           
          />
          <div
            className="step-list"
            onDragOver={(event) => {
              event.preventDefault()
              event.stopPropagation()
              event.dataTransfer.dropEffect = 'copy'
            }}
            onDrop={(event) => {
              event.preventDefault()
              event.stopPropagation()
              setIsDraggingOverSidebar(false)
              const data = event.dataTransfer.getData('application/json')
              if (!data) return
              try {
                const libraryStep = JSON.parse(data) as LibraryStep
                // If dropped directly on the list (not on an item), add to end
                libraryAPI.addStepFromLibrary(libraryStep)
              } catch {
                // ignore invalid data
              }
            }}
          >
            <SortableContext
              items={searchAPI.visibleSteps.map((s) => s.id)}
              strategy={verticalListSortingStrategy}
              disabled={!!searchAPI.stepSearch}
            >
                {searchAPI.visibleSteps.map((step, index) => (
                  <SortableStepItem
                    key={step.id}
                    id={step.id}
                    step={step}
                    index={index}
                    hasActiveDrag={!!activeDragId}
                    layoutEnabled={!isResizingCols}
                    isSelected={step.id === stepsAPI.selectedStep?.id}
                    dropTargetIndex={dropTargetIndex}
                    editingTitleStepId={stepsAPI.editingTitleStepId}
                    className={stepsAPI.deletingStepIds[step.id] ? 'is-deleting' : ''}
                    isDeleting={!!stepsAPI.deletingStepIds[step.id]}
                    onSelect={stepsAPI.setSelectedStepId}
                    onContextMenu={(e: React.MouseEvent, id: string) => {
                      setContextMenu({
                        x: e.clientX,
                        y: e.clientY,
                        stepId: id,
                      })
                    }}
                    onUpdateTitle={applyStepTitle}
                    setEditingTitleStepId={stepsAPI.setEditingTitleStepId}
                    onToggleMuted={(id: string) => {
                      const target = stepsAPI.activeSteps.find((s) => s.id === id)
                      if (!target) return
                      stepsAPI.updateStep(id, { muted: !target.muted })
                    }}
                    onDelete={stepsAPI.requestDeleteStep}
                    onDragOver={(event: React.DragEvent) => {
                      event.preventDefault()
                      event.stopPropagation()
                      event.dataTransfer.dropEffect = 'copy'
                      setDropTargetIndex(index)
                    }}
                    onDragLeave={() => {
                      if (dropTargetIndex === index) {
                        setDropTargetIndex(null)
                      }
                    }}
                    onDrop={(event: React.DragEvent) => {
                      event.preventDefault()
                      event.stopPropagation()
                      setDropTargetIndex(null)
                      setIsDraggingOverSidebar(false)

                      const jsonData = event.dataTransfer.getData('application/json')
                      if (jsonData) {
                        try {
                          const libraryStep = JSON.parse(jsonData)
                          if (libraryStep && typeof libraryStep.title === 'string') {
                            libraryAPI.addStepFromLibrary(libraryStep, index)
                          }
                        } catch {
                          // ignore
                        }
                      }
                    }}
                  />
                ))}
            </SortableContext>
            {!stepsAPI.activeSteps.length && (
              <EmptyState icon={ListPlus} label="This pipeline is empty. Add your first step." />
            )}
          </div>
        </aside>
        )}

        {isWideLayout && (
          <div
            className="vsplitter"
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize steps panel"
            tabIndex={0}
            onPointerDown={(event) => {
              event.preventDefault()
              resizeStartXRef.current = event.clientX
              resizeStartSidebarWidthRef.current = sidebarWidth
              resizeStartSidebarCollapsedRef.current = sidebarCollapsed
              setIsResizingCols('sidebar')
              ;(event.currentTarget as HTMLDivElement).setPointerCapture(event.pointerId)
            }}
          >
            <div className="vsplitter-handle" />
          </div>
        )}

        <main
          className={`app-main ${isResizingEditorSplit ? 'is-resizing' : ''}`}
          ref={(node) => {
            appMainRef.current = node
          }}
        >

          <div className="editor-io-stack">
            {editorCollapsed ? (
              <div className="panel-rail panel-rail-top">
                <div className="panel-rail-label">
                  <span>Step Editor</span>
                </div>
                <button
                  type="button"
                  className="ghost icon-btn"
                  onClick={expandEditor}
                  aria-label="Expand step editor"
                  title="Expand step editor"
                >
                  <PanelTopOpen size={14} strokeWidth={1.75} aria-hidden="true" />
                </button>
              </div>
            ) : (
            <section
              className="panel editor"
              style={editorPanelHeight != null ? { height: `${editorPanelHeight}px` } : undefined}
            >
              <div className="panel-header">
                <div className="panel-header-main">
                  {stepsAPI.selectedStep ? (
                    <input
                      id="step-title"
                      className="panel-title-input"
                      value={stepTitleDraft}
                      onChange={(event) => setStepTitleDraft(event.target.value)}
                      onBlur={(event) => {
                        const step = stepsAPI.selectedStep
                        if (!step) return
                        if (!applyStepTitle(step.id, event.currentTarget.value)) {
                          setStepTitleDraft(step.title)
                        }
                      }}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault()
                          event.currentTarget.blur()
                        }
                        if (event.key === 'Escape') {
                          event.preventDefault()
                          const original = stepsAPI.selectedStep?.title ?? ''
                          setStepTitleDraft(original)
                          event.currentTarget.value = original
                          event.currentTarget.blur()
                        }
                      }}
                      aria-label="Step title"
                      placeholder="Step title"
                    />
                  ) : (
                    <h2>Step Editor</h2>
                  )}
                </div>
                <div className="sidebar-header-actions">
                  {stepsAPI.selectedStep && (
                    <>
                      <button
                        type="button"
                        className={`ghost icon-btn ${selectedLibraryDuplicate ? 'is-disabled' : ''}`}
                        onClick={() => {
                          if (selectedLibraryDuplicate) {
                            showSaveNotice(
                              libraryAPI.duplicateSaveMessage(
                                selectedLibraryDuplicate.step,
                                selectedLibraryDuplicate.reason,
                              ),
                            )
                            return
                          }
                          trySaveStepToLibrary(stepsAPI.selectedStep ?? undefined)
                        }}
                        aria-label={
                          selectedLibraryDuplicate
                            ? libraryAPI.duplicateSaveMessage(
                                selectedLibraryDuplicate.step,
                                selectedLibraryDuplicate.reason,
                              )
                            : 'Save to library'
                        }
                        title={
                          selectedLibraryDuplicate
                            ? libraryAPI.duplicateSaveMessage(
                                selectedLibraryDuplicate.step,
                                selectedLibraryDuplicate.reason,
                              )
                            : 'Save to library'
                        }
                        aria-disabled={!!selectedLibraryDuplicate}
                      >
                        <BookmarkPlus size={14} strokeWidth={1.75} aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        className={`ghost icon-btn ${stepsAPI.selectedStep.muted ? 'is-active' : ''}`}
                        onClick={() => {
                          const step = stepsAPI.selectedStep
                          if (!step) return
                          stepsAPI.updateStep(step.id, { muted: !step.muted })
                        }}
                        aria-label={stepsAPI.selectedStep.muted ? 'Unmute step' : 'Mute step'}
                        title={stepsAPI.selectedStep.muted ? 'Unmute step' : 'Mute step'}
                        aria-pressed={stepsAPI.selectedStep.muted}
                      >
                        {stepsAPI.selectedStep.muted ? (
                          <VolumeX size={14} strokeWidth={1.75} aria-hidden="true" />
                        ) : (
                          <Volume2 size={14} strokeWidth={1.75} aria-hidden="true" />
                        )}
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    className="ghost icon-btn"
                    onClick={collapseEditor}
                    aria-label="Collapse step editor"
                    title="Collapse step editor"
                  >
                    <PanelTopClose size={14} strokeWidth={1.75} aria-hidden="true" />
                  </button>
                </div>
              </div>
              {stepsAPI.selectedStep ? (
                <div className="field field-fill">
                  <div className="code-editor" id="step-code">
                    <Editor
                      height="100%"
                      language="javascript"
                      theme="vs-dark"
                      beforeMount={handleEditorBeforeMount}
                      value={stepsAPI.selectedStep?.code ?? ''}
                      onChange={(value) => {
                        if (stepsAPI.selectedStep) {
                          stepsAPI.updateStep(stepsAPI.selectedStep.id, { code: value ?? '' })
                        }
                      }}
                      options={{
                        minimap: { enabled: false },
                        fontSize: 13,
                        lineNumbers: 'on',
                        quickSuggestions: true,
                        scrollbar: { verticalScrollbarSize: 6, horizontalScrollbarSize: 6 },
                        tabSize: 2,
                        wordWrap: 'on',
                      }}
                    />
                  </div>
                </div>
              ) : (
                <EmptyState icon={MousePointerClick} label="Select a step to begin editing." />
              )}
            </section>
            )}
            <div
              className="splitter"
              role="separator"
              aria-orientation="horizontal"
              aria-label="Resize step editor"
              tabIndex={0}
              onPointerDown={(event) => {
                // Start resize drag
                event.preventDefault()
                const editorEl = appMainRef.current?.querySelector('section.panel.editor') as HTMLElement | null
                resizeStartYRef.current = event.clientY
                resizeStartHeightRef.current =
                  editorEl?.getBoundingClientRect().height ??
                  editorPanelHeight ??
                  DEFAULT_EDITOR_HEIGHT
                resizeStartEditorCollapsedRef.current = editorCollapsed
                setIsResizingEditorSplit(true)
                ;(event.currentTarget as HTMLDivElement).setPointerCapture(event.pointerId)
              }}
            >
              <div className="splitter-handle" />
            </div>
            <section
              ref={ioSectionRef}
              className={`panel io ${ioLayout}${isResizingIo ? ' is-resizing-io' : ''}`}
              style={
                {
                  flex: '1 1 auto',
                  minHeight: 0,
                  ...(ioSplitPx != null
                    ? { ['--io-split' as string]: `${ioSplitPx}px` }
                    : undefined),
                } as React.CSSProperties
              }
            >
              <div className="io-panel">
                <div className="panel-header">
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <h2>Input</h2>
                    <button
                      className="ghost"
                      style={{ padding: '4px', display: 'flex' }}
                      onClick={() => {
                        setIoSplitPx(null)
                        setIoLayout((prev) => (prev === 'vertical' ? 'horizontal' : 'vertical'))
                      }}
                      title={ioLayout === 'vertical' ? "Switch to horizontal split" : "Switch to vertical split"}
                    >
                      {ioLayout === 'vertical' ? (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="4" y="4" width="16" height="16" rx="2" />
                          <line x1="12" y1="4" x2="12" y2="20" />
                        </svg>
                      ) : (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="4" y="4" width="16" height="16" rx="2" />
                          <line x1="4" y1="12" x2="20" y2="12" />
                        </svg>
                      )}
                    </button>
                  </div>
                  <select
                    className="lang-select"
                    value={inputLanguage}
                    onChange={(event) => setInputLanguage(event.target.value)}
                  >
                    <option value="plaintext">Plain text</option>
                    <option value="javascript">JavaScript</option>
                    <option value="json">JSON</option>
                    <option value="html">HTML</option>
                    <option value="css">CSS</option>
                    <option value="markdown">Markdown</option>
                    <option value="xml">XML</option>
                  </select>
                </div>
                <div className="io-editor">
                  <Editor
                    height="100%"
                    language={inputLanguage}
                    theme="vs-dark"
                    beforeMount={handleEditorBeforeMount}
                    value={pipelineAPI.inputText}
                    onChange={(value) => pipelineAPI.setInputText(value ?? '')}
                    options={{
                      minimap: { enabled: false },
                      fontSize: 13,
                      lineNumbers: 'on',
                      quickSuggestions: true,
                      scrollbar: { verticalScrollbarSize: 6, horizontalScrollbarSize: 6 },
                      tabSize: 2,
                      wordWrap: 'on',
                    }}
                  />
                </div>
              </div>
              <div
                className={ioSplitAxis === 'x' ? 'vsplitter' : 'splitter'}
                role="separator"
                aria-orientation={ioSplitAxis === 'x' ? 'vertical' : 'horizontal'}
                aria-label="Resize input and output"
                tabIndex={0}
                onPointerDown={(event) => {
                  event.preventDefault()
                  const section = ioSectionRef.current
                  if (!section) return
                  const firstPane = section.querySelector('.io-panel') as HTMLElement | null
                  const rect = firstPane?.getBoundingClientRect()
                  const fallback =
                    (ioSplitAxis === 'x'
                      ? section.getBoundingClientRect().width
                      : section.getBoundingClientRect().height) / 2
                  resizeStartIoRef.current =
                    ioSplitAxis === 'x' ? event.clientX : event.clientY
                  resizeStartIoSplitRef.current =
                    ioSplitPx ??
                    (ioSplitAxis === 'x' ? rect?.width : rect?.height) ??
                    fallback
                  setIsResizingIo(true)
                  ;(event.currentTarget as HTMLDivElement).setPointerCapture(event.pointerId)
                }}
              >
                <div className={ioSplitAxis === 'x' ? 'vsplitter-handle' : 'splitter-handle'} />
              </div>
              <div className="io-panel">
                <div className="panel-header">
                  <h2>Output</h2>
                  <select
                    className="lang-select"
                    value={outputLanguage}
                    onChange={(event) => setOutputLanguage(event.target.value)}
                  >
                    <option value="plaintext">Plain text</option>
                    <option value="javascript">JavaScript</option>
                    <option value="json">JSON</option>
                    <option value="html">HTML</option>
                    <option value="css">CSS</option>
                    <option value="markdown">Markdown</option>
                    <option value="xml">XML</option>
                  </select>
                </div>
                <div
                  className={`io-editor ${Object.keys(pipelineAPI.stepErrors).length > 0 ? 'has-error' : ''}`}
                >
                  <Editor
                    height="100%"
                    language={outputLanguage}
                    theme="vs-dark"
                    beforeMount={handleEditorBeforeMount}
                    value={pipelineAPI.outputText}
                    options={{
                      readOnly: true,
                      minimap: { enabled: false },
                      fontSize: 13,
                      lineNumbers: 'on',
                      scrollbar: { verticalScrollbarSize: 6, horizontalScrollbarSize: 6 },
                      tabSize: 2,
                      wordWrap: 'on',
                    }}
                  />
                </div>
              </div>
            </section>
          </div>
      </main>

      {isWideLayout && (
        <div
          className="vsplitter"
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize library panel"
          tabIndex={0}
          onPointerDown={(event) => {
            event.preventDefault()
            resizeStartXRef.current = event.clientX
            resizeStartLibraryWidthRef.current = libraryWidth
            resizeStartLibraryCollapsedRef.current = libraryCollapsed
            setIsResizingCols('library')
            ;(event.currentTarget as HTMLDivElement).setPointerCapture(event.pointerId)
          }}
        >
          <div className="vsplitter-handle" />
        </div>
      )}

      {isWideLayout && libraryCollapsed ? (
        <div className="panel-rail panel-rail-right">
          <button
            type="button"
            className="ghost icon-btn"
            onClick={expandLibrary}
            aria-label="Expand library panel"
            title="Expand library"
          >
            <PanelRightOpen size={14} strokeWidth={1.75} aria-hidden="true" />
          </button>
        </div>
      ) : (
      <Droppable id="library-droppable" className="sidebar library">
        <div className="library-section">
          <div className="sidebar-header">
            <button
              type="button"
              className="sidebar-section-toggle"
              onClick={() => setIsLibraryExpanded((prev) => !prev)}
              aria-expanded={isLibraryExpanded}
              aria-label={isLibraryExpanded ? 'Collapse steps library' : 'Expand steps library'}
              title="Steps library"
            >
              <Library size={14} strokeWidth={1.75} aria-hidden="true" />
              {isLibraryExpanded ? (
                <ChevronDown size={14} strokeWidth={1.75} aria-hidden="true" />
              ) : (
                <ChevronRight size={14} strokeWidth={1.75} aria-hidden="true" />
              )}
            </button>
            {isWideLayout && (
              <button
                type="button"
                className="ghost icon-btn"
                onClick={collapseLibrary}
                aria-label="Collapse library panel"
                title="Collapse library"
              >
                <PanelRightClose size={14} strokeWidth={1.75} aria-hidden="true" />
              </button>
            )}
          </div>
          {isLibraryExpanded && (
            <>
              <input
                className="search"
                placeholder="Search library"
                value={searchAPI.librarySearch}
                onChange={(event) => searchAPI.setLibrarySearch(event.target.value)}
              />
              <div
                className="library-list"
                onDragOver={(event) => {
                  // Allow dropping to reorder within the library list
                  event.preventDefault()
                  event.dataTransfer.dropEffect = 'move'
                }}
                onDrop={(event) => {
                  event.preventDefault()
                  libraryAPI.setLibraryDropTargetIndex(null)

                  const textData = event.dataTransfer.getData('text/plain')
                  if (textData && textData.startsWith('LIB_REORDER:')) {
                    const fromIndex = parseInt(textData.replace('LIB_REORDER:', ''), 10)
                    if (!Number.isNaN(fromIndex)) {
                      // Dropped on the list itself → move to end
                      libraryAPI.moveLibraryStep(fromIndex, Math.max(0, libraryAPI.librarySteps.length - 1))
                    }
                  }
                }}
              >
                {searchAPI.visibleLibrarySteps.map((step, index) => (
                  <motion.div
                    key={step.id}
                    layout={!isResizingCols ? 'position' : false}
                    transition={{ type: 'spring', stiffness: 600, damping: 45 }}
                  >
                    <div
                      className={`library-item ${step.id === libraryAPI.selectedLibraryStep?.id ? 'active' : ''} ${libraryAPI.libraryDropTargetIndex === index ? 'drop-target' : ''}`}
                      draggable={libraryAPI.editingLibraryTitleId !== step.id}
                      onDragStart={(event: React.DragEvent<HTMLDivElement>) => {
                        if (libraryAPI.editingLibraryTitleId === step.id) return
                        event.dataTransfer.setData(
                          'application/json',
                          JSON.stringify(step),
                        )
                        // Also allow reordering within the library list
                        event.dataTransfer.setData('text/plain', `LIB_REORDER:${index}`)
                        event.dataTransfer.effectAllowed = 'copyMove'
                      }}
                      onDragOver={(event: React.DragEvent<HTMLDivElement>) => {
                        event.preventDefault()
                        event.stopPropagation()
                        event.dataTransfer.dropEffect = 'move'
                        libraryAPI.setLibraryDropTargetIndex(index)
                      }}
                      onDragLeave={() => {
                        if (libraryAPI.libraryDropTargetIndex === index) {
                          libraryAPI.setLibraryDropTargetIndex(null)
                        }
                      }}
                      onDrop={(event: React.DragEvent<HTMLDivElement>) => {
                        event.preventDefault()
                        event.stopPropagation()
                        libraryAPI.setLibraryDropTargetIndex(null)

                        const textData = event.dataTransfer.getData('text/plain')
                        if (textData && textData.startsWith('LIB_REORDER:')) {
                          const fromIndex = parseInt(
                            textData.replace('LIB_REORDER:', ''),
                            10,
                          )
                          if (!Number.isNaN(fromIndex)) {
                            libraryAPI.moveLibraryStep(fromIndex, index)
                          }
                        }
                      }}
                    >
                    <button
                      type="button"
                      className="library-select"
                      onClick={() => libraryAPI.setSelectedLibraryStepId(step.id)}
                    >
                      {libraryAPI.editingLibraryTitleId === step.id ? (
                        <input
                          autoFocus
                          className="step-title-input"
                          value={step.title}
                          onChange={(e) =>
                            libraryAPI.updateLibraryStep(step.id, { title: e.target.value })
                          }
                          onBlur={() => libraryAPI.setEditingLibraryTitleId(null)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') libraryAPI.setEditingLibraryTitleId(null)
                            e.stopPropagation()
                          }}
                          onClick={(e) => e.stopPropagation()}
                          onPointerDown={(e) => e.stopPropagation()}
                        />
                      ) : (
                        <span
                          onDoubleClick={(e) => {
                            e.stopPropagation()
                            libraryAPI.setEditingLibraryTitleId(step.id)
                          }}
                        >
                          {step.title}
                        </span>
                      )}
                    </button>
                    <div className="library-actions">
                      <button
                        type="button"
                        className="ghost icon-btn"
                        onClick={() => libraryAPI.addStepFromLibrary(step)}
                        aria-label="Add to pipeline"
                        title="Add to pipeline"
                      >
                        <Plus size={14} strokeWidth={2} aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        className="ghost icon-btn danger"
                        onClick={() => libraryAPI.deleteLibraryStep(step.id)}
                        aria-label="Delete from library"
                        title="Delete from library"
                      >
                        <Trash2 size={14} strokeWidth={1.75} aria-hidden="true" />
                      </button>
                    </div>
                    </div>
                  </motion.div>
                ))}
                {!libraryAPI.librarySteps.length && (
                  <EmptyState icon={Library} label="Save a step to build your library." />
                )}
              </div>
              {libraryAPI.selectedLibraryStep && (
                <div className="library-editor">
                  <div className="field">
                    <label htmlFor="library-title">Library title</label>
                    <input
                      id="library-title"
                      value={libraryAPI.selectedLibraryStep?.title ?? ''}
                      onChange={(event) => {
                        if (libraryAPI.selectedLibraryStep) {
                          libraryAPI.updateLibraryStep(libraryAPI.selectedLibraryStep.id, {
                            title: event.target.value,
                          })
                        }
                      }}
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="library-code">Library code</label>
                    <div className="code-editor" id="library-code">
                      <Editor
                        height="180px"
                        language="javascript"
                        theme="vs-dark"
                        beforeMount={handleEditorBeforeMount}
                        value={libraryAPI.selectedLibraryStep?.code ?? ''}
                        onChange={(value) => {
                          if (libraryAPI.selectedLibraryStep) {
                            libraryAPI.updateLibraryStep(libraryAPI.selectedLibraryStep.id, {
                              code: value ?? '',
                            })
                          }
                        }}
                        options={{
                          minimap: { enabled: false },
                          fontSize: 13,
                          lineNumbers: 'on',
                          quickSuggestions: true,
                          scrollbar: {
                            verticalScrollbarSize: 6,
                            horizontalScrollbarSize: 6,
                          },
                          tabSize: 2,
                          wordWrap: 'on',
                        }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </Droppable>
      )}
      </div>
      <DragOverlay>
        {activeDragId ? (
          <StepItem
            step={stepsAPI.activeSteps.find((s) => s.id === activeDragId)!}
            index={-1}
            isSelected={activeDragId === stepsAPI.selectedStepId}
            dropTargetIndex={null}
            editingTitleStepId={null}
            onSelect={() => {}}
            onContextMenu={() => {}}
            onUpdateTitle={() => true}
            setEditingTitleStepId={() => {}}
            onToggleMuted={() => {}}
            onDelete={() => {}}
            style={{
              boxShadow: 'var(--sh-pop)',
              cursor: 'grabbing',
              background: 'var(--card)',
              touchAction: 'none',
            }}
          />
        ) : null}
      </DragOverlay>
      {contextMenu && (
        <div
          className="context-menu"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          <button
            type="button"
            className="context-menu-item"
            onClick={() => {
              const step = stepsAPI.activeSteps.find((s) => s.id === contextMenu.stepId)
              if (step) {
                trySaveStepToLibrary(step)
              }
              setContextMenu(null)
            }}
          >
            Save to library
          </button>
        </div>
      )}
      {saveNotice && (
        <div className="save-notice" role="status" aria-live="polite">
          {saveNotice}
        </div>
      )}
    </div>
    </DndContext>
  )
}

export default EditorPage
