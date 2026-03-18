<script lang="ts" setup>
import { ref, watch } from 'vue'

const editorRef = ref<any>(null)

const {
  setSource,
  convertedBlob,
  convertedImageUrl,
  isConverting,
} = useImageConvert()

// Watch for file uploads from the studio
watch(() => editorRef.value?.sourceFile, file => {
  if (file && editorRef.value?.imageRef) {
    // For SVG converter, we assume the input is SVG if we are on this page
    setSource(editorRef.value.imageRef, file.type || 'image/svg+xml')
  }
})

// Update the studio canvas with the converted result for preview
watch(convertedImageUrl, url => {
  if (url && editorRef.value) {
    editorRef.value.updateCanvas(url, true)
  }
})

const downloadImage = () => {
  if (!convertedBlob.value) return
  const url = URL.createObjectURL(convertedBlob.value)
  const a = document.createElement('a')
  a.href = url
  a.download = 'converted-svg.png'
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
        mode="image">
        <template #header>
          <div class="flex items-center justify-between px-4 py-3 border-b border-default bg-elevated z-10 w-full relative">
            <div class="flex items-center gap-3">
              <div class="p-2 border border-primary/20 bg-primary/10 rounded-lg text-primary">
                <UIcon
                  name="i-lucide-file-image"
                  class="size-5" />
              </div>
              <div>
                <h1 class="font-bold tracking-tight text-sm">
                  SVG to PNG Converter
                </h1>
                <p class="text-[10px] text-muted hidden sm:block">
                  High-quality conversion of SVG vector files to PNG images.
                </p>
              </div>
            </div>

            <div class="flex gap-2">
              <UButton
                label="Download PNG"
                icon="i-lucide-download"
                color="primary"
                size="sm"
                :disabled="!convertedBlob || isConverting"
                :loading="isConverting"
                @click="downloadImage" />
            </div>
          </div>
        </template>

        <template #default>
          <div class="p-4 space-y-6 pb-20 max-h-full overflow-y-auto custom-scrollbar">
            <div class="space-y-4">
              <h3 class="font-bold text-[10px] uppercase tracking-widest text-muted flex items-center gap-2 px-1">
                <UIcon name="i-lucide-info" />
                About SVG Conversion
              </h3>
              <div class="bg-elevated border border-default rounded-xl p-4">
                <p class="text-[11px] text-muted leading-relaxed">
                  Vector images (SVG) are mathematically defined and can be scaled infinitely.
                  This tool renders your SVG onto a high-resolution canvas to generate a pixel-perfect PNG image.
                </p>
              </div>
            </div>

            <div class="p-4 rounded-xl space-y-2 bg-info/5 border border-info/20 text-[11px] text-info/90">
              <p class="font-bold text-info flex items-center gap-1 uppercase tracking-wider text-[10px]">
                <UIcon
                  name="i-lucide-zap"
                  class="size-3.5" />
                Pro Tip
              </p>
              <p>
                Need a specific size? Use our
                <NuxtLink
                  to="/image/resizer"
                  class="text-info underline font-medium">
                  Image Resizer
                </NuxtLink>
                after converting to PNG.
              </p>
            </div>

            <Transition
              enter-active-class="transition duration-300 ease-out"
              enter-from-class="transform translate-y-2 opacity-0"
              enter-to-class="transform translate-y-0 opacity-100"
              leave-active-class="transition duration-200 ease-in"
              leave-from-class="transform translate-y-0 opacity-100"
              leave-to-class="transform translate-y-2 opacity-0"
            >
              <div
                v-if="isConverting"
                class="flex items-center gap-2 px-3 py-2 bg-primary/10 border border-primary/20 rounded-lg text-[10px] font-bold text-primary uppercase tracking-wider">
                <UIcon
                  name="i-lucide-loader-2"
                  class="animate-spin" />
                Rendering high-res PNG...
              </div>
            </Transition>
          </div>
        </template>
      </ImgStudio>
    </ClientOnly>
  </div>
</template>
