<script lang="ts" setup>
import { ref, computed, watch } from 'vue'
import { watchDebounced } from '@vueuse/core'

const editorRef = ref<any>(null)

const {
  originalWidth,
  originalHeight,
  newWidth,
  newHeight,
  maintainAspectRatio,
  resizeMode,
  percentage,
  selectedPreset,
  updateWidth,
  updateHeight,
  updatePercentage,
  applyPreset,
  resetSize,
  getBlob,
  setSource,
  fileSizeEstimate,
  presets,
} = useImageResize()

// Initialize source image when the user uploads one
watch(() => editorRef.value?.sourceFile, file => {
  if (file && editorRef.value?.imageRef) {
    setSource(editorRef.value.imageRef)
  }
})

// Local state for inputs to defer updates until blur
const localWidth = ref(newWidth.value)
const localHeight = ref(newHeight.value)

// Sync local state when global state changes
watch(newWidth, val => localWidth.value = val)
watch(newHeight, val => localHeight.value = val)

const applyWidth = () => {
  const val = Number(localWidth.value)
  if (val > 0 && val !== newWidth.value) {
    updateWidth(val)
  }
  else {
    localWidth.value = newWidth.value
  }
}

const applyHeight = () => {
  const val = Number(localHeight.value)
  if (val > 0 && val !== newHeight.value) {
    updateHeight(val)
  }
  else {
    localHeight.value = newHeight.value
  }
}

// Live preview update - use debounce to prevent performance issues while dragging sliders or typing
watchDebounced([newWidth, newHeight], async () => {
  if (!editorRef.value?.hasImage) return

  // Generate the actual resized blob to show a 1:1 true preview inside the canvas
  const blob = await getBlob()
  if (blob) {
    const url = URL.createObjectURL(blob)
    editorRef.value.updateCanvas(url, true)
  }
}, { debounce: 250, maxWait: 1000 })

const downloadResult = async () => {
  const blob = await getBlob()
  if (blob) {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `resized-${newWidth.value}x${newHeight.value}.png`
    a.click()
    URL.revokeObjectURL(url)
  }
}
</script>

<template>
  <div class="h-[calc(100vh-var(--header-top-height,64px))] w-full flex flex-col bg-background relative">
    <ClientOnly>
      <ImgStudio ref="editorRef" borderless>
        <template #header>
          <div class="flex items-center justify-between px-4 py-1.5 border-b border-default bg-elevated z-10">
            <div class="flex items-center gap-2">
              <div class="p-1.5 border border-primary/20 bg-primary/10 rounded-lg text-primary">
                <UIcon name="i-lucide-scaling" class="size-5" />
              </div>
              <div>
                <h1 class="font-bold tracking-tight text-sm">
                  Image Resizer
                </h1>
                <p class="text-[10px] text-muted">
                  Scale images to custom dimensions or presets.
                </p>
              </div>
            </div>

            <div class="flex gap-2">
              <UButton
                label="Download Resized Image"
                icon="i-lucide-download"
                color="primary"
                size="sm"
                @click="downloadResult" />
            </div>
          </div>
        </template>

        <template #default>
          <div class="p-4 space-y-6 pb-20 max-h-full overflow-y-auto custom-scrollbar">
            <!-- Resize Mode -->
            <div class="space-y-4">
              <h3 class="font-bold text-xs uppercase tracking-widest text-muted flex items-center gap-2 px-1">
                <UIcon name="i-lucide-settings-2" />
                Resize Mode
              </h3>
              <div class="flex bg-elevated p-1 rounded-lg border border-default shadow-sm">
                <UButton
                  v-for="mode in ['custom', 'percentage', 'preset']"
                  :key="mode"
                  :label="mode.charAt(0).toUpperCase() + mode.slice(1)"
                  size="xs"
                  class="flex-1 justify-center transition-all duration-200"
                  :color="resizeMode === mode ? 'primary' : 'neutral'"
                  :variant="resizeMode === mode ? 'solid' : 'ghost'"
                  @click="resizeMode = (mode as any)" />
              </div>
            </div>

            <UDivider class="my-4 opacity-50" />

            <!-- Custom Dimensions -->
            <div v-show="resizeMode === 'custom'" class="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
              <h3 class="font-bold text-[10px] uppercase tracking-widest text-muted flex items-center gap-2 px-1">
                <UIcon name="i-lucide-ruler" />
                Dimensions
              </h3>

              <div class="bg-elevated border border-default rounded-xl p-4 space-y-4">
                <div class="grid grid-cols-2 gap-4">
                  <UFormField label="Width (px)" class="text-xs">
                    <UInput
                      v-model="localWidth"
                      type="number"
                      size="sm"
                      class="font-mono"
                      @blur="applyWidth"
                      @keydown.enter="applyWidth" />
                  </UFormField>
                  <UFormField label="Height (px)" class="text-xs">
                    <UInput
                      v-model="localHeight"
                      type="number"
                      size="sm"
                      class="font-mono"
                      @blur="applyHeight"
                      @keydown.enter="applyHeight" />
                  </UFormField>
                </div>

                <div class="pt-2">
                  <UCheckbox
                    v-model="maintainAspectRatio"
                    label="Maintain aspect ratio"
                    class="text-sm font-medium" />
                </div>
              </div>
            </div>

            <!-- Percentage -->
            <div v-show="resizeMode === 'percentage'" class="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
              <h3 class="font-bold text-[10px] uppercase tracking-widest text-muted flex items-center gap-2 px-1">
                <UIcon name="i-lucide-percent" />
                Scale ({{ percentage }}%)
              </h3>

              <div class="bg-elevated border border-default rounded-xl p-5">
                <USlider
                  :model-value="percentage"
                  :min="10"
                  :max="200"
                  size="sm"
                  @update:model-value="updatePercentage(Number($event))" />
                <div class="flex justify-between text-[10px] text-muted font-medium mt-3">
                  <span>10%</span>
                  <span>100%</span>
                  <span>200%</span>
                </div>
              </div>
            </div>

            <!-- Presets -->
            <div v-show="resizeMode === 'preset'" class="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
              <h3 class="font-bold text-[10px] uppercase tracking-widest text-muted flex items-center gap-2 px-1">
                <UIcon name="i-lucide-layout-template" />
                Presets
              </h3>

              <div class="grid grid-cols-1 gap-2">
                <UButton
                  v-for="preset in presets"
                  :key="preset.label"
                  block
                  color="neutral"
                  :variant="selectedPreset === preset.label ? 'subtle' : 'soft'"
                  class="justify-start text-left h-auto py-2.5 transition-all"
                  :class="selectedPreset === preset.label ? 'ring-1 ring-primary-500/50' : ''"
                  @click="applyPreset(preset)">
                  <div class="flex flex-col flex-1 pl-1">
                    <span class="font-medium" :class="selectedPreset === preset.label ? 'text-primary' : 'text-foreground'">{{ preset.label }}</span>
                    <span class="text-xs text-muted font-mono mt-0.5">{{ preset.width }} × {{ preset.height }}</span>
                  </div>
                  <UIcon v-if="selectedPreset === preset.label" name="i-lucide-check-circle-2" class="text-primary size-4 mr-1" />
                </UButton>
              </div>
            </div>

            <UDivider class="my-4 opacity-50" />

            <!-- Info Panel -->
            <div class="space-y-4">
              <h3 class="font-bold text-[10px] uppercase tracking-widest text-muted flex items-center gap-2 px-1">
                <UIcon name="i-lucide-scroll-text" />
                Summary
              </h3>

              <div class="bg-elevated border border-default p-4 rounded-xl space-y-3">
                <div class="flex justify-between items-center text-xs">
                  <span class="text-muted font-medium">Original Size</span>
                  <span class="font-mono text-default">{{ originalWidth }} × {{ originalHeight }}</span>
                </div>
                <div class="flex justify-between items-center text-xs">
                  <span class="text-muted font-medium">New Size</span>
                  <span class="font-mono font-bold text-primary">{{ newWidth }} × {{ newHeight }}</span>
                </div>
                <div class="flex justify-between items-center text-xs pt-2 border-t border-muted/20">
                  <span class="text-muted font-medium">Estimated File Size</span>
                  <span class="font-mono font-medium text-default">{{ fileSizeEstimate }}</span>
                </div>

                <div class="pt-3">
                  <UButton
                    label="Reset to Original"
                    icon="i-lucide-rotate-ccw"
                    color="neutral"
                    variant="soft"
                    size="xs"
                    block
                    @click="resetSize" />
                </div>
              </div>
            </div>
          </div>
        </template>
      </ImgStudio>
    </ClientOnly>
  </div>
</template>
