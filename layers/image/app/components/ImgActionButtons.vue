<script setup lang="ts">
import { inject, computed } from 'vue'
import type { ImageEditorContext, ImgActionButtonsProps } from '../types/editor'

const props = defineProps<ImgActionButtonsProps>()

const imgStudio = inject<ImageEditorContext>('imgStudio')

const activeTool = computed(() => imgStudio?.activeTool.value)

// List of tools that require an "Apply" step
const isApplyToolActive = computed(() => {
  const tools = ['stencil-circle', 'stencil-rectangle', 'annotate', 'censor', 'drawing']
  return activeTool.value && tools.includes(activeTool.value)
})

const startCropping = () => {
  imgStudio?.activateTool('stencil-circle')
}

const executeApply = () => {
  imgStudio?.applyAndExport(props.filename || 'export.png')
}
</script>

<template>
  <div class="flex gap-2">
    <UButton
      v-if="!activeTool"
      label="Crop Avatar"
      icon="i-lucide-crop"
      size="xs"
      variant="ghost"
      @click="startCropping" />
    <UButton
      v-else-if="isApplyToolActive"
      label="Apply & Export"
      color="primary"
      icon="i-lucide-download"
      size="xs"
      @click="executeApply" />
    <slot />
  </div>
</template>
