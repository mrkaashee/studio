<script lang="ts" setup>
import { ref, watch } from 'vue'

const editorRef = ref<any>(null)

const {
  quality,
  format,
  originalSize,
  compressedSize,
  compressedBlob,
  compressedImageUrl,
  isCompressing,
  compressionRatio,
  setSource,
} = useImageCompress()

// Feed the original uploaded file into the compressor
watch(() => editorRef.value?.sourceFile, file => {
  if (file && editorRef.value?.imageRef) {
    setSource(editorRef.value.imageRef, file.size)
  }
})

// Update the ImgStudio canvas live without triggering history commits
watch(compressedImageUrl, url => {
  if (url && editorRef.value) {
    editorRef.value.updateCanvas(url, true)
  }
})

const downloadImage = () => {
  if (!compressedBlob.value) return
  const url = URL.createObjectURL(compressedBlob.value)
  const a = document.createElement('a')
  a.href = url

  const extMap: Record<string, string> = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp'
  }
  const ext = extMap[format.value] || '.jpg'

  a.download = `optimized-image${ext}`
  a.click()
  URL.revokeObjectURL(url)
}

const formatSize = (bytes: number) => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}
</script>

<template>
  <div class="h-[calc(100vh-var(--header-top-height,64px))] w-full flex flex-col bg-background relative">
    <ClientOnly>
      <ImgStudio
        ref="editorRef"
        borderless
        mode="image">
        <template #header>
          <div class="flex items-center justify-between px-4 py-1.5 border-b border-default bg-elevated z-10">
            <div class="flex items-center gap-2">
              <div class="p-1.5 border border-primary/20 bg-primary/10 rounded-lg text-primary">
                <UIcon name="i-lucide-shrink" class="size-5" />
              </div>
              <div>
                <h1 class="font-bold tracking-tight text-sm">
                  Image Compressor
                </h1>
                <p class="text-[10px] text-muted hidden sm:block">
                  Reduce image file size with intelligent optimization and high-fidelity results.
                </p>
              </div>
            </div>

            <div class="flex gap-2">
              <UButton
                label="Download Optimized Image"
                icon="i-lucide-download"
                color="primary"
                size="sm"
                :disabled="!compressedBlob"
                @click="downloadImage" />
            </div>
          </div>

          <!-- Loading overlay for the whole canvas area when compressing -->
          <div
            v-if="isCompressing"
            class="absolute inset-0 top-[64px] z-20 flex items-center justify-center bg-background/50 backdrop-blur-sm pointer-events-none transition-opacity duration-300">
            <div class="bg-elevated border border-default p-4 rounded-xl shadow-2xl flex items-center gap-3">
              <UIcon name="i-lucide-loader-2" class="size-5 animate-spin text-primary" />
              <span class="text-sm font-semibold tracking-wide">Optimizing...</span>
            </div>
          </div>
        </template>

        <template #default>
          <div class="p-4 space-y-6 pb-20">
            <div class="space-y-4">
              <h3 class="font-bold text-xs uppercase tracking-widest text-muted flex items-center gap-2 px-1">
                <UIcon name="i-lucide-settings-2" />
                Compression &amp; Format
              </h3>

              <div class="space-y-2 px-1">
                <div class="flex justify-between text-[11px] font-semibold text-muted">
                  <span>Quality</span>
                  <span>{{ quality }}%</span>
                </div>
                <USlider v-model="quality" :min="1" :max="100" size="sm" />
                <div class="flex justify-between text-[10px] text-muted font-medium">
                  <span>Smaller File</span>
                  <span>Better Quality</span>
                </div>
              </div>

              <div class="space-y-2 pt-2 px-1">
                <div class="text-[11px] font-semibold text-muted">
                  Output Format
                </div>
                <USelect
                  v-model="format"
                  :items="[
                    { label: 'JPEG (Recommended)', value: 'image/jpeg' },
                    { label: 'WebP (Ultra Efficient)', value: 'image/webp' },
                    { label: 'PNG (Lossless)', value: 'image/png' },
                  ]"
                  value-attribute="value"
                  size="sm" />
              </div>
            </div>

            <UDivider class="my-4" />

            <!-- Results Panel -->
            <div class="space-y-4">
              <h3 class="font-bold text-[10px] uppercase tracking-widest text-muted flex items-center gap-2 px-1">
                <UIcon name="i-lucide-bar-chart-2" />
                Results
              </h3>

              <div class="bg-elevated border border-default p-4 rounded-xl space-y-4">
                <div class="space-y-2">
                  <div class="flex justify-between text-xs">
                    <span class="text-muted font-medium">Original</span>
                    <span class="font-bold">{{ formatSize(originalSize) }}</span>
                  </div>
                  <div class="flex justify-between text-xs">
                    <span class="text-muted font-medium">Compressed</span>
                    <span class="font-bold text-primary">{{ formatSize(compressedSize) }}</span>
                  </div>
                </div>

                <div class="space-y-1">
                  <div class="h-2 w-full bg-muted rounded-full overflow-hidden">
                    <div
                      class="h-full bg-primary transition-all duration-500 ease-out"
                      :style="{ width: `${compressionRatio}%` }" />
                  </div>
                  <div class="flex justify-center pt-1">
                    <p class="text-[10px] text-primary font-bold uppercase tracking-wider">
                      Reduced by {{ compressionRatio }}%
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </template>
      </ImgStudio>
    </ClientOnly>
  </div>
</template>
