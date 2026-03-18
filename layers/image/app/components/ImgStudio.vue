<script lang="ts" setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick, shallowRef, provide } from 'vue'
import { useResizeObserver, useEventListener, useElementSize, useManualRefHistory, useObjectUrl } from '@vueuse/core'
import { useInteraction } from '../composables/useInteraction'
import { useWorkerProcessor } from '../composables/useWorkerProcessor'
import { PRESET_FILTERS } from '../composables/useImageProcessor'
import type { Layer, ImageState, ChangeEvent, CropArea } from '../types/editor'

const props = defineProps<{
  src?: string | null
  maxHistory?: number
  /** Show only the upload area — no canvas or toolbar. Useful for initial upload screens. */
  uploaderOnly?: boolean
  /** Fixed Stencil mode (WhatsApp/Insta style) — panning an image behind a fixed fixedOverlayRef */
  fixedStencil?: boolean
  /** Constrains the image panning so it cannot leave the editor viewport entirely. Also binds to edges if zoomed in. */
  restrictToBounds?: boolean
  /** Absolute minimum zoom floor. If not provided, it's calculated based on stencil/viewport cover. */
  minZoom?: number
  /** If true, removes the default border and rounding from the editor container. */
  borderless?: boolean
  /** Hides the checkerboard background behind the image. */
  hideCheckerboard?: boolean
  /** Completely disables image panning. */
  disablePanning?: boolean
  // Studio Tools (New Prop-Based API)
  censor?: boolean | Record<string, unknown>
  cropper?: boolean | Record<string, unknown>
  annotate?: boolean | Record<string, unknown>
  aspect?: boolean | Record<string, unknown>
  layers?: boolean | Record<string, unknown>
  preview?: boolean | Record<string, unknown>
  transform?: boolean | Record<string, unknown>
  resize?: boolean | Record<string, unknown>
  filter?: boolean | Record<string, unknown>
}>()

const emit = defineEmits<{
  (e: 'load', payload: ImageState): void
  (e: 'change', payload: ChangeEvent): void
  (e: 'export', payload: Blob): void
}>()
const { isProcessing: isWorkerProcessing, processImage, terminate: terminateWorker } = useWorkerProcessor()

// Core state
const imageState = ref<ImageState>({
  original: null,
  current: null,
  width: 0,
  height: 0,
  format: 'image/png',
})

// History management (Professional)
const { history: _history, undo, redo, canUndo, canRedo, commit: commitToHistory, clear } = useManualRefHistory(imageState, {
  capacity: props.maxHistory || 50,
  clone: true,
})

// Active tool
const activeTool = ref<string | null>(null)

// Track whether an image is currently loaded
const hasImage = computed(() => !!imageState.value.current)
// Only true after drawImage completes — prevents white canvas flash
const canvasVisible = ref(false)
// True while an image is being fetched/decoded — suppresses the empty state during load
const isLoading = ref(!!props.src)

// Internal component state
const editorLayers = ref<Layer[]>([
  { id: 'base', name: 'Background', type: 'filter', visible: true, active: false }
])

// Canvas and image refs
const canvasRef = ref<HTMLCanvasElement | null>(null)
const imageRef = ref<HTMLImageElement | null>(null)
const overlayRef = ref<HTMLDivElement | null>(null)
const canvasPreviewStyle = ref<Record<string, string>>({})
const aspectRatio = ref<number | undefined>(undefined)

const sourceFile = shallowRef<File | null>(null)
const sourceObjectUrl = useObjectUrl(sourceFile)

const viewportRef = ref<HTMLDivElement | null>(null)
const fixedOverlayRef = ref<HTMLDivElement | null>(null)
const toolbarTargetRef = ref<HTMLDivElement | null>(null)

// Reactive viewport dimensions
const { width: vWidth, height: vHeight } = useElementSize(viewportRef)

// Zoom and Pan state
const zoomLevel = ref(1)
const minZoom = computed(() => {
  let floor = 0.1
  if (imageState.value.width && imageState.value.height) {
    // 1. Strict Stencil Mode Binding (e.g. Circular Avatar Crop Box)
    // The image must always cover the entire stencil hole.
    if (panBounds.value) {
      const { width: bw, height: bh } = panBounds.value
      const scaleW = bw / imageState.value.width
      const scaleH = bh / imageState.value.height
      floor = Math.max(scaleW, scaleH) // max ensures both sides cover
    }
    // 2. Fixed Stencil Screen Binding (e.g. WhatsApp crop style)
    // The image must always cover the entire viewport.
    else if (props.fixedStencil && viewportRef.value) {
      const scaleW = vWidth.value / imageState.value.width
      const scaleH = vHeight.value / imageState.value.height
      floor = Math.max(scaleW, scaleH)
    }
  }

  // If a manual minZoom is provided, it's the absolute minimum
  return props.minZoom !== undefined ? Math.max(floor, props.minZoom) : floor
})
const maxZoom = ref(10)
const panX = ref(0)
const panY = ref(0)
const panBounds = ref<{ top: number, left: number, width: number, height: number } | null>(null)

// Unified Bounding Math
const clampPanValues = (targetX: number, targetY: number, currentScale: number) => {
  let boundedX = targetX
  let boundedY = targetY

  // 1. Strict Stencil Mode Binding (e.g. Circular Avatar Crop Box)
  if (panBounds.value) {
    const { left: bl, top: bt, width: bw, height: bh } = panBounds.value
    const imgW = imageState.value.width * currentScale
    const imgH = imageState.value.height * currentScale

    boundedX = Math.max(bl + bw - imgW, Math.min(boundedX, bl))
    boundedY = Math.max(bt + bh - imgH, Math.min(boundedY, bt))
  }
  // 2. Fixed Stencil Screen Binding (e.g. WhatsApp crop style)
  else if (props.fixedStencil && viewportRef.value) {
    const imgW = imageState.value.width * currentScale
    const imgH = imageState.value.height * currentScale

    boundedX = imgW < vWidth.value
      ? Math.max(0, Math.min(boundedX, vWidth.value - imgW))
      : Math.max(vWidth.value - imgW, Math.min(boundedX, 0))

    boundedY = imgH < vHeight.value
      ? Math.max(0, Math.min(boundedY, vHeight.value - imgH))
      : Math.max(vHeight.value - imgH, Math.min(boundedY, 0))
  }
  // 3. Optional Bounding to the Viewport Edges (restrictToBounds prop)
  else if (props.restrictToBounds && viewportRef.value) {
    const imgW = imageState.value.width * currentScale
    const imgH = imageState.value.height * currentScale

    // In normal mode, transform-origin is center-center.
    // This means panning (0,0) actually puts the *center* of the image in the *center* of the flex viewport.
    // The top-left corner of the image is at: viewportCenter - (imageOriginalDimensions / 2) + panX

    // Max allowable pan: The image edge should not cross the viewport edge, creating empty space.
    // If the image is currently wider than the screen:
    if (imgW > vWidth.value) {
      // Image is wider than screen: Image edges cannot cross inside the screen edges.
      // So max pan is simply the dimension difference / 2
      const maxPanX = (imgW - vWidth.value) / 2
      boundedX = Math.max(-maxPanX, Math.min(boundedX, maxPanX))
    }
    else {
      // Image is narrower than screen: Image cannot cross outside the screen edges.
      // It can float freely within the empty space.
      const maxPanX = (vWidth.value - imgW) / 2
      boundedX = Math.max(-maxPanX, Math.min(boundedX, maxPanX))
    }

    if (imgH > vHeight.value) {
      // Same logic for height
      const maxPanY = (imgH - vHeight.value) / 2
      boundedY = Math.max(-maxPanY, Math.min(boundedY, maxPanY))
    }
    else {
      const maxPanY = (vHeight.value - imgH) / 2
      boundedY = Math.max(-maxPanY, Math.min(boundedY, maxPanY))
    }
  }

  return { x: boundedX, y: boundedY }
}

const getCurrentCoordinates = (): CropArea | null => {
  if (panBounds.value) {
    const { left: bl, top: bt, width: bw, height: bh } = panBounds.value
    return {
      x: (bl - panX.value) / zoomLevel.value,
      y: (bt - panY.value) / zoomLevel.value,
      width: bw / zoomLevel.value,
      height: bh / zoomLevel.value,
    }
  }
  return null
}

// RAF throttle for pan — mousemove can fire 200+ times/sec, we only need 60fps
let _pendingPan: { x: number, y: number } | null = null
let _panRafId: number | null = null

const flushPan = () => {
  _panRafId = null
  if (_pendingPan) {
    panX.value = _pendingPan.x
    panY.value = _pendingPan.y
    _pendingPan = null
  }
}

// Unify interaction logic using VueUse-enabled composable
const { isInteracting: isDragging, startInteraction } = useInteraction(
  computed(() => 1), // Pan is in screen coordinates, so dx/dy should not be scaled
  (dx, dy) => {
    const targetX = initialPanX.value + dx
    const targetY = initialPanY.value + dy
    const clamped = clampPanValues(targetX, targetY, zoomLevel.value)

    // Buffer the position — commit it on the next animation frame
    _pendingPan = clamped
    if (_panRafId === null) {
      _panRafId = requestAnimationFrame(flushPan)
    }
  }
)

const initialPanX = ref(0)
const initialPanY = ref(0)

// Watch for minZoom changes and clamp zoomLevel
watch(minZoom, newMin => {
  if (zoomLevel.value < newMin) {
    zoomLevel.value = newMin
  }
})

// Load image
const loadImage = async (src: string, skipCommit = false, skipFit = false) => {
  if (typeof window === 'undefined') return Promise.resolve()
  isLoading.value = true
  console.log('ImgStudio: Loading image', { src: src.substring(0, 50) + '...' })

  return new Promise<void>((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'

    img.onload = async () => {
      // 1. Update state — this causes Vue to mount the full editor and canvas
      imageState.value = {
        original: imageState.value.original ?? src,
        current: src,
        width: img.naturalWidth,
        height: img.naturalHeight,
        format: 'image/png',
      }
      imageRef.value = img

      // 2. Wait for Vue to finish rendering (canvas element must be in DOM)
      await nextTick()

      // 3. Draw image to canvas — canvas is guaranteed to be mounted now
      if (canvasRef.value) {
        canvasRef.value.width = img.naturalWidth
        canvasRef.value.height = img.naturalHeight
        const ctx = canvasRef.value.getContext('2d')
        if (ctx) ctx.drawImage(img, 0, 0)
      }

      // 4. Only NOW reveal the canvas — image is already painted
      canvasVisible.value = true
      isLoading.value = false

      await nextTick()
      if (!skipFit) {
        console.log('ImgStudio: Initial fitToScreen')
        fitToScreen()
        requestAnimationFrame(fitToScreen)
      }

      // Capture state for undo/redo
      if (!skipCommit) commitToHistory()
      emit('load', imageState.value)
      resolve()
    }

    img.onerror = () => reject(new Error('Failed to load image'))
    img.src = src
  })
}

const onFileChange = (payload: Event | FileList | File[] | File | unknown) => {
  let file: File | undefined

  if (!payload) return

  // Nuxt UI 4: UFileUpload might emit a FileList or array of Files
  if (payload instanceof FileList || Array.isArray(payload)) {
    file = payload[0]
  }
  // Native input event
  else if (payload instanceof Event && payload.target && (payload.target as HTMLInputElement).files) {
    file = (payload.target as HTMLInputElement).files?.[0]
  }
  // In case the payload is a single file object
  else if (payload instanceof File) {
    file = payload
  }
  // If payload is an Event but target is null or string, try dataTransfer
  else if (payload instanceof DragEvent && payload.dataTransfer && payload.dataTransfer.files) {
    file = payload.dataTransfer.files[0]
  }

  if (file && file.type.startsWith('image/')) {
    sourceFile.value = file
  }
}

watch(sourceObjectUrl, url => {
  if (url) {
    loadImage(url)
  }
})

const notifyChange = () => {
  const coordinates = getCurrentCoordinates()

  // Optimization: If an image is loaded but coordinates are null, it usually means
  // the stencil hasn't calculated its bounds yet (initial mount). We skip this
  // tick to avoid double-emitting with a null state.
  if (hasImage.value && !coordinates && props.fixedStencil) return

  emit('change', {
    coordinates,
    canvas: canvasRef.value,
    imageState: imageState.value,
  })
}

// RAF-throttle the change notification — don't emit on every reactive flush during drag
let _notifyRafId: number | null = null
watch([zoomLevel, panX, panY], () => {
  if (!hasImage.value) return
  if (_notifyRafId !== null) return // already queued
  _notifyRafId = requestAnimationFrame(() => {
    _notifyRafId = null
    notifyChange()
  })
})

// Support triggering uploads from external components (like ImgUpload)
const hiddenInputRef = ref<HTMLInputElement | null>(null)
const triggerFileInput = () => {
  hiddenInputRef.value?.click()
}

// Undo/Redo are provided directly by useManualRefHistory
const handleUndo = async () => {
  if (!canUndo.value) return
  undo()
  if (imageState.value.current) await loadImage(imageState.value.current, true, true)
}

const handleRedo = async () => {
  if (!canRedo.value) return
  redo()
  if (imageState.value.current) await loadImage(imageState.value.current, true, true)
}

const resetAll = async () => {
  if (!imageState.value.original) return
  clear() // Reset history

  // Reset transient states
  activeTool.value = null
  aspectRatio.value = undefined
  canvasPreviewStyle.value = {}
  editorLayers.value = editorLayers.value.filter(l => l.id === 'base')

  await loadImage(imageState.value.original)
}

// canUndo/canRedo are provided by useManualRefHistory

// Tool activation
const activateTool = (tool: string) => { activeTool.value = tool }

/** Runs all registered apply hooks (e.g. committing stencils, annotations) */
const runApplyHooks = async () => {
  // Capture current hooks and clear the list to prevent re-entrancy loops
  const hooks = [...applyHooks.value]
  applyHooks.value = []
  for (const hook of hooks) {
    await hook()
  }
}

const cancelTool = () => {
  applyHooks.value = []
  activeTool.value = null
}

const deactivateTool = async () => {
  await runApplyHooks()
  activeTool.value = null
}

// Zoom controls
const zoomIn = () => { zoomLevel.value = Math.min(zoomLevel.value + 0.1, maxZoom.value) }
const zoomOut = () => { zoomLevel.value = Math.max(zoomLevel.value - 0.1, minZoom.value) }
const zoomTo = (level: number) => {
  // Cache current center if necessary, but here we just clamp
  zoomLevel.value = Math.max(minZoom.value, Math.min(level, maxZoom.value))
}
const resetZoom = () => fitToScreen()

// Export
const exportImage = async (format: 'image/png' | 'image/jpeg' | 'image/webp' = 'image/png', quality = 0.92): Promise<Blob | null> => {
  if (!canvasRef.value) return null
  return new Promise(resolve => {
    canvasRef.value?.toBlob(blob => {
      if (blob) emit('export', blob)
      resolve(blob)
    }, format, quality)
  })
}

// Apply hook registry (for stencils/tools to register their apply logic)
const applyHooks = ref<(() => void | Promise<void>)[]>([])
const registerApplyHook = (fn: () => void | Promise<void>) => {
  if (!applyHooks.value.includes(fn)) applyHooks.value.push(fn)
}
const unregisterApplyHook = (fn: () => void | Promise<void>) => {
  applyHooks.value = applyHooks.value.filter(f => f !== fn)
}

const applyAndExport = async (filename = 'export.png') => {
  // Execute all registered apply hooks
  await runApplyHooks()
  await nextTick()

  const blob = await exportImage()
  if (blob) {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }
}

const getCanvas = () => canvasRef.value
const getImageState = () => imageState.value

// Update canvas when image changes
const updateCanvas = (imageData: string | HTMLCanvasElement, skipDataUrl = false) => {
  if (typeof window === 'undefined' || !canvasRef.value) return
  const ctx = canvasRef.value.getContext('2d')
  if (!ctx) return

  if (typeof imageData === 'string') {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      if (canvasRef.value) {
        canvasRef.value.width = img.naturalWidth
        canvasRef.value.height = img.naturalHeight
        ctx.clearRect(0, 0, canvasRef.value.width, canvasRef.value.height)
        ctx.drawImage(img, 0, 0)
        imageState.value.height = img.naturalHeight
        imageState.value.current = imageData
        notifyChange()
      }
    }
    img.src = imageData
  }
  else {
    // Prevent self-drawing loop if imageData is the same as canvasRef
    if (imageData === canvasRef.value) {
      if (!skipDataUrl) {
        setTimeout(() => {
          if (!canvasRef.value) return
          const newImageState = canvasRef.value.toDataURL(imageState.value.format)
          imageState.value.current = newImageState
          notifyChange()
        }, 0)
      }
      return
    }

    canvasRef.value.width = imageData.width
    canvasRef.value.height = imageData.height
    imageState.value.width = imageData.width
    imageState.value.height = imageData.height
    ctx.clearRect(0, 0, canvasRef.value.width, canvasRef.value.height)
    ctx.drawImage(imageData, 0, 0)

    if (!skipDataUrl) {
      setTimeout(() => {
        if (!canvasRef.value) return
        const newImageState = canvasRef.value.toDataURL(imageState.value.format)
        imageState.value.current = newImageState
        notifyChange()
      }, 0)
    }
  }
}

// Commit changes
// Commit changes from tools (stencils, filters)
const commit = (imageData: string | HTMLCanvasElement, _tool: string) => {
  if (typeof imageData === 'string') {
    updateCanvas(imageData)
    nextTick(() => commitToHistory())
  }
  else {
    updateCanvas(imageData, true)
    setTimeout(() => {
      if (!canvasRef.value) return
      const historyData = canvasRef.value.toDataURL(imageState.value.format)
      imageState.value.current = historyData
      notifyChange()
      commitToHistory()
    }, 10)
  }
}

const fitToScreen = () => {
  if (!viewportRef.value || !imageState.value.width) return
  const vW = vWidth.value
  const vH = vHeight.value
  // If the browser hasn't computed flex layout yet, bail — rAF will retry
  if (vW === 0 || vH === 0) return

  // In fixedStencil mode, we don't need padding for tools/canvas border space
  const padding = props.fixedStencil ? 0 : 40

  const scaleW = (vW - padding) / imageState.value.width
  const scaleH = (vH - padding) / imageState.value.height

  if (props.fixedStencil) {
    // In fixedStencil mode, we ALWAYS "cover" the entire viewport.
    // This prevents the constraints from snapping the image to a side.
    const vScale = Math.max(scaleW, scaleH, minZoom.value) + 0.005
    zoomLevel.value = vScale

    panX.value = (vW - imageState.value.width * vScale) / 2
    panY.value = (vH - imageState.value.height * vScale) / 2
  }
  else {
    zoomLevel.value = Math.min(scaleW, scaleH)
    // In normal mode, we use flex centering, so pan starts at 0,0
    panX.value = 0
    panY.value = 0
  }
}

// Pan Gestures
const onDragStart = (e: MouseEvent | TouchEvent) => {
  if (!hasImage.value || props.disablePanning) return
  initialPanX.value = panX.value
  initialPanY.value = panY.value
  startInteraction(e, 'pan', {})
}

// Ensure image stays within bounds when zoom or mask changes
const clampPan = () => {
  const clamped = clampPanValues(panX.value, panY.value, zoomLevel.value)
  panX.value = clamped.x
  panY.value = clamped.y
}

watch([zoomLevel, panBounds], clampPan)

useEventListener(window, 'resize', fitToScreen)

// Mouse wheel zoom
useEventListener(viewportRef, 'wheel', (e: WheelEvent) => {
  if (!hasImage.value || !viewportRef.value) return
  e.preventDefault()

  const rect = viewportRef.value.getBoundingClientRect()

  // 1. Where is the mouse currently relative to the viewport?
  const pointerX = e.clientX - rect.left
  const pointerY = e.clientY - rect.top

  // 2. Where is that point on the original unscaled image?
  // Since transformOrigin is 'center center' in normal mode, the math is slightly different than '0 0'
  // But our translation (panX, panY) acts as the offset for the top-left corner in both modes.
  const oldScale = zoomLevel.value
  const imgX = (pointerX - panX.value) / oldScale
  const imgY = (pointerY - panY.value) / oldScale

  // 3. Calculate new scale (Logarithmic/Multiplicative for smoothness)
  // Use a smaller factor (1.05) for smoother, less "fast" zooming
  const factor = e.deltaY > 0 ? 0.95 : 1.05
  const newScale = Math.max(minZoom.value, Math.min(oldScale * factor, maxZoom.value))

  zoomLevel.value = newScale

  // 4. Adjust Pan so the image point stays under the mouse pointer
  const targetPanX = pointerX - imgX * newScale
  const targetPanY = pointerY - imgY * newScale

  // 5. Instantly clamp the new zoomed pan translation so it never tears through bounds
  const clamped = clampPanValues(targetPanX, targetPanY, newScale)
  panX.value = clamped.x
  panY.value = clamped.y
}, { passive: false })

// Pinch Zoom Support
let pinchStartDistance = 0
let pinchStartScale = 1

const handleTouchStart = (e: TouchEvent) => {
  if (e.touches.length !== 2) return
  const touch1 = e.touches[0]
  const touch2 = e.touches[1]
  if (!touch1 || !touch2) return

  pinchStartDistance = Math.hypot(
    touch2.clientX - touch1.clientX,
    touch2.clientY - touch1.clientY
  )
  pinchStartScale = zoomLevel.value
}

const handleTouchMove = (e: TouchEvent) => {
  if (e.touches.length !== 2 || pinchStartDistance === 0 || !viewportRef.value) return
  e.preventDefault()

  const touch1 = e.touches[0]
  const touch2 = e.touches[1]
  if (!touch1 || !touch2) return

  const currentDistance = Math.hypot(
    touch2.clientX - touch1.clientX,
    touch2.clientY - touch1.clientY
  )

  const rect = viewportRef.value.getBoundingClientRect()
  const centerX = (touch1.clientX + touch2.clientX) / 2 - rect.left
  const centerY = (touch1.clientY + touch2.clientY) / 2 - rect.top

  const scaleChange = currentDistance / pinchStartDistance
  const oldScale = zoomLevel.value
  const newScale = Math.max(minZoom.value, Math.min(pinchStartScale * scaleChange, maxZoom.value))

  if (newScale === oldScale) return

  // Zoom relative to pinch center
  const imgX = (centerX - panX.value) / oldScale
  const imgY = (centerY - panY.value) / oldScale

  zoomLevel.value = newScale

  const targetPanX = centerX - imgX * newScale
  const targetPanY = centerY - imgY * newScale

  const clamped = clampPanValues(targetPanX, targetPanY, newScale)
  panX.value = clamped.x
  panY.value = clamped.y
}

useEventListener(viewportRef, 'touchstart', handleTouchStart, { passive: true })
useEventListener(viewportRef, 'touchmove', handleTouchMove, { passive: false })

// Auto-track layout changes using VueUse
useResizeObserver(viewportRef, () => {
  fitToScreen()
})

// Keyboard shortcuts implementation
const handleKeyShortcuts = (e: KeyboardEvent) => {
  const isMod = e.ctrlKey || e.metaKey
  const isShift = e.shiftKey
  const isAlt = e.altKey

  // Don't trigger shortcuts if user is typing in an input
  const target = e.target as HTMLElement
  if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.tagName === 'SELECT') {
    return
  }

  // Panning with arrow keys
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
    e.preventDefault()
    const step = isShift ? 50 : 10
    let dx = 0
    let dy = 0

    if (e.key === 'ArrowUp') dy = -step
    if (e.key === 'ArrowDown') dy = step
    if (e.key === 'ArrowLeft') dx = -step
    if (e.key === 'ArrowRight') dx = step

    const targetX = panX.value + dx
    const targetY = panY.value + dy
    const clamped = clampPanValues(targetX, targetY, zoomLevel.value)
    panX.value = clamped.x
    panY.value = clamped.y
    return
  }

  // Zooming: + / =
  if (e.key === '+' || e.key === '=') {
    e.preventDefault()
    zoomIn()
    return
  }

  // Zooming: - / _
  if (e.key === '-' || e.key === '_') {
    e.preventDefault()
    zoomOut()
    return
  }

  // Reset Zoom: 0
  if (e.key === '0') {
    e.preventDefault()
    fitToScreen()
    return
  }

  // Escape: Deactivate active tool
  if (e.key === 'Escape') {
    if (activeTool.value) {
      e.preventDefault()
      deactivateTool()
      return
    }
  }

  // Mod shortcuts
  if (isMod) {
    // Save/Export: Ctrl+S
    if (e.key === 's' || e.key === 'S') {
      e.preventDefault()
      applyAndExport()
      return
    }

    // Undo: Ctrl+Z
    if ((e.key === 'z' || e.key === 'Z') && !isShift) {
      e.preventDefault()
      handleUndo()
      return
    }

    // Redo: Ctrl+Y or Ctrl+Shift+Z
    if (e.key === 'y' || e.key === 'Y' || ((e.key === 'z' || e.key === 'Z') && isShift)) {
      e.preventDefault()
      handleRedo()
      return
    }

    // Reset All: Ctrl+Alt+R
    if (isAlt && (e.key === 'r' || e.key === 'R')) {
      e.preventDefault()
      resetAll()
      return
    }
  }
}

useEventListener(window, 'keydown', handleKeyShortcuts)

onMounted(() => {
  // Initial call in case image was already loaded
  if (hasImage.value) {
    fitToScreen()
  }
})

onUnmounted(() => {
  // Logic cleanup handled by VueUse composables
  terminateWorker()
})

const editorAPI = {
  imageState,
  canvasRef,
  imageRef,
  activeTool,
  zoomLevel,
  panX,
  panY,
  fixedOverlayRef,
  fixedStencil: computed(() => props.fixedStencil),
  loadImage,
  updateCanvas,
  activateTool,
  deactivateTool,
  cancelTool,
  getCanvas,
  getImageState,
  commit,
  overlayRef,
  layers: editorLayers,
  canvasPreviewStyle,
  aspectRatio,
  onFileChange,
  registerApplyHook,
  unregisterApplyHook,
  applyAndExport,
  panBounds,
  toolbarTargetRef,
  undo: handleUndo,
  redo: handleRedo,
  canUndo,
  canRedo,
  resetAll,
  zoomIn,
  zoomOut,
  resetZoom,
  zoomTo,
  minZoom,
  maxZoom,
  triggerFileInput,
  getCurrentCoordinates,
  hasImage,
  isWorkerProcessing,
  processImage,
}

// Provide context to child tools
provide('imgStudio', editorAPI)

watch(panBounds, (newBounds, oldBounds) => {
  if (newBounds && !oldBounds && props.fixedStencil) {
    // When bounds are first established (e.g. stencil mount), re-fit
    fitToScreen()
  }
})

// Watch for src prop changes
watch(() => props.src, async newSrc => {
  if (newSrc && typeof window !== 'undefined') {
    await loadImage(newSrc)
    // fitToScreen is called inside loadImage and also by ResizeObserver/onMounted
  }
}, { immediate: true })

// Expose public API
defineExpose({
  // State
  imageState,
  canvasRef,
  imageRef,
  activeTool,
  zoomLevel,
  panX,
  panY,
  fixedOverlayRef,
  fixedStencil: computed(() => props.fixedStencil),
  overlayRef,
  layers: editorLayers,
  canvasPreviewStyle,
  aspectRatio,
  panBounds,
  hasImage,
  isWorkerProcessing,
  toolbarTargetRef,

  // Methods
  loadImage,
  updateCanvas,
  activateTool,
  deactivateTool,
  cancelTool,
  getCanvas,
  getImageState,
  commit,
  onFileChange,
  registerApplyHook,
  unregisterApplyHook,
  applyAndExport,
  undo: handleUndo,
  redo: handleRedo,
  canUndo,
  canRedo,
  resetAll,
  zoomIn,
  zoomOut,
  zoomTo,
  resetZoom,
  processImage,
  triggerFileInput,
  getCurrentCoordinates,
})
</script>

<template>
  <!-- Hidden global file input for remote triggering -->
  <input
    ref="hiddenInputRef"
    type="file"
    accept="image/*"
    class="hidden"
    @change="onFileChange">

  <!-- Uploader-only mode: no canvas, just upload UI (e.g. upload a profile picture) -->
  <div
    v-if="props.uploaderOnly && !hasImage"
    class="flex flex-col items-center justify-center w-full h-full min-h-64 bg-inverted rounded-xl border border-inverted/5 p-8">
    <UFileUpload
      variant="area"
      accept="image/*"
      label="Upload Image"
      description="Click to select or drag and drop an image here"
      @update:model-value="onFileChange" />
    <slot :editor="editorAPI" />
  </div>

  <!-- Full editor mode -->
  <div
    v-else
    class="flex flex-col w-full h-full bg-elevated overflow-hidden"
    :class="{
      'border border-default rounded-xl': !props.borderless,
    }">
    <!-- Header Area -->
    <div ref="toolbarTargetRef">
      <slot name="header" :editor="editorAPI" />
    </div>

    <div class="flex-1 flex overflow-hidden relative max-lg:flex-col">
      <!-- Canvas / Viewport Area -->
      <div
        ref="viewportRef"
        class="flex-1 overflow-hidden relative will-change-scroll"
        :class="{
          'flex items-center justify-center': !props.fixedStencil,
          'bg-inverted': !props.fixedStencil && !props.hideCheckerboard,
          'bg-default': !props.fixedStencil && props.hideCheckerboard,
          'bg-black/95': props.fixedStencil,
          'cursor-grab': hasImage && !props.disablePanning,
          'cursor-grabbing': isDragging && !props.disablePanning,
          'cursor-default': hasImage && props.disablePanning,
        }"
        :style="(!props.fixedStencil && !props.hideCheckerboard) ? {
          backgroundImage: 'linear-gradient(45deg, #151515 25%, transparent 25%), linear-gradient(-45deg, #151515 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #151515 75%), linear-gradient(-45deg, transparent 75%, #151515 75%)',
          backgroundSize: '20px 20px',
          backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
        } : {}"
        @mousedown="onDragStart"
        @touchstart="onDragStart">
        <!-- Fixed Stencil Overlay (Target for Stencils that stay static in center) -->
        <div
          v-if="props.fixedStencil"
          ref="fixedOverlayRef"
          class="absolute inset-0 z-30 pointer-events-none w-full h-full" />
        <!-- Empty state: using Nuxt UI UFileUpload with area variant -->
        <div
          v-if="!canvasVisible && !isLoading"
          class="absolute inset-0 flex flex-col items-center justify-center z-10 p-12">
          <UFileUpload
            variant="area"
            accept="image/*"
            size="lg"
            label="Get Started"
            description="Drag and drop or click to upload your image"
            @update:model-value="onFileChange" />
        </div>

        <!-- Canvas wrapper:
             fixedStencil — absolute at top-left, single combined translate+scale transform.
                         translate(panX, panY) puts the top-left corner at the correct pan position;
                         scale(zoom) then grows/shrinks the image from that origin.
             normal   — flex m-auto centering with translate+scale; zoom controlled by outer fitToScreen -->
        <div
          class="will-change-transform shrink-0"
          :class="{
            'opacity-0 pointer-events-none': !canvasVisible,
            'absolute top-0 left-0': props.fixedStencil,
            'relative': !props.fixedStencil,
          }"
          :style="{
            width: imageState.width + 'px',
            height: imageState.height + 'px',
            transformOrigin: props.fixedStencil ? '0 0' : 'center center',
            transform: `translate3d(${panX}px, ${panY}px, 0) scale(${zoomLevel})`,
          }">
          <canvas
            ref="canvasRef"
            class="block w-full h-full shadow-2xl bg-default"
            :style="canvasPreviewStyle" />
          <!-- Overlay for tools (like crop handles - traditional mode) -->
          <div ref="overlayRef" class="absolute inset-0 w-full h-full pointer-events-none z-10">
            <slot :editor="editorAPI" name="overlay" />
          </div>
        </div>
      </div>
      <!-- Ghost Slot: Always render the default slot in a hidden container
           whenever the primary slot container (the sidebar) is hidden.
           Using visibility: hidden instead of display: none ensures that
           children (like stencils) get correct layout dimensions for math. -->
      <div v-if="props.fixedStencil || !hasImage" class="invisible absolute -z-10 pointer-events-none">
        <slot :editor="editorAPI" />
      </div>

      <!-- Tools Sidebar — only in normal (non-fixedStencil) editor -->
      <aside
        v-else-if="hasImage"
        class="w-80 bg-elevated/80 backdrop-blur-md border-l border-muted flex flex-col z-10 transition-all duration-300 ease-in-out max-lg:w-full max-lg:h-87.5 max-lg:border-l-0 max-lg:border-t">
        <div class="flex-1 overflow-y-auto p-6 flex flex-col gap-6 scrollbar-thin scrollbar-thumb-accented scrollbar-track-transparent">
          <!-- Prop-Based Tools -->
          <TransitionGroup
            tag="div"
            class="space-y-6"
            enter-active-class="transition-all duration-500 ease-out"
            enter-from-class="opacity-0 translate-x-4 blur-sm"
            leave-active-class="transition-all duration-300 ease-in absolute"
            leave-to-class="opacity-0 -translate-x-4 blur-sm"
            move-class="transition-all duration-400 ease-in-out">
            <UCard v-if="props.preview" key="preview" class="bg-white/70 dark:bg-slate-900/70 backdrop-blur-lg border-white/30 dark:border-white/10 shadow-md" :ui="{ body: 'p-3' }">
              <ImgPreview v-bind="typeof props.preview === 'object' ? props.preview : {}" />
            </UCard>

            <UCard v-if="props.layers" key="layers" class="bg-white/70 dark:bg-slate-900/70 backdrop-blur-lg border-white/30 dark:border-white/10 shadow-md" :ui="{ body: 'p-3' }">
              <ImgLayerManager v-bind="typeof props.layers === 'object' ? props.layers : {}" />
            </UCard>

            <ImgAnnotate v-if="props.annotate" key="annotate" v-bind="typeof props.annotate === 'object' ? props.annotate : {}" />

            <ImgAspectPresets v-if="props.aspect" key="aspect" v-bind="typeof props.aspect === 'object' ? props.aspect : {}" />

            <ImgCensor v-if="props.censor" key="censor" v-bind="typeof props.censor === 'object' ? props.censor : {}" />

            <!-- Cropper Logic -->
            <div v-if="props.cropper" key="cropper" class="space-y-4">
              <div class="flex items-center justify-between px-1">
                <h3 class="text-[10px] font-bold uppercase tracking-widest text-muted">
                  Crop & Aspect
                </h3>
                <UBadge v-if="['stencil-rect', 'stencil-circle'].includes(activeTool || '')" color="primary" size="xs" variant="subtle" class="animate-pulse">
                  Active
                </UBadge>
              </div>

              <div class="grid grid-cols-2 gap-2">
                <UButton
                  :color="activeTool === 'stencil-rect' ? 'primary' : 'neutral'"
                  variant="subtle"
                  icon="i-lucide-square"
                  label="Square"
                  class="h-10"
                  @click="() => activateTool('stencil-rect')" />
                <UButton
                  :color="activeTool === 'stencil-circle' ? 'primary' : 'neutral'"
                  variant="subtle"
                  icon="i-lucide-circle"
                  label="Circle"
                  class="h-10"
                  @click="() => activateTool('stencil-circle')" />
              </div>

              <UButton
                v-if="['stencil-rect', 'stencil-circle'].includes(activeTool || '')"
                label="Apply Crop"
                icon="i-lucide-check"
                color="primary"
                block
                size="lg"
                class="shadow-lg shadow-primary-500/20"
                @click="() => deactivateTool()" />

              <RectangleStencil v-if="activeTool === 'stencil-rect'" key="stencil-rect" v-bind="typeof props.cropper === 'object' ? props.cropper : {}" />
              <CircleStencil v-if="activeTool === 'stencil-circle'" key="stencil-circle" v-bind="typeof props.cropper === 'object' ? props.cropper : {}" />
            </div>

            <ImgTransform v-if="props.transform" key="transform" v-bind="typeof props.transform === 'object' ? props.transform : {}" v-slot="{ rotate, flipHorizontal, flipVertical, currentTransform }">
              <div class="space-y-2">
                <h3 class="text-[10px] font-bold uppercase tracking-widest text-muted px-1">
                  Transform
                </h3>
                <div class="grid grid-cols-4 gap-2">
                  <UButton icon="i-lucide-rotate-ccw" color="neutral" variant="subtle" title="Rotate -90" @click="rotate(-90)" />
                  <UButton icon="i-lucide-rotate-cw" color="neutral" variant="subtle" title="Rotate +90" @click="rotate(90)" />
                  <UButton icon="i-lucide-flip-horizontal" :color="currentTransform.flipHorizontal ? 'primary' : 'neutral'" variant="subtle" title="Flip X" @click="flipHorizontal" />
                  <UButton icon="i-lucide-flip-vertical" :color="currentTransform.flipVertical ? 'primary' : 'neutral'" variant="subtle" title="Flip Y" @click="flipVertical" />
                </div>
              </div>
            </ImgTransform>

            <ImgResize v-if="props.resize" key="resize" v-bind="typeof props.resize === 'object' ? props.resize : {}" v-slot="{ applyResize }">
              <div class="space-y-2">
                <h3 class="text-[10px] font-bold uppercase tracking-widest text-muted px-1">
                  Quick Sizes
                </h3>
                <div class="grid grid-cols-3 gap-1">
                  <UButton label="SD" size="xs" color="neutral" variant="subtle" @click="applyResize(800, 600)" />
                  <UButton label="HD" size="xs" color="neutral" variant="subtle" @click="applyResize(1280, 720)" />
                  <UButton label="FHD" size="xs" color="neutral" variant="subtle" @click="applyResize(1920, 1080)" />
                </div>
              </div>
            </ImgResize>

            <ImgFilter v-if="props.filter" key="filter" v-bind="typeof props.filter === 'object' ? props.filter : {}" v-slot="{ applyFilter, currentFilters, resetFilters }">
              <div class="space-y-4 pt-2">
                <div class="flex items-center justify-between px-1">
                  <h3 class="text-[10px] font-bold uppercase tracking-widest text-muted">
                    Filters & Effects
                  </h3>
                  <UButton
                    label="Reset Filters"
                    variant="subtle"
                    color="error"
                    size="xs"
                    icon="i-lucide-rotate-ccw"
                    @click="resetFilters" />
                </div>

                <!-- Presets Gallery -->
                <div class="flex gap-2 overflow-x-auto pb-2 scrollbar-hide px-1">
                  <UButton
                    v-for="preset in PRESET_FILTERS"
                    :key="preset.id"
                    :icon="preset.id === 'none' ? 'i-lucide-image' : 'i-lucide-sparkles'"
                    :label="preset.label"
                    :variant="currentFilters.lastPreset === preset.id ? 'solid' : 'subtle'"
                    :color="currentFilters.lastPreset === preset.id ? 'primary' : 'neutral'"
                    @click="preset.id === 'none' ? (resetFilters(), currentFilters.lastPreset = 'none') : (applyFilter(preset.preset), currentFilters.lastPreset = preset.id)" />
                </div>

                <UAccordion
                  multiple
                  :items="[
                    { label: 'Basic', icon: 'i-lucide-sliders', slot: 'basic', defaultOpen: true },
                    { label: 'Color', icon: 'i-lucide-palette', slot: 'color' },
                    { label: 'Light', icon: 'i-lucide-sun', slot: 'light' },
                    { label: 'Detail', icon: 'i-lucide-zap', slot: 'detail' },
                  ]"
                  :ui="{
                    trigger: 'px-3 py-2 text-[10px] font-bold uppercase tracking-widest',
                  }">
                  <template #basic>
                    <div class="p-3 space-y-4">
                      <div>
                        <div class="flex justify-between text-[10px] text-muted mb-2 uppercase font-medium">
                          <span>Brightness</span>
                          <span class="text-primary-500">{{ currentFilters.brightness }}%</span>
                        </div>
                        <USlider v-model="currentFilters.brightness" :min="0" :max="200" size="sm" @update:model-value="applyFilter({ brightness: $event })" />
                      </div>
                      <div>
                        <div class="flex justify-between text-[10px] text-muted mb-2 uppercase font-medium">
                          <span>Contrast</span>
                          <span class="text-primary-500">{{ currentFilters.contrast }}%</span>
                        </div>
                        <USlider v-model="currentFilters.contrast" :min="0" :max="200" size="sm" @update:model-value="applyFilter({ contrast: $event })" />
                      </div>
                      <div>
                        <div class="flex justify-between text-[10px] text-muted mb-2 uppercase font-medium">
                          <span>Saturation</span>
                          <span class="text-primary-500">{{ currentFilters.saturate }}%</span>
                        </div>
                        <USlider v-model="currentFilters.saturate" :min="0" :max="200" size="sm" @update:model-value="applyFilter({ saturate: $event })" />
                      </div>
                    </div>
                  </template>
                  <template #color>
                    <div class="p-3 space-y-4">
                      <div>
                        <div class="flex justify-between text-[10px] text-muted mb-2 uppercase font-medium">
                          <span>Temperature</span>
                          <span class="text-primary-500">{{ (currentFilters.temperature || 0) > 0 ? 'Warm' : 'Cool' }} ({{ currentFilters.temperature }})</span>
                        </div>
                        <USlider v-model="currentFilters.temperature" :min="-100" :max="100" size="sm" @update:model-value="applyFilter({ temperature: $event })" />
                      </div>
                      <div>
                        <div class="flex justify-between text-[10px] text-muted mb-2 uppercase font-medium">
                          <span>Tint</span>
                          <span class="text-primary-500">{{ currentFilters.tint }}</span>
                        </div>
                        <USlider v-model="currentFilters.tint" :min="-100" :max="100" size="sm" @update:model-value="applyFilter({ tint: $event })" />
                      </div>
                      <div>
                        <div class="flex justify-between text-[10px] text-muted mb-2 uppercase font-medium">
                          <span>Vibrance</span>
                          <span class="text-primary-500">{{ currentFilters.vibrance }}</span>
                        </div>
                        <USlider v-model="currentFilters.vibrance" :min="-100" :max="100" size="sm" @update:model-value="applyFilter({ vibrance: $event })" />
                      </div>
                      <div>
                        <div class="flex justify-between text-[10px] text-muted mb-2 uppercase font-medium">
                          <span>Hue Rotate</span>
                          <span class="text-primary-500">{{ currentFilters.hueRotate }}°</span>
                        </div>
                        <USlider v-model="currentFilters.hueRotate" :min="0" :max="360" size="sm" @update:model-value="applyFilter({ hueRotate: $event })" />
                      </div>
                    </div>
                  </template>

                  <template #light>
                    <div class="p-3 space-y-4">
                      <div>
                        <div class="flex justify-between text-[10px] text-muted mb-2 uppercase font-medium">
                          <span>Exposure</span>
                          <span class="text-primary-500">{{ currentFilters.exposure }}</span>
                        </div>
                        <USlider v-model="currentFilters.exposure" :min="-100" :max="100" size="sm" @update:model-value="applyFilter({ exposure: $event })" />
                      </div>
                      <div>
                        <div class="flex justify-between text-[10px] text-muted mb-2 uppercase font-medium">
                          <span>Highlights</span>
                          <span class="text-primary-500">{{ currentFilters.highlights }}</span>
                        </div>
                        <USlider v-model="currentFilters.highlights" :min="-100" :max="100" size="sm" @update:model-value="applyFilter({ highlights: $event })" />
                      </div>
                      <div>
                        <div class="flex justify-between text-[10px] text-muted mb-2 uppercase font-medium">
                          <span>Shadows</span>
                          <span class="text-primary-500">{{ currentFilters.shadows }}</span>
                        </div>
                        <USlider v-model="currentFilters.shadows" :min="-100" :max="100" size="sm" @update:model-value="applyFilter({ shadows: $event })" />
                      </div>
                      <div class="grid grid-cols-2 gap-3">
                        <div>
                          <div class="flex justify-between text-[10px] text-muted mb-2 uppercase font-medium">
                            <span>Whites</span>
                          </div>
                          <USlider v-model="currentFilters.whites" :min="-100" :max="100" size="sm" @update:model-value="applyFilter({ whites: $event })" />
                        </div>
                        <div>
                          <div class="flex justify-between text-[10px] text-muted mb-2 uppercase font-medium">
                            <span>Blacks</span>
                          </div>
                          <USlider v-model="currentFilters.blacks" :min="-100" :max="100" size="sm" @update:model-value="applyFilter({ blacks: $event })" />
                        </div>
                      </div>
                    </div>
                  </template>

                  <template #detail>
                    <div class="p-3 space-y-4">
                      <div>
                        <div class="flex justify-between text-[10px] text-muted mb-2 uppercase font-medium">
                          <span>Clarity</span>
                          <span class="text-primary-500">{{ currentFilters.clarity }}</span>
                        </div>
                        <USlider v-model="currentFilters.clarity" :min="-100" :max="100" size="sm" @update:model-value="applyFilter({ clarity: $event })" />
                      </div>
                      <div>
                        <div class="flex justify-between text-[10px] text-muted mb-2 uppercase font-medium">
                          <span>Sharpen</span>
                          <span class="text-primary-500">{{ currentFilters.sharpen }}</span>
                        </div>
                        <USlider v-model="currentFilters.sharpen" :min="0" :max="100" size="sm" @update:model-value="applyFilter({ sharpen: $event })" />
                      </div>
                    </div>
                  </template>
                </UAccordion>
              </div>
            </ImgFilter>

            <!-- Custom User Slot Content -->
            <slot :editor="editorAPI" />
          </TransitionGroup>
        </div>
      </aside>
    </div>

    <!-- Change Image Button using Nuxt UI -->
    <Teleport v-if="hasImage" to="body">
      <div class="hidden">
        <!-- We use this purely to capture the upload logic if needed elsewhere,
             but UFileUpload is mostly used in Slots / Tools -->
      </div>
    </Teleport>
  </div>
</template>
