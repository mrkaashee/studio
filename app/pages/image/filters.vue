<script lang="ts" setup>
import { ref, onMounted, nextTick } from 'vue'

const editorRef = ref<any>(null)

const downloadResult = async () => {
  if (editorRef.value) {
    await editorRef.value.applyAndExport('filtered-image.png')
  }
}

onMounted(() => {
  nextTick(() => {
    // Activate the filter tool to show the filter sidebar natively
    editorRef.value?.activateTool('filter')
  })
})
</script>

<template>
  <div class="h-[calc(100vh-var(--header-top-height,64px))] w-full flex flex-col bg-background relative">
    <ClientOnly>
      <ImgStudio ref="editorRef" borderless filter>
        <template #header>
          <div class="flex items-center justify-between px-4 py-1.5 border-b border-default bg-elevated z-10 w-full relative">
            <div class="flex items-center gap-2">
              <div class="p-1.5 border border-primary/20 bg-primary/10 rounded-lg text-primary">
                <UIcon name="i-lucide-sparkles" class="size-5" />
              </div>
              <div>
                <h1 class="font-bold tracking-tight text-sm">
                  Photo Filters
                </h1>
                <p class="text-[10px] text-muted hidden sm:block">
                  Transform your photos with professional filters and adjustments.
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
      </ImgStudio>
    </ClientOnly>
  </div>
</template>
