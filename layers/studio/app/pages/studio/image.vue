<script setup lang="ts">
import { reactive, computed, ref } from 'vue'

definePageMeta({
  layout: 'studio'
})

const route = useRoute()
const { data: navigation } = await useAsyncData('navigation', () => queryCollectionNavigation('content'))
const rootNavigation = computed(() =>
  navigation.value
    ?.find(ni => ni.path.startsWith('/studio'))
    ?.children?.filter(ni => ni.path != '/studio')
)

// --- Master Playground State ---
const studio = reactive({
  src: 'https://images.pexels.com/photos/4323307/pexels-photo-4323307.jpeg',
  mode: 'image' as 'image' | 'canvas',
  // Feature Toggles
  features: {
    cropper: true,
    filter: true,
    annotate: true,
    censor: true,
    resize: true,
    transform: true,
    layers: true,
    preview: true,
    aspect: true
  },
  // UI Configuration
  ui: {
    toolbarVariant: 'sidebar' as 'sidebar' | 'floating' | 'bottom' | 'ghost',
    toolbarPosition: 'right' as 'left' | 'right' | 'top' | 'bottom',
    canvasBoard: true,
    canvasBorder: true,
    floatingBar: true
  },
  // Stencil Configuration
  stencil: {
    type: 'rect' as 'rect' | 'circle',
    fixed: false,
    aspectRatio: 1,
    cropPercent: 100
  }
})

const activeTool = ref<string | null>(null)

// Map reactive studio state to ImgStudio props
const studioProps = computed(() => ({
  src: studio.src,
  mode: studio.mode,
  ...studio.features,
  toolbar: {
    variant: studio.ui.toolbarVariant,
    position: studio.ui.toolbarPosition
  },
  canvas: {
    board: studio.ui.canvasBoard,
    border: studio.ui.canvasBorder
  },
  floatingBar: {
    hide: !studio.ui.floatingBar
  },
  stencil: {
    type: studio.stencil.type,
    fixed: studio.stencil.fixed,
    aspectRatio: Number(studio.stencil.aspectRatio),
    cropPercent: Number(studio.stencil.cropPercent)
  }
}))

const toolbarVariants = [
  { label: 'Sidebar (Standard)', value: 'sidebar' },
  { label: 'Floating (Overlay)', value: 'floating' },
  { label: 'Bottom (Mobile)', value: 'bottom' },
  { label: 'Ghost (Minimal)', value: 'ghost' }
]

const canvasModes = [
  { label: 'High Fidelity (Image)', value: 'image' },
  { label: 'Pixel Buffer (Canvas)', value: 'canvas' }
]
</script>

<template>
  <UDashboardSidebar resizable>
    <div class="space-y-8 ">
      <section class="space-y-4">
        <h3 class="text-xs font-bold uppercase tracking-widest text-muted">
          Active Features
        </h3>
        <div class="grid grid-cols-1 gap-3">
          <UCheckbox v-model="studio.features.cropper" label="Cropper" />
          <UCheckbox v-model="studio.features.filter" label="Filters & Adjustments" />
          <UCheckbox v-model="studio.features.annotate" label="Annotation Engine" />
          <UCheckbox v-model="studio.features.censor" label="Censor (Blur/Pixel)" />
          <UCheckbox v-model="studio.features.resize" label="Resizer & Export" />
          <UCheckbox v-model="studio.features.transform" label="3D Transformations" />
          <!-- <UCheckbox v-model="studio.features.layers" label="Layer Manager" /> -->
          <UCheckbox v-model="studio.features.preview" label="Preview Assistant" />
          <UCheckbox v-model="studio.features.aspect" label="Aspect Ratio Presets" />
        </div>
      </section>

      <USeparator />

      <section class="space-y-4">
        <h3 class="text-xs font-bold uppercase tracking-widest text-muted">
          Interface Design
        </h3>
        <UFormField label="Toolbar Variant">
          <USelect v-model="studio.ui.toolbarVariant" :items="toolbarVariants" block />
        </UFormField>
        <div class="flex items-center justify-between">
          <span class="text-sm">Board</span>
          <USwitch v-model="studio.ui.canvasBoard" />
        </div>
        <div class="flex items-center justify-between">
          <span class="text-sm">Floating Bar</span>
          <USwitch v-model="studio.ui.floatingBar" />
        </div>
      </section>

      <USeparator />

      <section class="space-y-4">
        <h3 class="text-xs font-bold uppercase tracking-widest text-muted">
          Stencil Controls
        </h3>
        <div class="flex items-center justify-between">
          <span class="text-sm">Fixed (Zoom Image)</span>
          <USwitch v-model="studio.stencil.fixed" />
        </div>
        <UFormField label="Shape">
          <USelect v-model="studio.stencil.type" :items="[{ label: 'Rect', value: 'rect' }, { label: 'Circle', value: 'circle' }]" block />
        </UFormField>
        <UFormField label="Ratio">
          <UInput v-model="studio.stencil.aspectRatio" type="number" step="0.1" block />
        </UFormField>
      </section>
    </div>
    <template #footer>
      <UButton
        label="Reset Defaults"
        variant="soft"
        color="neutral"
        block
        icon="i-lucide-rotate-ccw"
        @click="Object.assign(studio, { })" />
    </template>
  </UDashboardSidebar>
  <UDashboardPanel>
    <template #body>
      <div class="h-[calc(100vh-140px)] flex flex-col gap-6 p-6">
        <div class="flex items-center justify-between shrink-0">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <UIcon name="i-lucide-construction" class="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 class="font-bold text-lg leading-tight text-highlighted">
                Image Studio Playground
              </h1>
              <p class="text-[10px] text-muted font-mono tracking-tighter uppercase">
                {{ studio.src.substring(0, 48) }}...
              </p>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <USelect v-model="studio.mode" :items="canvasModes" class="w-48" />
          </div>
        </div>

        <div class="flex-1 flex items-center justify-center min-h-0 bg-black/5 rounded-3xl border border-default overflow-hidden shadow-inner group ring-1 ring-default/50 p-8">
          <div
            :style="{ aspectRatio: studio.stencil.aspectRatio }"
            class="max-w-full max-h-full w-full h-full relative rounded-2xl overflow-hidden shadow-2xl transition-all duration-500 ease-in-out">
            <ImgStudio v-bind="studioProps" v-model:active-tool="activeTool" class="absolute inset-0 w-full h-full" />
          </div>
        </div>
      </div>
    </template>
  </UDashboardPanel>
</template>
