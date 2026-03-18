<script lang="ts" setup>
import { ref } from 'vue'

const editorRef = ref()

const downloadResult = async () => {
  if (editorRef.value) {
    await editorRef.value.applyAndExport('annotated-image.png')
  }
}
</script>

<template>
  <ImgToolPage
    title="Photo Markup & Annotation"
    description="Add shapes, arrows, and text to your images with professional precision."
    icon="i-lucide-pencil-line">
    <template #default="{ img }">
      <div class="absolute inset-0 h-full w-full">
        <ClientOnly>
          <ImgStudio ref="editorRef" :src="img" borderless>
            <template #header>
              <div class="hidden" />
            </template>
            <template #default>
              <ImgAnnotate />
            </template>
          </ImgStudio>
        </ClientOnly>
      </div>
    </template>

    <template #actions>
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
          @click="downloadResult" />
      </div>
    </template>

    <template #sidebar>
      <div class="bg-elevated p-6 rounded-xl border border-muted space-y-4">
        <h3 class="font-semibold text-sm">
          Annotation Guide
        </h3>
        <ul class="text-xs text-muted space-y-2 list-disc pl-4">
          <li>Select a tool (Square, Circle, Arrow, Text) to start.</li>
          <li>Click and drag on the image to draw.</li>
          <li>Click an existing annotation to resize or move it.</li>
          <li>Use the "Apply Permanently" button in the sidebar to bake annotations into the image.</li>
        </ul>
      </div>

      <div class="p-6 rounded-xl space-y-2 bg-info/5 border border-info/20 text-xs text-info/80">
        <p class="font-semibold text-info flex items-center gap-1">
          <UIcon name="i-lucide-info" />
          Keyboard Shortcuts
        </p>
        <p>Press <UKbd>Del</UKbd> or <UKbd>Backspace</UKbd> to remove the selected annotation.</p>
      </div>
    </template>
  </ImgToolPage>
</template>
