<script lang="ts" setup>
import type { CropConfig, StudioTool, ToolbarConfig, ZoomConfig, ExportConfig } from './types'

withDefaults(defineProps<{
  src?: string
  accept?: string
  crop?: boolean | CropConfig
  zoom?: boolean | ZoomConfig
  toolbar?: boolean | ToolbarConfig
  export?: ExportConfig
  disabled?: boolean
}>(), {
  src: '',
  accept: 'image/*',
  crop: true,
  zoom: false,
  toolbar: true,
  disabled: false
})

defineModel<StudioTool>('activeTool', { default: 'none' })
</script>

<template>
  <div class="flex flex-col items-center justify-center w-full min-h-100 bg-muted border-2 border-dashed border-muted rounded-xl animate-pulse">
    <UIcon name="i-lucide-image" class="w-12 h-12 text-muted mb-3" />
    <span class="text-sm font-medium text-muted">Loading Image Studio...</span>
  </div>
</template>
