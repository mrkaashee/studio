<script lang="ts" setup>
import { ref, watch } from 'vue'

const editorRef = ref<any>(null)
const cropResult = ref<{
  x: number
  y: number
  width: number
  height: number
} | null>(null)

const selectedRatio = ref(0)
const ratioOptions = [
  { label: 'Freeform / Custom', value: 0 },
  { label: 'Square (1:1)', value: 1 },
  { label: 'Standard (4:3)', value: 4 / 3 },
  { label: 'Landscape (16:9)', value: 16 / 9 },
  { label: 'Portrait (9:16)', value: 9 / 16 },
  { label: 'Classic (3:2)', value: 3 / 2 },
  { label: 'Vertical (4:5)', value: 4 / 5 }
]

const handleCropChange = (result: {
  x: number
  y: number
  width: number
  height: number
}) => {
  cropResult.value = result
}

const downloadResult = async () => {
  if (editorRef.value) {
    await editorRef.value.applyAndExport('cropped-image.png')
  }
}

// Automatically activate the rect stencil when an image is loaded
watch(() => editorRef.value?.hasImage, loaded => {
  if (loaded) {
    editorRef.value?.activateTool('stencil-rect')
  }
}, { immediate: true })
</script>

<template>
  <div class="h-[calc(100vh-var(--header-top-height,64px))] w-full flex flex-col bg-background">
    <ClientOnly>
      <ImgStudio
        ref="editorRef"
        :cropper="true"
        borderless>
        <template #header>
          <div class="flex items-center justify-between px-4 py-1.5 border-b border-default bg-elevated z-10">
            <div class="flex items-center gap-2">
              <div class="p-1.5 border border-primary/20 bg-primary/10 rounded-lg text-primary">
                <UIcon name="i-lucide-crop" class="size-5" />
              </div>
              <div>
                <h1 class="font-bold tracking-tight text-sm">
                  Image Cropper
                </h1>
                <p class="text-[10px] text-muted">
                  Crop your images to any aspect ratio with precision.
                </p>
              </div>
            </div>

            <div class="flex gap-2">
              <UButton
                label="Undo"
                icon="i-lucide-undo"
                variant="ghost"
                color="neutral"
                size="sm"
                :disabled="!editorRef?.canUndo"
                @click="editorRef?.undo()" />
              <UButton
                label="Redo"
                icon="i-lucide-redo"
                variant="ghost"
                color="neutral"
                size="sm"
                :disabled="!editorRef?.canRedo"
                @click="editorRef?.redo()" />
              <UButton
                label="Export"
                icon="i-lucide-download"
                color="primary"
                size="sm"
                @click="downloadResult" />
            </div>
          </div>
        </template>

        <template #cropper="{ editor }">
          <div v-if="editor.hasImage" class="space-y-6">
            <div class="space-y-4">
              <h3 class="font-bold text-xs uppercase tracking-widest text-muted flex items-center gap-2 px-1">
                <UIcon name="i-lucide-settings-2" />
                Aspect Ratio
              </h3>

              <USelect
                v-model="selectedRatio"
                :items="ratioOptions"
                size="md"
                class="w-full" />

              <UButton
                label="Apply Crop"
                icon="i-lucide-check"
                color="primary"
                block
                class="mt-4"
                @click="editor.deactivateTool()" />
            </div>

            <RectangleStencil
              v-if="editor.activeTool === 'stencil-rect'"
              key="stencil-rect"
              :aspect-ratio="selectedRatio"
              @change="handleCropChange" />

            <div v-if="cropResult" class="px-1 border-t border-default pt-4 space-y-3">
              <h3 class="font-bold text-[10px] uppercase tracking-widest text-muted flex items-center gap-2">
                <UIcon name="i-lucide-info" />
                Selection Details
              </h3>
              <div class="grid grid-cols-2 gap-y-2 text-[11px] text-muted font-mono">
                <div>X: <span class="text-default font-semibold">{{ Math.round(cropResult.x) }}px</span></div>
                <div>Y: <span class="text-default font-semibold">{{ Math.round(cropResult.y) }}px</span></div>
                <div>W: <span class="text-default font-semibold">{{ Math.round(cropResult.width) }}px</span></div>
                <div>H: <span class="text-default font-semibold">{{ Math.round(cropResult.height) }}px</span></div>
              </div>
            </div>
          </div>
        </template>

        <template #default>
          <!-- Hidden default sidebar to favor our full control in the cropper slot -->
          <div class="hidden" />
        </template>
      </ImgStudio>
    </ClientOnly>
  </div>
</template>
