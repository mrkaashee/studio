<script lang="ts" setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import type { CropResult, AspectPreset } from './types'

const props = withDefaults(defineProps<{
  src: string
  cropAspect?: number | null
  cropPresets?: AspectPreset[]
  cropShape?: 'rect' | 'round'
  fixedCrop?: boolean
}>(), {
  cropAspect: null,
  cropPresets: () => [],
  cropShape: 'rect',
  fixedCrop: false
})

const emit = defineEmits<{
  apply: [result: CropResult]
  cancel: []
}>()

const activeAspect = ref<number | null>(props.cropShape === 'round' ? 1 : props.cropAspect)

// Apply aspect from presets if prop changes
watch(() => props.cropAspect, val => {
  if (props.cropShape === 'round') return // always 1:1 for round
  activeAspect.value = val
  applyAspect()
})

const containerRef = ref<HTMLElement>()
const canvasRef = ref<HTMLCanvasElement>()
const imgRef = ref<HTMLImageElement>()

// State for drawing and interaction
let ctx: CanvasRenderingContext2D | null = null
const imgState = { x: 0, y: 0, w: 0, h: 0, scale: 1 } // Image bounds in canvas
const cropState = { x: 0, y: 0, w: 0, h: 0 } // Crop box bounds in canvas

// Drag state
let isDragging = false
let dragAction = '' // 'tl', 'tr', 'bl', 'br', 'move', ''
let startMouseX = 0
let startMouseY = 0
let startCrop = { x: 0, y: 0, w: 0, h: 0 }
let startImg = { x: 0, y: 0, w: 0, h: 0 }

const hoverCursor = ref('default')
const HANDLE_SIZE = 12

// --- Initialization ---
onMounted(async () => {
  if (!containerRef.value || !canvasRef.value) return
  ctx = canvasRef.value.getContext('2d')
  window.addEventListener('resize', handleResize)
  await loadImage()
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
})

async function loadImage() {
  const img = new Image()
  img.crossOrigin = 'anonymous'
  imgRef.value = img

  await new Promise(resolve => {
    img.onload = resolve
    img.src = props.src
  })

  initLayout()
}

function initLayout() {
  if (!containerRef.value || !canvasRef.value || !imgRef.value) return
  const { width, height } = containerRef.value.getBoundingClientRect()

  // High DPI canvas
  const dpr = window.devicePixelRatio || 1
  canvasRef.value.width = width * dpr
  canvasRef.value.height = height * dpr
  ctx?.scale(dpr, dpr)
  canvasRef.value.style.width = width + 'px'
  canvasRef.value.style.height = height + 'px'

  // Fit image into container padding 20px
  const padding = 20
  const maxWidth = width - padding * 2
  const maxHeight = height - padding * 2
  const imgW = imgRef.value.naturalWidth
  const imgH = imgRef.value.naturalHeight

  const scale = Math.min(maxWidth / imgW, maxHeight / imgH)
  const drawW = imgW * scale
  const drawH = imgH * scale
  const drawX = (width - drawW) / 2
  const drawY = (height - drawH) / 2

  imgState.x = drawX
  imgState.y = drawY
  imgState.w = drawW
  imgState.h = drawH
  imgState.scale = scale

  // Initial crop box
  // For fixed crop, make it 100% of the minor dimension to touch edges
  const isFixed = props.fixedCrop
  const cw = isFixed ? Math.min(drawW, drawH) : drawW * 0.8
  const ch = isFixed ? Math.min(drawW, drawH) : drawH * 0.8
  cropState.x = drawX + (drawW - cw) / 2
  cropState.y = drawY + (drawH - ch) / 2
  cropState.w = cw
  cropState.h = ch

  applyAspect()
  draw()
}

function handleResize() {
  initLayout()
}

// --- Aspect Logic ---
function applyAspect() {
  if (activeAspect.value === null) return

  // Fix aspect ratio by adjusting height from center
  const targetRatio = activeAspect.value
  const currentRatio = cropState.w / cropState.h

  if (currentRatio > targetRatio) {
    // Too wide, reduce width
    const newW = cropState.h * targetRatio
    cropState.x += (cropState.w - newW) / 2
    cropState.w = newW
  }
  else {
    // Too tall, reduce height
    const newH = cropState.w / targetRatio
    cropState.y += (cropState.h - newH) / 2
    cropState.h = newH
  }

  clampCropBox()
  draw()
}

function setAspect(val: number | null) {
  activeAspect.value = val
  applyAspect()
}

// --- Rendering ---
function draw() {
  if (!ctx || !canvasRef.value || !imgRef.value) return
  const w = canvasRef.value.width / (window.devicePixelRatio || 1)
  const h = canvasRef.value.height / (window.devicePixelRatio || 1)

  ctx.clearRect(0, 0, w, h)

  // 1. Draw image
  ctx.drawImage(imgRef.value, imgState.x, imgState.y, imgState.w, imgState.h)

  // 2. Overlay dark mask
  ctx.fillStyle = 'rgba(0, 0, 0, 0.6)'
  ctx.fillRect(0, 0, w, h)

  // 3. Cut out crop area
  ctx.save()
  ctx.globalCompositeOperation = 'destination-out'
  if (props.cropShape === 'round') {
    ctx.beginPath()
    ctx.arc(cropState.x + cropState.w / 2, cropState.y + cropState.h / 2, cropState.w / 2, 0, Math.PI * 2)
    ctx.fill()
  }
  else {
    ctx.fillRect(cropState.x, cropState.y, cropState.w, cropState.h)
  }
  ctx.restore()

  // 4. Draw crop border
  ctx.strokeStyle = '#fff'
  ctx.lineWidth = 1
  if (props.cropShape === 'round') {
    ctx.beginPath()
    ctx.arc(cropState.x + cropState.w / 2, cropState.y + cropState.h / 2, cropState.w / 2, 0, Math.PI * 2)
    ctx.stroke()
  }
  else {
    ctx.strokeRect(cropState.x, cropState.y, cropState.w, cropState.h)
  }

  // Grid lines 3x3 only for rect
  if (props.cropShape !== 'round') {
    ctx.beginPath()
    for (let i = 1; i < 3; i++) {
      // Vertical
      ctx!.moveTo(cropState.x + (cropState.w / 3) * i, cropState.y)
      ctx!.lineTo(cropState.x + (cropState.w / 3) * i, cropState.y + cropState.h)
      // Horizontal
      ctx!.moveTo(cropState.x, cropState.y + (cropState.h / 3) * i)
      ctx!.lineTo(cropState.x + cropState.w, cropState.y + (cropState.h / 3) * i)
    }
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)'
    ctx.stroke()
  }

  // 5. Draw handles
  if (!props.fixedCrop) {
    const hs = HANDLE_SIZE
    const hs2 = hs / 2
    ctx.fillStyle = '#fff'

    if (props.cropShape === 'round') {
      const cx = cropState.x + cropState.w / 2
      const cy = cropState.y + cropState.h / 2
      const R = cropState.w / 2
      // Place handle at top-right of the circle curve (45 degrees)
      const hx = cx + R * 0.7071
      const hy = cy - R * 0.7071

      ctx.beginPath()
      ctx.arc(hx, hy, hs2 + 1, 0, Math.PI * 2) // slightly larger handle for circle
      ctx.fill()
    }
    else {
      // Corner paths
      const rects: [number, number, number, number][] = [
        [cropState.x - hs2, cropState.y - hs2, hs, hs], // tl
        [cropState.x + cropState.w - hs2, cropState.y - hs2, hs, hs], // tr
        [cropState.x - hs2, cropState.y + cropState.h - hs2, hs, hs], // bl
        [cropState.x + cropState.w - hs2, cropState.y + cropState.h - hs2, hs, hs] // br
      ]
      rects.forEach(([rx, ry, rw, rh]) => ctx!.fillRect(rx, ry, rw, rh))
    }
  }
}

// --- Interaction ---
function getMousePos(e: MouseEvent | TouchEvent) {
  if (!canvasRef.value) return { x: 0, y: 0 }
  const rect = canvasRef.value.getBoundingClientRect()
  const clientX = 'touches' in e ? e.touches[0]?.clientX ?? 0 : (e as MouseEvent).clientX
  const clientY = 'touches' in e ? e.touches[0]?.clientY ?? 0 : (e as MouseEvent).clientY
  return {
    x: clientX - rect.left,
    y: clientY - rect.top
  }
}

function getHitAction(x: number, y: number) {
  if (props.fixedCrop) return 'pan'

  const hs2 = HANDLE_SIZE / 2 + 6 // +6px slop for easier grabbing

  if (props.cropShape === 'round') {
    const cx = cropState.x + cropState.w / 2
    const cy = cropState.y + cropState.h / 2
    const R = cropState.w / 2
    const hx = cx + R * 0.7071
    const hy = cy - R * 0.7071

    const trHit = Math.abs(x - hx) <= hs2 && Math.abs(y - hy) <= hs2
    if (trHit) return 'tr_round'
  }
  else {
    const tlHit = x >= cropState.x - hs2 && x <= cropState.x + hs2 && y >= cropState.y - hs2 && y <= cropState.y + hs2
    if (tlHit) return 'tl'
    const trHit = x >= cropState.x + cropState.w - hs2 && x <= cropState.x + cropState.w + hs2 && y >= cropState.y - hs2 && y <= cropState.y + hs2
    if (trHit) return 'tr'
    const blHit = x >= cropState.x - hs2 && x <= cropState.x + hs2 && y >= cropState.y + cropState.h - hs2 && y <= cropState.y + cropState.h + hs2
    if (blHit) return 'bl'
    const brHit = x >= cropState.x + cropState.w - hs2 && x <= cropState.x + cropState.w + hs2 && y >= cropState.y + cropState.h - hs2 && y <= cropState.y + cropState.h + hs2
    if (brHit) return 'br'
  }

  const moveHit = x >= cropState.x && x <= cropState.x + cropState.w && y >= cropState.y && y <= cropState.y + cropState.h
  if (moveHit) return 'move'

  return ''
}

function onHoverMove(e: MouseEvent | TouchEvent) {
  if (isDragging) return
  if (props.fixedCrop) {
    hoverCursor.value = 'move'
    return
  }

  const { x, y } = getMousePos(e)
  const action = getHitAction(x, y)

  if (action === 'move') {
    hoverCursor.value = 'move'
  }
  else if (action === 'tl' || action === 'br') {
    hoverCursor.value = 'nwse-resize'
  }
  else if (action === 'tr' || action === 'bl' || action === 'tr_round') {
    hoverCursor.value = 'nesw-resize'
  }
  else {
    hoverCursor.value = 'default'
  }
}

function onPointerDown(e: MouseEvent | TouchEvent) {
  const { x, y } = getMousePos(e)
  dragAction = getHitAction(x, y)
  if (!dragAction) return

  isDragging = true
  startMouseX = x
  startMouseY = y
  startCrop = { ...cropState }
  startImg = { ...imgState }

  if (typeof window !== 'undefined') {
    window.addEventListener(e.type === 'touchstart' ? 'touchmove' : 'mousemove', onPointerMove, { passive: false })
    window.addEventListener(e.type === 'touchstart' ? 'touchend' : 'mouseup', onPointerUp)
  }
}

function clampImgToCrop() {
  if (imgState.x > cropState.x) imgState.x = cropState.x
  if (imgState.y > cropState.y) imgState.y = cropState.y

  if (imgState.x + imgState.w < cropState.x + cropState.w) {
    imgState.x = cropState.x + cropState.w - imgState.w
  }
  if (imgState.y + imgState.h < cropState.y + cropState.h) {
    imgState.y = cropState.y + cropState.h - imgState.h
  }

  // Edge case Center
  if (imgState.w < cropState.w) imgState.x = cropState.x + (cropState.w - imgState.w) / 2
  if (imgState.h < cropState.h) imgState.y = cropState.y + (cropState.h - imgState.h) / 2
}

function clampCropBox() {
  // Min size
  const minSize = 20
  if (cropState.w < minSize) {
    if (dragAction === 'tl' || dragAction === 'bl') cropState.x -= (minSize - cropState.w)
    cropState.w = minSize
  }
  if (cropState.h < minSize) {
    if (dragAction === 'tl' || dragAction === 'tr' || dragAction === 'tr_round') cropState.y -= (minSize - cropState.h)
    cropState.h = minSize
  }

  // Constrain to image bounds
  if (cropState.x < imgState.x) {
    if (dragAction !== 'move') cropState.w -= (imgState.x - cropState.x)
    cropState.x = imgState.x
  }
  if (cropState.y < imgState.y) {
    if (dragAction !== 'move') cropState.h -= (imgState.y - cropState.y)
    cropState.y = imgState.y
  }
  if (cropState.x + cropState.w > imgState.x + imgState.w) {
    if (dragAction !== 'move') cropState.w = imgState.x + imgState.w - cropState.x
    else cropState.x = imgState.x + imgState.w - cropState.w
  }
  if (cropState.y + cropState.h > imgState.y + imgState.h) {
    if (dragAction !== 'move') cropState.h = imgState.y + imgState.h - cropState.y
    else cropState.y = imgState.y + imgState.h - cropState.h
  }

  // Restore aspect ratio if squished by boundaries during a resize
  if (activeAspect.value !== null && dragAction !== 'move') {
    const ratio = activeAspect.value
    const maxW = cropState.w
    const maxH = cropState.h

    const restrictW = Math.min(maxW, maxH * ratio)
    const restrictH = restrictW / ratio

    if (dragAction.includes('t') || dragAction === 'tr_round') {
      cropState.y += (cropState.h - restrictH)
    }
    if (dragAction.includes('l')) {
      cropState.x += (cropState.w - restrictW)
    }

    cropState.w = restrictW
    cropState.h = restrictH
  }
}

function onPointerMove(e: MouseEvent | TouchEvent) {
  if (!isDragging) return
  e.preventDefault()

  const { x, y } = getMousePos(e)
  let dx = x - startMouseX
  let dy = y - startMouseY

  // Aspect ratio lock during drag
  if (activeAspect.value !== null && dragAction !== 'move' && dragAction !== 'tr_round') {
    const ratio = activeAspect.value
    // Simplify locked pulling to primary delta (max of dx/dy length to preserve direction)
    if (dragAction === 'br') {
      dx = dy * ratio // lock to dy
    }
    else if (dragAction === 'tl') {
      dx = dy * ratio
    }
    else if (dragAction === 'tr') {
      dy = -dx / ratio
    }
    else if (dragAction === 'bl') {
      dx = -dy * ratio
    }
  }

  if (dragAction === 'pan') {
    imgState.x = startImg.x + dx
    imgState.y = startImg.y + dy
    clampImgToCrop()
  }
  else if (dragAction === 'tr_round') {
    // scale dx so mouse stays on handle, keeping bottom-left anchored
    const dx_scaled = dx * 1.17157
    cropState.w = startCrop.w + dx_scaled
    cropState.h = cropState.w // aspect 1
    cropState.y = startCrop.y + startCrop.h - cropState.h
  }
  else if (dragAction === 'move') {
    cropState.x = startCrop.x + dx
    cropState.y = startCrop.y + dy
  }
  else {
    if (dragAction.includes('t')) {
      cropState.y = startCrop.y + dy
      cropState.h = startCrop.h - dy
    }
    if (dragAction.includes('b')) {
      cropState.h = startCrop.h + dy
    }
    if (dragAction.includes('l')) {
      cropState.x = startCrop.x + dx
      cropState.w = startCrop.w - dx
    }
    if (dragAction.includes('r')) {
      cropState.w = startCrop.w + dx
    }
  }

  clampCropBox()
  draw()
}

function onPointerUp(e: MouseEvent | TouchEvent) {
  isDragging = false
  if (typeof window !== 'undefined') {
    window.removeEventListener('mousemove', onPointerMove)
    window.removeEventListener('touchmove', onPointerMove)
    window.removeEventListener('mouseup', onPointerUp)
    window.removeEventListener('touchend', onPointerUp)
  }
}

function onWheel(e: WheelEvent) {
  if (!props.fixedCrop || !imgRef.value) return
  e.preventDefault()

  const zoomSpeed = 0.05
  const delta = e.deltaY > 0 ? -zoomSpeed : zoomSpeed // positive is zoom in

  const oldScale = imgState.scale
  let newScale = oldScale + oldScale * delta

  // Constrain zoom out so image covers the crop box
  const minScaleX = cropState.w / imgRef.value.naturalWidth
  const minScaleY = cropState.h / imgRef.value.naturalHeight
  const minScale = Math.max(minScaleX, minScaleY)

  if (newScale < minScale) newScale = minScale
  if (newScale > minScale * 10) newScale = minScale * 10

  // Focus zoom on the mouse pointer position or center
  let focusX = cropState.x + cropState.w / 2
  let focusY = cropState.y + cropState.h / 2

  const { x, y } = getMousePos(e)
  // Re-center focus to mouse if mouse is inside bounds
  const moveHit = x >= cropState.x && x <= cropState.x + cropState.w && y >= cropState.y && y <= cropState.y + cropState.h
  if (moveHit) {
    focusX = x
    focusY = y
  }

  const imgFocusX = (focusX - imgState.x) / oldScale
  const imgFocusY = (focusY - imgState.y) / oldScale

  imgState.scale = newScale
  imgState.w = imgRef.value.naturalWidth * newScale
  imgState.h = imgRef.value.naturalHeight * newScale

  imgState.x = focusX - imgFocusX * newScale
  imgState.y = focusY - imgFocusY * newScale

  clampImgToCrop()
  draw()
}

// --- Output ---
function apply() {
  if (!imgRef.value) return

  // Physical image pixels
  const px = (cropState.x - imgState.x) / imgState.scale
  const py = (cropState.y - imgState.y) / imgState.scale
  const pw = cropState.w / imgState.scale
  const ph = cropState.h / imgState.scale

  const c = document.createElement('canvas')
  c.width = pw
  c.height = ph
  const outCtx = c.getContext('2d')!

  if (props.cropShape === 'round') {
    outCtx.beginPath()
    outCtx.arc(pw / 2, ph / 2, pw / 2, 0, Math.PI * 2)
    outCtx.clip()
  }

  outCtx.drawImage(imgRef.value, px, py, pw, ph, 0, 0, pw, ph)

  emit('apply', {
    x: px,
    y: py,
    width: pw,
    height: ph,
    dataUrl: c.toDataURL()
  })
}

function cancel() {
  emit('cancel')
}
</script>

<template>
  <div class="img-cropper-container">
    <!-- Presets Header -->
    <div v-if="cropPresets.length" class="cropper-presets">
      <UButton
        v-for="preset in cropPresets"
        :key="preset.label"
        :label="preset.label"
        :variant="activeAspect === preset.value ? 'solid' : 'soft'"
        size="xs"
        @click="setAspect(preset.value)" />
    </div>

    <!-- Canvas Area -->
    <div ref="containerRef" class="canvas-wrapper">
      <canvas
        ref="canvasRef"
        class="crop-canvas"
        :style="{ cursor: hoverCursor }"
        @mousemove="onHoverMove"
        @mousedown="onPointerDown"
        @touchstart.passive="onPointerDown"
        @wheel.prevent="onWheel" />
    </div>

    <!-- Action Footer -->
    <div class="cropper-actions">
      <UButton label="Cancel" color="neutral" variant="soft" icon="i-lucide-x" @click="cancel" />
      <UButton label="Apply Crop" color="primary" icon="i-lucide-check" @click="apply" />
    </div>
  </div>
</template>

<style scoped>
.img-cropper-container {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  position: relative;
  background: var(--ui-bg);
}

.cropper-presets {
  display: flex;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--ui-border);
  background: var(--ui-bg-elevated);
  overflow-x: auto;
}

.canvas-wrapper {
  flex: 1;
  position: relative;
  overflow: hidden;
  user-select: none;
  touch-action: none;
}

.crop-canvas {
  position: absolute;
  top: 0;
  left: 0;
}

.cropper-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  border-top: 1px solid var(--ui-border);
  background: var(--ui-bg-elevated);
}
</style>
