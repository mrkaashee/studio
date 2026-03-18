<script lang="ts">
import { computed, inject, watch, onUnmounted, onMounted } from 'vue'
import type { AppConfig } from '@nuxt/schema'
import theme from '../utils/themes/img-censor'
import type { ComponentConfig } from '../types/tv'
import { useCensor } from '../composables/useCensor'
import type { ImageEditorContext } from '../types/editor'
import { getEventPoint } from '../utils/interaction'
import { tv } from '../utils/tv'
import type { StudioAppConfig } from '../types/studio'

export type StudioCensor = ComponentConfig<typeof theme, AppConfig, 'censor'>

export interface StudioCensorProps {
  headless?: boolean
  mode?: 'blur' | 'pixelate'
  intensity?: number
  state?: ReturnType<typeof useCensor>
  ui?: StudioCensor['slots']
}
</script>

<script setup lang="ts">
const appConfig = useAppConfig() as StudioAppConfig
const props = defineProps<StudioCensorProps>()

const imgStudio = inject<ImageEditorContext>('imgStudio')

const resUI = computed(() => tv({ extend: tv(theme), ...(appConfig.ui?.censor || {}) })({}))

// If no state provided, use local (backwards compatibility)
const localState = props.state ? undefined : useCensor(computed(() => imgStudio?.zoomLevel.value || 1))

// Resolve state source correctly
const censor = computed(() => (props.state || localState) as ReturnType<typeof useCensor>)

const setBoxRef = (id: string, el: HTMLElement | null) => {
  if (el) censor.value.boxRefs.set(id, el)
  else censor.value.boxRefs.delete(id)
}

// Proxy state values to top-level writable computeds for the template
const censorMode = computed({
  get: () => censor.value.mode.value,
  set: val => censor.value.mode.value = val
})
const censorIntensity = computed({
  get: () => censor.value.intensity.value,
  set: val => censor.value.intensity.value = val
})

// Initialize defaults from props if provided
watch(() => props.mode, newMode => {
  if (newMode) censorMode.value = newMode
}, { immediate: true })

watch(() => props.intensity, newIntensity => {
  if (newIntensity !== undefined) censorIntensity.value = newIntensity
}, { immediate: true })

const useArea = computed({
  get: () => censor.value.useArea.value,
  set: val => censor.value.useArea.value = val
})
const selections = computed(() => censor.value.selections.value)
const activeSelectionId = computed(() => censor.value.activeSelectionId.value)
const isInteracting = computed(() => censor.value.isInteracting.value)

const isActive = computed(() => imgStudio?.activeTool.value === 'censor')

const applyCensor = () => {
  if (!imgStudio) return
  const canvas = imgStudio.getCanvas()
  if (!canvas) return

  const tempCanvas = censor.value.getCensoredCanvas(canvas)
  if (tempCanvas) {
    imgStudio.commit(tempCanvas, 'censor')
    imgStudio.deactivateTool()
  }
}

onMounted(() => {
  console.log('ImgCensor: Performance layer active', { selections: selections.value.length })
})

watch(isActive, val => {
  if (val) {
    imgStudio?.registerApplyHook(applyCensor)
    const editorState = imgStudio?.getImageState()
    if (editorState?.width && editorState?.height) {
      if (selections.value.length === 0) {
        censor.value.initializeSelection(editorState.width, editorState.height)
      }
    }
  }
  else {
    imgStudio?.unregisterApplyHook(applyCensor)
  }
}, { immediate: true })

onUnmounted(() => {
  imgStudio?.unregisterApplyHook(applyCensor)
})

// Interaction Handler
const handleMouseDown = (e: MouseEvent | TouchEvent) => {
  if (!isActive.value || !useArea.value || !imgStudio) return

  const target = e.target as HTMLElement
  if (target.closest('.u-img-censor-box')) return

  const container = e.currentTarget as HTMLElement
  const rect = container.getBoundingClientRect()
  const p = getEventPoint(e)
  if (!p) return

  const x = (p.clientX - rect.left) / imgStudio.zoomLevel.value
  const y = (p.clientY - rect.top) / imgStudio.zoomLevel.value

  censor.value.startNewSelection(e, x, y)
}

const counterScale = computed(() => 1 / (imgStudio?.zoomLevel.value || 1))

defineExpose({
  mode: censorMode,
  intensity: censorIntensity,
  useArea: censor.value.useArea,
  isActive,
  applyCensor
})
</script>

<template>
  <div :class="resUI.root()">
    <!-- Sidebar Controls (only if not headless) -->
    <div v-if="!props.headless" :class="resUI.sidebar()">
      <div :class="resUI.header()">
        <h3 :class="resUI.title()">
          Censor Tool
        </h3>
        <UBadge v-if="isActive" color="primary" size="xs">
          Active
        </UBadge>
      </div>

      <div v-if="!isActive">
        <UButton
          label="Activate Censor"
          icon="i-lucide-shield-alert"
          color="neutral"
          variant="soft"
          block
          @click="imgStudio?.activateTool('censor')" />
      </div>

      <div v-else :class="resUI.controls() + ' pt-2'">
        <div :class="resUI.modeGrid()">
          <UButton
            label="Blur"
            :color="censorMode === 'blur' ? 'primary' : 'neutral'"
            :variant="censorMode === 'blur' ? 'solid' : 'soft'"
            size="xs"
            :class="resUI.modeButton()"
            @click="censorMode = 'blur'" />
          <UButton
            label="Pixelate"
            :color="censorMode === 'pixelate' ? 'primary' : 'neutral'"
            :variant="censorMode === 'pixelate' ? 'solid' : 'soft'"
            size="xs"
            :class="resUI.modeButton()"
            @click="censorMode = 'pixelate'" />
        </div>

        <div :class="resUI.controls()">
          <div :class="resUI.propRow()">
            <span :class="resUI.propTitle()">Use Selection</span>
            <USwitch v-model="useArea" size="xs" />
          </div>

          <div :class="resUI.propStack()">
            <div :class="resUI.propRow()">
              <span :class="resUI.propTitle()">Intensity</span>
              <span :class="resUI.propValue()">{{ censorIntensity }}</span>
            </div>
            <USlider v-model="censorIntensity" :min="1" :max="50" size="sm" />
          </div>
        </div>

        <div :class="resUI.actionButtons()">
          <UButton
            label="Cancel"
            color="neutral"
            variant="ghost"
            class="flex-1"
            @click="imgStudio?.cancelTool()" />
          <UButton
            label="Apply"
            color="primary"
            class="flex-1"
            @click="applyCensor" />
        </div>
      </div>
    </div>

    <!-- The Interaction Overlay / Drawing Surface -->
    <Teleport v-if="isActive && imgStudio?.overlayRef.value" :to="imgStudio.overlayRef.value">
      <div
        :class="resUI.overlay()"
        @mousedown.stop.prevent="handleMouseDown"
        @touchstart.stop.prevent="handleMouseDown">
        <!-- Multiple Selection Boxes -->
        <template v-if="useArea">
          <div
            v-for="sel in selections"
            :key="sel.id"
            :ref="el => setBoxRef(sel.id, el as HTMLElement | null)"
            :class="resUI.box({
              interacting: activeSelectionId === sel.id && isInteracting,
              active: activeSelectionId === sel.id,
              blur: sel.mode === 'blur',
              pixelate: sel.mode === 'pixelate',
            })"
            :style="{
              'transform': `translate3d(${sel.x}px, ${sel.y}px, 0)`,
              'width': sel.width + 'px',
              'height': sel.height + 'px',
              'zIndex': activeSelectionId === sel.id ? 100 : 10,
              '--intensity': sel.intensity + 'px',
              '--pixel-intensity': (sel.intensity / 2) + 'px',
              '--outline-width': (2 * counterScale) + 'px',
              '--active-outline': (4 * counterScale) + 'px',
              '--shadow-width': (1 * counterScale) + 'px',
            }"
            @mousedown.stop.prevent="censor.initiateInteraction($event, sel.id, 'move')"
            @touchstart.stop.prevent="censor.initiateInteraction($event, sel.id, 'move')">
            <!-- Delete button for active selection -->
            <div
              v-if="activeSelectionId === sel.id && !isInteracting"
              :class="resUI.deleteButton()"
              :style="{
                width: `${24 * counterScale}px`,
                height: `${24 * counterScale}px`,
                top: `-${12 * counterScale}px`,
                right: `-${12 * counterScale}px`,
              }"
              title="Remove this area"
              @mousedown.stop.prevent="censor.removeSelection(sel.id)"
              @touchstart.stop.prevent="censor.removeSelection(sel.id)">
              <UIcon name="i-lucide-x" :style="{ width: `${14 * counterScale}px`, height: `${14 * counterScale}px` }" />
            </div>

            <!-- Selection Area Highlight -->
            <div
              :class="resUI.selectionHighlight()"
              :style="{ borderWidth: (2 * counterScale) + 'px' }" />

            <!-- High-Visibility Handles (Only for active selection) -->
            <template v-if="activeSelectionId === sel.id">
              <ImgHandler position="top-left" :active="isInteracting" :style="{ transform: `scale(${counterScale * 0.6})` }" @mousedown.stop.prevent="censor.initiateInteraction($event, sel.id, 'resize', 'top-left')" />
              <ImgHandler position="top-right" :active="isInteracting" :style="{ transform: `scale(${counterScale * 0.6})` }" @mousedown.stop.prevent="censor.initiateInteraction($event, sel.id, 'resize', 'top-right')" />
              <ImgHandler position="bottom-left" :active="isInteracting" :style="{ transform: `scale(${counterScale * 0.6})` }" @mousedown.stop.prevent="censor.initiateInteraction($event, sel.id, 'resize', 'bottom-left')" />
              <ImgHandler position="bottom-right" :active="isInteracting" :style="{ transform: `scale(${counterScale * 0.6})` }" @mousedown.stop.prevent="censor.initiateInteraction($event, sel.id, 'resize', 'bottom-right')" />
            </template>
          </div>
        </template>
      </div>
    </Teleport>
  </div>
</template>
