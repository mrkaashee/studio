<script lang="ts" setup>
import { ref, onMounted, nextTick } from 'vue'

const editorRef = ref<any>(null)

const downloadResult = async () => {
  if (editorRef.value) {
    await editorRef.value.applyAndExport('transformed-image.png')
  }
}

onMounted(() => {
  nextTick(() => {
    // Activate the transform tool to show the transform sidebar natively
    editorRef.value?.activateTool('transform')
  })
})
</script>

<template>
  <div class="h-[calc(100vh-var(--header-top-height,64px))] w-full flex flex-col bg-background relative">
    <ClientOnly>
      <ImgStudio
        ref="editorRef"
        borderless
        transform
      >
        <template #header>
          <div class="flex items-center justify-between px-4 py-3 border-b border-default bg-elevated z-10 w-full relative">
            <div class="flex items-center gap-3">
              <div class="p-2 border border-primary/20 bg-primary/10 rounded-lg text-primary">
                <UIcon name="i-lucide-rotate-cw" class="size-5" />
              </div>
              <div>
                <h1 class="font-bold tracking-tight text-sm">
                  Image Rotate & Flip
                </h1>
                <p class="text-[10px] text-muted hidden sm:block">
                  Rotate images by any angle and flip them horizontally or vertically.
                </p>
              </div>
            </div>
            
            <div class="flex gap-2">
              <UButton
                label="Undo"
                icon="i-lucide-undo"
                variant="ghost"
                color="neutral"
                :disabled="!editorRef?.canUndo"
                @click="editorRef?.undo()" />
              <UButton
                label="Redo"
                icon="i-lucide-redo"
                variant="ghost"
                color="neutral"
                :disabled="!editorRef?.canRedo"
                @click="editorRef?.redo()" />
              <UButton
                label="Download Result"
                icon="i-lucide-download"
                color="primary"
                size="sm"
                @click="downloadResult" />
            </div>
          </div>
        </template>

        <!-- Use the transform slot to keep the 180 degree button which is not in default ImgStudio -->
        <template #transform="{ transformProps }">
          <ImgTransform
            v-slot="{ rotate, flipHorizontal, flipVertical, currentTransform }"
            v-bind="transformProps"
          >
            <div class="space-y-6">
              <div class="space-y-4">
                <h3 class="font-bold text-[10px] uppercase tracking-widest text-muted flex items-center gap-2 px-1">
                  <UIcon name="i-lucide-rotate-cw" />
                  Rotate
                </h3>
                <div class="grid grid-cols-2 gap-2">
                  <UButton
                    label="90° Left"
                    icon="i-lucide-rotate-ccw"
                    variant="subtle"
                    color="neutral"
                    block
                    @click="rotate(-90)" />
                  <UButton
                    label="90° Right"
                    icon="i-lucide-rotate-cw"
                    variant="subtle"
                    color="neutral"
                    block
                    @click="rotate(90)" />
                  <UButton
                    label="180°"
                    icon="i-lucide-refresh-cw"
                    variant="subtle"
                    color="neutral"
                    block
                    class="col-span-2"
                    @click="rotate(180)" />
                </div>
              </div>

              <UDivider class="opacity-50" />

              <div class="space-y-4">
                <h3 class="font-bold text-[10px] uppercase tracking-widest text-muted flex items-center gap-2 px-1">
                  <UIcon name="i-lucide-flip-horizontal" />
                  Flip
                </h3>
                <div class="grid grid-cols-2 gap-2">
                  <UButton
                    label="Horizontal"
                    icon="i-lucide-flip-horizontal"
                    :variant="currentTransform.flipHorizontal ? 'solid' : 'subtle'"
                    :color="currentTransform.flipHorizontal ? 'primary' : 'neutral'"
                    block
                    @click="flipHorizontal" />
                  <UButton
                    label="Vertical"
                    icon="i-lucide-flip-vertical"
                    :variant="currentTransform.flipVertical ? 'solid' : 'subtle'"
                    :color="currentTransform.flipVertical ? 'primary' : 'neutral'"
                    block
                    @click="flipVertical" />
                </div>
              </div>
            </div>
          </ImgTransform>
        </template>
        
      </ImgStudio>
    </ClientOnly>
  </div>
</template>
