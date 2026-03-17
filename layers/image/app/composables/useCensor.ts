import { ref, computed, type Ref } from 'vue'
import { useInteraction } from './useInteraction'
import { calculateMove, calculateResize, type Rect } from '../utils/interaction'

export interface CensorSelection {
  id: string
  x: number
  y: number
  width: number
  height: number
  mode: 'blur' | 'pixelate'
  intensity: number
}

export function useCensor(zoomLevel: Ref<number> = ref(1)) {
  const globalMode = ref<'blur' | 'pixelate'>('blur')
  const globalIntensity = ref(10)
  const useArea = ref(true)

  const selections = ref<CensorSelection[]>([])
  const activeSelectionId = ref<string | null>(null)

  const mode = computed({
    get: () => {
      if (useArea.value && activeSelectionId.value) {
        const active = selections.value.find(s => s.id === activeSelectionId.value)
        if (active) return active.mode
      }
      return globalMode.value
    },
    set: (val: 'blur' | 'pixelate') => {
      globalMode.value = val
      if (useArea.value && activeSelectionId.value) {
        const active = selections.value.find(s => s.id === activeSelectionId.value)
        if (active) active.mode = val
      }
    }
  })

  const intensity = computed({
    get: () => {
      if (useArea.value && activeSelectionId.value) {
        const active = selections.value.find(s => s.id === activeSelectionId.value)
        if (active) return active.intensity
      }
      return globalIntensity.value
    },
    set: (val: number) => {
      globalIntensity.value = val
      if (useArea.value && activeSelectionId.value) {
        const active = selections.value.find(s => s.id === activeSelectionId.value)
        if (active) active.intensity = val
      }
    }
  })

  const initializeSelection = (imageWidth: number, imageHeight: number) => {
    const w = imageWidth * 0.4
    const h = imageHeight * 0.4
    const id = Date.now().toString()
    console.log('useCensor: Initializing selection', { imageWidth, imageHeight, w, h })
    selections.value = [{
      id,
      x: (imageWidth - w) / 2,
      y: (imageHeight - h) / 2,
      width: w,
      height: h,
      mode: globalMode.value,
      intensity: globalIntensity.value
    }]
    activeSelectionId.value = id
  }

  const boxRefs = new Map<string, HTMLElement>()
  const interactingSelection = ref<CensorSelection | null>(null)
  const isInteractingInternal = ref(false)
  const kindInternal = ref<'move' | 'resize' | 'draw' | null>(null)
  const handleInternal = ref<string | null>(null)

  const {
    startInteraction,
    startData
  } = useInteraction<Rect>(
    zoomLevel,
    (dx, dy) => {
      const data = startData.value
      if (!data || !interactingSelection.value) return

      let nextX = data.x
      let nextY = data.y
      let nextW = data.width
      let nextH = data.height

      if (kindInternal.value === 'move') {
        const moved = calculateMove(data, dx, dy)
        nextX = moved.x
        nextY = moved.y
        interactingSelection.value.x = nextX
        interactingSelection.value.y = nextY
      }
      else if (kindInternal.value === 'resize' && handleInternal.value) {
        const resized = calculateResize(data, dx, dy, handleInternal.value, { minWidth: 20, minHeight: 20 })
        nextX = resized.x
        nextY = resized.y
        nextW = resized.width
        nextH = resized.height
        interactingSelection.value.x = nextX
        interactingSelection.value.y = nextY
        interactingSelection.value.width = nextW
        interactingSelection.value.height = nextH
      }
      else if (kindInternal.value === 'draw') {
        nextW = Math.max(20, Math.abs(dx))
        nextH = Math.max(20, Math.abs(dy))
        nextX = dx < 0 ? data.x + dx : data.x
        nextY = dy < 0 ? data.y + dy : data.y
        interactingSelection.value.x = nextX
        interactingSelection.value.y = nextY
        interactingSelection.value.width = nextW
        interactingSelection.value.height = nextH
      }

      const el = activeSelectionId.value ? boxRefs.get(activeSelectionId.value) : null
      if (el) {
        el.style.transform = `translate3d(${nextX}px, ${nextY}px, 0)`
        if (kindInternal.value === 'resize' || kindInternal.value === 'draw') {
          el.style.width = `${nextW}px`
          el.style.height = `${nextH}px`
        }
      }

      // We still update the reactive state, but the UI is primarily driven by the above Direct DOM
      interactingSelection.value.x = nextX
      interactingSelection.value.y = nextY
      if (kindInternal.value === 'resize' || kindInternal.value === 'draw') {
        interactingSelection.value.width = nextW
        interactingSelection.value.height = nextH
      }
    },
    () => {
      interactingSelection.value = null
      isInteractingInternal.value = false
      kindInternal.value = null
      handleInternal.value = null
    }
  )

  const initiateInteraction = (e: MouseEvent | TouchEvent, id: string, k: 'move' | 'resize', h?: string) => {
    activeSelectionId.value = id
    isInteractingInternal.value = true
    kindInternal.value = k
    handleInternal.value = h || null
    const active = selections.value.find(s => s.id === id)
    if (active) {
      interactingSelection.value = active
      startInteraction(e, k, { x: active.x, y: active.y, width: active.width, height: active.height })
    }
  }

  const startNewSelection = (e: MouseEvent | TouchEvent, x: number, y: number) => {
    const id = Date.now().toString()
    const newSel: CensorSelection = {
      id,
      x,
      y,
      width: 1,
      height: 1,
      mode: globalMode.value,
      intensity: globalIntensity.value
    }
    selections.value.push(newSel)
    activeSelectionId.value = id

    // Use the reactive proxy directly from the array (synchronously)
    const newlyAdded = selections.value[selections.value.length - 1]
    if (newlyAdded) {
      interactingSelection.value = newlyAdded
      isInteractingInternal.value = true
      kindInternal.value = 'draw'
      handleInternal.value = null
      startInteraction(e, 'draw', { x, y, width: 1, height: 1 })
    }
  }

  const removeSelection = (id: string) => {
    const list = selections.value.filter(s => s.id !== id)
    selections.value = list
    if (activeSelectionId.value === id) {
      const last = list[list.length - 1]
      activeSelectionId.value = last ? last.id : null
    }
  }

  const clearSelections = () => {
    selections.value = []
    activeSelectionId.value = null
  }

  const createEffectCanvas = (sourceCanvas: HTMLCanvasElement, effectMode: 'blur' | 'pixelate', effectIntensity: number): HTMLCanvasElement | null => {
    const effectCanvas = document.createElement('canvas')
    effectCanvas.width = sourceCanvas.width
    effectCanvas.height = sourceCanvas.height
    const effectCtx = effectCanvas.getContext('2d')
    if (!effectCtx) return null

    if (effectMode === 'blur') {
      effectCtx.filter = `blur(${effectIntensity}px)`
      effectCtx.drawImage(sourceCanvas, 0, 0)
    }
    else {
      const size = Math.max(1, 40 - effectIntensity) / 100
      const w = Math.ceil(sourceCanvas.width * size)
      const h = Math.ceil(sourceCanvas.height * size)
      const smallCanvas = document.createElement('canvas')
      smallCanvas.width = w
      smallCanvas.height = h
      const smallCtx = smallCanvas.getContext('2d')
      if (smallCtx) {
        smallCtx.imageSmoothingEnabled = false
        smallCtx.drawImage(sourceCanvas, 0, 0, w, h)
        effectCtx.imageSmoothingEnabled = false
        effectCtx.drawImage(smallCanvas, 0, 0, w, h, 0, 0, sourceCanvas.width, sourceCanvas.height)
      }
    }
    return effectCanvas
  }

  const getCensoredCanvas = (sourceCanvas: HTMLCanvasElement): HTMLCanvasElement | null => {
    const tempCanvas = document.createElement('canvas')
    tempCanvas.width = sourceCanvas.width
    tempCanvas.height = sourceCanvas.height
    const tempCtx = tempCanvas.getContext('2d')
    if (!tempCtx) return null

    tempCtx.drawImage(sourceCanvas, 0, 0)

    if (!useArea.value) {
      const effectCanvas = createEffectCanvas(sourceCanvas, globalMode.value, globalIntensity.value)
      if (effectCanvas) tempCtx.drawImage(effectCanvas, 0, 0)
    }
    else {
      for (const sel of selections.value) {
        const effectCanvas = createEffectCanvas(sourceCanvas, sel.mode, sel.intensity)
        if (effectCanvas) {
          tempCtx.clearRect(sel.x, sel.y, sel.width, sel.height)
          tempCtx.drawImage(effectCanvas, sel.x, sel.y, sel.width, sel.height, sel.x, sel.y, sel.width, sel.height)
        }
      }
    }

    return tempCanvas
  }

  return {
    mode,
    intensity,
    useArea,
    selections,
    activeSelectionId,
    isInteracting: isInteractingInternal,
    kind: kindInternal,
    handle: handleInternal,
    boxRefs,
    initializeSelection,
    initiateInteraction,
    startNewSelection,
    removeSelection,
    clearSelections,
    getCensoredCanvas
  }
}
