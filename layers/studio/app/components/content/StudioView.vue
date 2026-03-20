<script setup lang="ts">
import { reactive, computed, ref, watch } from 'vue'

const props = defineProps<{
  name?: 'grid' | 'editor' | 'cropper' | 'transform' | 'transformations' | 'filters' | 'adjustments' | 'resize' | 'compress' | 'convert' | 'zoom-demo' | 'example-grid' | 'avatar-custom' | 'avatar-editor' | 'banner-editor' | 'modal-editor' | 'img-studio' | 'img-cropper' | ''
  src?: string
  // For grids
  tools?: any[]
  examples?: any[]
  // For specific tool overrides
  props?: any
}>()

const { tools: allTools } = useToolsList()

// Filter tools for the 'Image' category if name is 'grid'
const imageTools = computed(() => {
  return allTools.filter(t => t.category.label === 'Image')
})

// Specific ImgStudio prop sets based on 'name'
const toolConfigs: Record<string, any> = {
  editor: { censor: true, annotate: true, aspect: true, layers: true, cropper: true, filter: true, transform: true, resize: true, preview: true },
  cropper: { cropper: true, activeTool: 'cropper' },
  'avatar-editor': { cropper: { shape: 'circle', initialCropPercent: 100 }, stencil: { fixed: true, type: 'circle' }, activeTool: 'cropper' },
  'banner-editor': { cropper: { aspectRatio: 16 / 9, initialCropPercent: 88 }, stencil: { fixed: true }, activeTool: 'cropper' },
  'img-studio': { censor: true, annotate: true, aspect: true, layers: true, cropper: true, filter: true, transform: true, resize: true, preview: true },
}

const resolvedBaseProps = computed(() => {
  const config = toolConfigs[props.name || ''] || {}
  return {
    src: props.src || 'https://images.pexels.com/photos/4323307/pexels-photo-4323307.jpeg',
    ...config,
    ...props.props
  }
})

// --- Playground State ---
const showControls = ref(false)
const playground = reactive({
  toolbarVariant: 'sidebar' as any,
  toolbarPosition: 'right' as any,
  stencilType: 'rect' as any,
  stencilFixed: false,
  stencilAspectRatio: 1,
  canvasMode: 'image' as any,
})

// Sync playground with initial props when name/props change
watch(resolvedBaseProps, val => {
  if (val.toolbar?.variant) playground.toolbarVariant = val.toolbar.variant
  if (val.toolbar?.position) playground.toolbarPosition = val.toolbar.position
  if (val.stencil?.type) playground.stencilType = val.stencil.type
  if (val.stencil?.fixed !== undefined) playground.stencilFixed = val.stencil.fixed
  if (val.stencil?.aspectRatio) playground.stencilAspectRatio = val.stencil.aspectRatio
  if (val.mode) playground.canvasMode = val.mode
}, { immediate: true })

const mergedProps = computed(() => {
  const base = resolvedBaseProps.value
  return {
    ...base,
    mode: playground.canvasMode,
    toolbar: {
      ...(typeof base.toolbar === 'object' ? base.toolbar : {}),
      variant: playground.toolbarVariant,
      position: playground.toolbarPosition
    },
    stencil: {
      ...(typeof base.stencil === 'object' ? base.stencil : {}),
      type: playground.stencilType,
      fixed: playground.stencilFixed,
      aspectRatio: Number(playground.stencilAspectRatio)
    }
  }
})

const toolbarVariants = [
  { label: 'Sidebar', value: 'sidebar' },
  { label: 'Floating', value: 'floating' },
  { label: 'Bottom Bar', value: 'bottom' },
  { label: 'Ghost', value: 'ghost' }
]

const toolbarPositions = [
  { label: 'Right', value: 'right' },
  { label: 'Left', value: 'left' },
  { label: 'Top', value: 'top' },
  { label: 'Bottom', value: 'bottom' }
]

const stencilTypes = [
  { label: 'Rectangle', value: 'rect' },
  { label: 'Circle', value: 'circle' }
]

const canvasModes = [
  { label: 'High Fidelity (Image)', value: 'image' },
  { label: 'Pixel Buffer (Canvas)', value: 'canvas' }
]
</script>

<template>
  <div class="studio-view w-full h-full min-w-0 flex flex-col gap-6">
    <!-- Tools Grid -->
    <div v-if="name === 'grid'" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 py-6">
      <UCard v-for="tool in (tools || imageTools)" :key="tool.label" class="hover:ring-2 hover:ring-primary-500/50 transition-all cursor-pointer" @click="navigateTo(tool.to)">
        <template #header>
          <div class="flex items-center gap-3">
            <UIcon :name="tool.icon" class="w-6 h-6 text-primary" />
            <span class="font-bold">{{ tool.label }}</span>
          </div>
        </template>
        <p class="text-sm text-muted">
          {{ tool.description }}
        </p>
      </UCard>
    </div>

    <!-- Examples Grid -->
    <div v-else-if="name === 'example-grid'" class="grid grid-cols-1 md:grid-cols-2 gap-6 py-6">
      <UCard v-for="example in examples" :key="example.title" class="hover:ring-2 hover:ring-primary-500/50 transition-all cursor-pointer" @click="navigateTo(example.to)">
        <template #header>
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <span class="text-2xl">{{ example.icon }}</span>
              <span class="font-bold">{{ example.title }}</span>
            </div>
            <UBadge v-if="example.badge" size="xs" variant="subtle">
              {{ example.badge }}
            </UBadge>
          </div>
        </template>
        <p class="text-sm text-muted">
          {{ example.description }}
        </p>
      </UCard>
    </div>

    <!-- Actual Tool (ImgStudio) -->
    <template v-else>
      <div class="flex items-center justify-between px-1">
        <div class="flex items-center gap-2">
          <UBadge color="primary" variant="subtle" size="sm" class="font-mono uppercase tracking-wider">
            {{ name || 'Preview' }}
          </UBadge>
          <span class="text-xs text-muted">Interactive Showcase</span>
        </div>
        <UButton
          :label="showControls ? 'Close Inspector' : 'Property Inspector'"
          :icon="showControls ? 'i-lucide-chevron-up' : 'i-lucide-settings-2'"
          variant="ghost"
          color="neutral"
          size="sm"
          @click="showControls = !showControls" />
      </div>

      <Transition
        enter-active-class="transition-all duration-300 ease-out"
        enter-from-class="opacity-0 -translate-y-4"
        leave-active-class="transition-all duration-200 ease-in"
        leave-to-class="opacity-0 -translate-y-4">
        <div v-if="showControls" class="grid grid-cols-1 md:grid-cols-3 gap-6 p-6 bg-default border border-default rounded-2xl shadow-sm">
          <div class="space-y-4">
            <h4 class="text-xs font-bold uppercase tracking-widest text-muted">
              Layout & Toolbar
            </h4>
            <UFormField label="Toolbar Variant" size="sm">
              <USelect v-model="playground.toolbarVariant" :items="toolbarVariants" class="w-full" />
            </UFormField>
            <UFormField label="Toolbar Position" size="sm">
              <USelect v-model="playground.toolbarPosition" :items="toolbarPositions" class="w-full" />
            </UFormField>
          </div>

          <div class="space-y-4 border-l border-default pl-6 max-md:border-l-0 max-md:pl-0">
            <h4 class="text-xs font-bold uppercase tracking-widest text-muted">
              Stencil configuration
            </h4>
            <div class="flex items-center justify-between">
              <span class="text-sm">Fixed Stencil Mode</span>
              <USwitch v-model="playground.stencilFixed" />
            </div>
            <UFormField label="Stencil Shape" size="sm">
              <USelect v-model="playground.stencilType" :items="stencilTypes" class="w-full" />
            </UFormField>
            <UFormField label="Aspect Ratio" size="sm">
              <UInput v-model="playground.stencilAspectRatio" type="number" step="0.1" class="w-full" />
            </UFormField>
          </div>

          <div class="space-y-4 border-l border-default pl-6 max-md:border-l-0 max-md:pl-0">
            <h4 class="text-xs font-bold uppercase tracking-widest text-muted">
              System & Core
            </h4>
            <UFormField label="Rendering Mode" size="sm">
              <USelect v-model="playground.canvasMode" :items="canvasModes" class="w-full" />
            </UFormField>
            <div class="pt-4">
              <UButton
                label="Reset Defaults"
                variant="subtle"
                color="neutral"
                block
                size="sm"
                @click="Object.assign(playground, { toolbarVariant: 'sidebar', toolbarPosition: 'right', stencilType: 'rect', stencilFixed: false, stencilAspectRatio: 1, canvasMode: 'image' })" />
            </div>
          </div>
        </div>
      </Transition>

      <div class="relative w-full aspect-square max-h-160 border border-default rounded-2xl overflow-hidden shadow-2xl bg-black/5 group">
        <ImgStudio v-bind="mergedProps" class="absolute inset-0 w-full h-full" />
      </div>
    </template>
  </div>
</template>
