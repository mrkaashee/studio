<script setup lang="ts">
/**
 * BACKWARD COMPATIBILITY PROXY
 * This component acts as a proxy for the renamed ImgStudio component.
 * It ensures that legacy pages and components still work without immediate refactoring.
 */
import { ref, computed } from 'vue'
import ImgStudio from './ImgStudio.vue'

const props = defineProps<any>()
const emit = defineEmits<any>()
const studioRef = ref<InstanceType<typeof ImgStudio> | null>(null)

// Proxy all methods and reactive properties from the internal studio instance
defineExpose({
  // State
  imageState: computed(() => studioRef.value?.imageState),
  canvasRef: computed(() => studioRef.value?.canvasRef),
  imageRef: computed(() => studioRef.value?.imageRef),
  activeTool: computed(() => studioRef.value?.activeTool),
  zoomLevel: computed(() => studioRef.value?.zoomLevel),
  panX: computed(() => studioRef.value?.panX),
  panY: computed(() => studioRef.value?.panY),
  overlayRef: computed(() => studioRef.value?.overlayRef),
  layers: computed(() => studioRef.value?.layers),
  canvasPreviewStyle: computed(() => studioRef.value?.canvasPreviewStyle),
  aspectRatio: computed(() => studioRef.value?.aspectRatio),
  panBounds: computed(() => studioRef.value?.panBounds),
  hasImage: computed(() => studioRef.value?.hasImage),
  isWorkerProcessing: computed(() => studioRef.value?.isWorkerProcessing),
  
  // Methods
  loadImage: (...args: any[]) => studioRef.value?.loadImage(...args),
  updateCanvas: (...args: any[]) => studioRef.value?.updateCanvas(...args),
  activateTool: (...args: any[]) => studioRef.value?.activateTool(...args),
  deactivateTool: () => studioRef.value?.deactivateTool(),
  cancelTool: () => studioRef.value?.cancelTool(),
  getCanvas: () => studioRef.value?.getCanvas(),
  getImageState: () => studioRef.value?.getImageState(),
  commit: (...args: any[]) => studioRef.value?.commit(...args),
  onFileChange: (...args: any[]) => studioRef.value?.onFileChange(...args),
  triggerFileInput: () => studioRef.value?.triggerFileInput(),
  undo: () => studioRef.value?.undo(),
  redo: () => studioRef.value?.redo(),
  canUndo: computed(() => studioRef.value?.canUndo),
  canRedo: computed(() => studioRef.value?.canRedo),
  resetAll: () => studioRef.value?.resetAll(),
  zoomIn: () => studioRef.value?.zoomIn(),
  zoomOut: () => studioRef.value?.zoomOut(),
  zoomTo: (...args: any[]) => studioRef.value?.zoomTo(...args),
  resetZoom: () => studioRef.value?.resetZoom(),
  processImage: (...args: any[]) => studioRef.value?.processImage(...args),
  registerApplyHook: (...args: any[]) => studioRef.value?.registerApplyHook(...args),
  unregisterApplyHook: (...args: any[]) => studioRef.value?.unregisterApplyHook(...args),
  applyAndExport: (...args: any[]) => studioRef.value?.applyAndExport(...args),
})
</script>

<template>
  <ImgStudio ref="studioRef" v-bind="props" @load="emit('load', $event)" @change="emit('change', $event)" @export="emit('export', $event)">
    <template v-for="(_, name) in $slots" #[name]="slotData">
      <slot :name="name" v-bind="slotData" />
    </template>
  </ImgStudio>
</template>
