<script lang="ts" setup>
import { ref, onMounted, nextTick } from 'vue'

const editorRef = ref<any>(null)

const downloadResult = async () => {
  if (editorRef.value) {
    await editorRef.value.applyAndExport('annotated-image.png')
  }
}

onMounted(() => {
  nextTick(() => {
    // Activate the annotate tool to show the annotation sidebar natively
    editorRef.value?.activateTool('annotate')
  })
})
</script>

<template>
  <div class="h-[calc(100vh-var(--header-top-height,64px))] w-full flex flex-col bg-background relative">
    <ClientOnly>
      <ImgStudio
        ref="editorRef"
        borderless
        annotate>
        <template #header>
          <div class="flex items-center justify-between px-4 py-1.5 border-b border-default bg-elevated z-10 w-full relative">
            <div class="flex items-center gap-2">
              <div class="p-1.5 border border-primary/20 bg-primary/10 rounded-lg text-primary">
                <UIcon name="i-lucide-pencil-line" class="size-5" />
              </div>
              <div>
                <h1 class="font-bold tracking-tight text-sm">
                  Photo Markup & Annotation
                </h1>
                <p class="text-[10px] text-muted hidden sm:block">
                  Add shapes, arrows, and text to your images with professional precision.
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

        <!-- Use the default annotate slot but add some extra info below it -->
        <template #annotate="{ annotateProps }">
          <div class="space-y-6">
            <ImgAnnotate v-bind="annotateProps" />

            <UDivider class="opacity-50" />

            <div class="space-y-4">
              <h3 class="font-bold text-[10px] uppercase tracking-widest text-muted flex items-center gap-2 px-1">
                <UIcon name="i-lucide-help-circle" />
                Guide
              </h3>
              <div class="bg-elevated border border-default rounded-xl p-4">
                <ul class="text-[11px] text-muted space-y-2 list-disc pl-4 leading-relaxed">
                  <li>Select a tool (Square, Circle, Arrow, Text) to start.</li>
                  <li>Click and drag on the image to draw.</li>
                  <li>Click an existing annotation to resize or move it.</li>
                  <li>Use the <strong>Apply Permanently</strong> button to bake your changes.</li>
                </ul>
              </div>
            </div>

            <div class="p-4 rounded-xl space-y-2 bg-info/5 border border-info/20 text-[11px] text-info/90">
              <p class="font-bold text-info flex items-center gap-1 uppercase tracking-wider text-[10px]">
                <UIcon name="i-lucide-info" class="size-3.5" />
                Keyboard Shortcuts
              </p>
              <p>
                Press
                <UKbd
                  size="sm"
                  class="font-mono">
                  Del
                </UKbd>
                or
                <UKbd
                  size="sm"
                  class="font-mono">
                  Backspace
                </UKbd>
                to remove the selected annotation.
              </p>
            </div>
          </div>
        </template>
      </ImgStudio>
    </ClientOnly>
  </div>
</template>
