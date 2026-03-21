<script lang="ts" setup>
import { ref, watch, computed } from 'vue'
import type { CropConfig, CropResult, StudioTool, ToolbarConfig, ZoomConfig } from './types'
import ImgDropZone from './ImgDropZone.vue'
import ImgToolbar from './ImgToolbar.vue'
import ImgCropper from './ImgCropper.vue'

const props = withDefaults(defineProps<{
  src?: string
  accept?: string
  crop?: boolean | CropConfig
  zoom?: boolean | ZoomConfig
  toolbar?: boolean | ToolbarConfig
  disabled?: boolean
}>(), {
  src: '',
  accept: 'image/*',
  crop: true,
  zoom: false,
  toolbar: true,
  disabled: false
})

const emit = defineEmits<{
  'update:src': [dataUrl: string]
  'crop:apply': [result: CropResult]
  'crop:cancel': []
  reset: []
}>()

// --- State ---
const internalSrc = ref(props.src)
const activeTool = defineModel<StudioTool>('activeTool', { default: 'none' })

// Update internal src if prop changes
watch(() => props.src, val => {
  if (val) internalSrc.value = val
})

const normalizedCrop = computed<CropConfig>(() => {
  if (typeof props.crop === 'boolean') return {}
  return props.crop || {}
})

const normalizedZoom = computed<ZoomConfig | false>(() => {
  if (props.zoom === false) return false
  if (props.zoom === true) return {}
  return props.zoom || {}
})

const isCropEnabled = computed(() => !!props.crop)

const normalizedToolbar = computed<ToolbarConfig>(() => {
  const items: StudioTool[] = []
  if (isCropEnabled.value) items.push('crop')

  if (typeof props.toolbar === 'object' && props.toolbar !== null) {
    return {
      show: props.toolbar.show ?? false,
      items: props.toolbar.items ?? items
    }
  }

  return {
    show: props.toolbar !== false,
    items
  }
})

const isCropping = computed(() => activeTool.value === 'crop' && isCropEnabled.value)

const hideActions = computed(() => {
  const items = normalizedToolbar.value.items || []
  return items.includes('apply') || items.includes('cancel') || items.includes('reset')
})

// Sync tool activation state
watch(activeTool, tool => {
  if (tool === 'crop' && !isCropEnabled.value) {
    activeTool.value = 'none'
  }
})

// --- Handlers ---
function onImageLoad(dataUrl: string) {
  internalSrc.value = dataUrl
  emit('update:src', dataUrl)
}

function onCropApply(result: CropResult) {
  internalSrc.value = result.dataUrl
  activeTool.value = 'none'
  emit('crop:apply', result)
  emit('update:src', result.dataUrl) // Update the working image
}

function onCropCancel() {
  activeTool.value = 'none'
  emit('crop:cancel')
}

function onReset() {
  internalSrc.value = ''
  activeTool.value = 'none'
  emit('reset')
}

function onToolbarAction(action: 'apply' | 'cancel' | 'reset') {
  if (action === 'reset') {
    onReset()
    return
  }

  if (action === 'apply') {
    if (isCropping.value) {
      applyCrop()
    }
  }
  else if (action === 'cancel') {
    if (isCropping.value) {
      onCropCancel()
    }
  }
}

const cropperRef = ref<InstanceType<typeof ImgCropper>>()

function applyCrop() {
  cropperRef.value?.apply()
}

function cancelCrop() {
  cropperRef.value?.cancel()
}

defineExpose({
  applyCrop,
  cancelCrop
})
</script>

<template>
  <div class="img-studio" :class="{ 'is-disabled': disabled }">
    <!-- 1. Selection State -->
    <div v-if="!internalSrc" class="studio-empty">
      <ImgDropZone :accept="accept" @load="onImageLoad">
        <template #default>
          <slot name="empty" />
        </template>
      </ImgDropZone>
    </div>

    <!-- 2. Editor State -->
    <template v-else>
      <div class="studio-layout">
        <!-- Sidebar -->
        <ImgToolbar
          v-if="normalizedToolbar.show"
          :active-tool="activeTool"
          :config="normalizedToolbar"
          :disabled="disabled"
          @update:active-tool="val => activeTool = val"
          @action="onToolbarAction">
          <slot name="toolbar" />
        </ImgToolbar>

        <!-- Main Viewport -->
        <div class="studio-main">
          <!-- Background checked pattern -->
          <div class="bg-pattern" />

          <transition name="fade" mode="out-in">
            <ImgCropper
              v-if="isCropping"
              ref="cropperRef"
              :src="internalSrc"
              :crop="normalizedCrop"
              :zoom="normalizedZoom"
              :hide-actions="hideActions"
              @apply="onCropApply"
              @cancel="onCropCancel" />

            <!-- Standard View -->
            <div v-else class="studio-view">
              <img :src="internalSrc" class="studio-img" alt="Studio Preview">
              <!-- Custom preview overlay slot -->
              <slot name="preview" :src="internalSrc" :crop="isCropping" />
            </div>
          </transition>
        </div>
      </div>

      <!-- Action Footer -->
      <div v-if="!hideActions" class="studio-footer">
        <UButton
          label="Reset Image"
          icon="i-lucide-trash-2"
          color="neutral"
          variant="ghost"
          @click="onReset" />
        <div class="flex-1" />
        <!-- Custom actions slot -->
        <slot name="actions" />
      </div>
    </template>
  </div>
</template>

<style scoped>
.img-studio {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 600px; /* Default height */
  min-height: 400px;
  background: var(--ui-bg);
  border: 1px solid var(--ui-border);
  border-radius: var(--radius-xl);
  overflow: hidden;
  position: relative;
}

.img-studio.is-disabled {
  opacity: 0.6;
  pointer-events: none;
}

.studio-layout {
  display: flex;
  flex: 1;
  min-height: 0;
}

.studio-main {
  flex: 1;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.bg-pattern {
  position: absolute;
  inset: 0;
  background-image: linear-gradient(45deg, var(--ui-border) 25%, transparent 25%),
                    linear-gradient(-45deg, var(--ui-border) 25%, transparent 25%),
                    linear-gradient(45deg, transparent 75%, var(--ui-border) 75%),
                    linear-gradient(-45deg, transparent 75%, var(--ui-border) 75%);
  background-size: 20px 20px;
  background-position: 0 0, 0 10px, 10px -10px, -10px 0px;
  opacity: 0.2;
  pointer-events: none;
}

.studio-view {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  padding: 1rem;
}

.studio-img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
}

.studio-footer {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  border-top: 1px solid var(--ui-border);
  background: var(--ui-bg-elevated);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
