<script lang="ts" setup>
import { ref, watch } from 'vue'

const editorRef = ref<any>(null)

const {
  outputFormat,
  quality,
  convertedBlob,
  convertedImageUrl,
  isConverting,
  setSource,
  formats,
} = useImageConvert()

// Feed the original uploaded file into the converter
watch(() => editorRef.value?.sourceFile, (file) => {
  if (file && editorRef.value?.imageRef) {
    setSource(editorRef.value.imageRef, file.type || 'image/jpeg')
  }
})

// Update the ImgStudio canvas live without triggering history commits
watch(convertedImageUrl, (url) => {
  if (url && editorRef.value) {
    editorRef.value.updateCanvas(url, true)
  }
})

const downloadImage = () => {
  if (!convertedBlob.value) return
  const format = formats.find(f => f.value === outputFormat.value)
  const url = URL.createObjectURL(convertedBlob.value)
  const a = document.createElement('a')
  a.href = url
  a.download = `converted-image.${format?.ext || 'png'}`
  a.click()
  URL.revokeObjectURL(url)
}
</script>

<template>
  <div class="h-[calc(100vh-var(--header-top-height,64px))] w-full flex flex-col bg-background relative">
    <ClientOnly>
      <ImgStudio
        ref="editorRef"
        borderless
        mode="image"
      >
        
        <template #header>
          <div class="flex items-center justify-between px-4 py-3 border-b border-default bg-elevated z-10">
            <div class="flex items-center gap-3">
              <div class="p-2 border border-primary/20 bg-primary/10 rounded-lg text-primary">
                <UIcon name="i-lucide-refresh-ccw" class="size-5" />
              </div>
              <div>
                <h1 class="font-bold tracking-tight text-sm">Format Converter</h1>
                <p class="text-[10px] text-muted">Convert images between PNG, JPEG, and WebP.</p>
              </div>
            </div>
            
            <div class="flex gap-2">
              <UButton
                label="Download Result"
                icon="i-lucide-download"
                color="primary"
                size="sm"
                :disabled="!convertedBlob"
                @click="downloadImage" />
            </div>
          </div>
          
          <!-- Loading overlay for the whole canvas area when converting -->
          <div
            v-if="isConverting && editorRef?.hasImage"
            class="absolute inset-0 top-[64px] z-20 flex items-center justify-center bg-background/50 backdrop-blur-sm pointer-events-none transition-opacity duration-300">
            <div class="bg-elevated border border-default p-4 rounded-xl shadow-2xl flex items-center gap-3">
              <UIcon name="i-lucide-loader-2" class="size-5 animate-spin text-primary" />
              <span class="text-sm font-semibold tracking-wide">Converting...</span>
            </div>
          </div>
        </template>

        <template #default>
          <div class="p-4 space-y-6 pb-20">
            
            <div class="space-y-4">
              <h3 class="font-bold text-xs uppercase tracking-widest text-muted flex items-center gap-2 px-1">
                <UIcon name="i-lucide-settings-2" />
                Convert To
              </h3>
              
              <div class="space-y-2">
                <UButton
                  v-for="format in formats"
                  :key="format.value"
                  block
                  color="neutral"
                  :variant="outputFormat === format.value ? 'subtle' : 'soft'"
                  class="justify-start text-left h-auto py-3 relative overflow-hidden transition-all"
                  :class="outputFormat === format.value ? 'ring-1 ring-primary-500/50' : ''"
                  @click="outputFormat = (format.value as any)">
                  <div class="flex items-center gap-3 z-10 relative">
                    <span class="text-xl">{{ format.icon }}</span>
                    <div class="flex flex-col">
                      <span class="font-medium" :class="outputFormat === format.value ? 'text-primary' : 'text-foreground'">{{ format.label }}</span>
                      <span class="text-[10px] text-muted">{{ format.description }}</span>
                    </div>
                  </div>
                  
                  <!-- Active indicator background -->
                  <div 
                    v-if="outputFormat === format.value"
                    class="absolute inset-0 bg-primary-500/5 z-0" />
                </UButton>
              </div>
            </div>

            <div v-if="outputFormat !== 'image/png'" class="space-y-4">
              <UDivider class="my-2" />
              <h3 class="font-bold text-[10px] uppercase tracking-widest text-muted flex items-center gap-2 px-1">
                <UIcon name="i-lucide-sliders" />
                Quality Settings
              </h3>
              <div class="px-1 space-y-2">
                <div class="flex justify-between text-[11px] font-semibold text-muted">
                  <span>Quality</span>
                  <span>{{ quality }}%</span>
                </div>
                <USlider v-model="quality" :min="1" :max="100" size="sm" />
              </div>
            </div>

            <UDivider class="my-4" />

            <!-- Info Panel -->
            <div class="p-4 rounded-xl shadow-sm border text-[11px] space-y-2 bg-info-500/5 border-info-500/20">
              <p class="font-semibold text-info-600 dark:text-info-400 flex items-center gap-1.5 text-xs">
                <UIcon name="i-lucide-info" class="size-4" />
                Format Guide
              </p>
              <ul class="list-disc pl-4 space-y-1.5 text-info-600/80 dark:text-info-400/80 leading-relaxed">
                <li><strong class="font-medium text-info-700 dark:text-info-300">PNG:</strong> Best for logos &amp; transparent images</li>
                <li><strong class="font-medium text-info-700 dark:text-info-300">JPEG:</strong> Best for photos &amp; smaller sizes</li>
                <li><strong class="font-medium text-info-700 dark:text-info-300">WebP:</strong> Modern, ultra-efficient compression</li>
              </ul>
            </div>
            
          </div>
        </template>
      </ImgStudio>
    </ClientOnly>
  </div>
</template>
