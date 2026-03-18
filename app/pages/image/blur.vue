<script lang="ts" setup>
import { ref, computed, watch } from 'vue'
import { useCensor } from '../../../layers/image/app/composables/useCensor'

const editorRef = ref<any>(null)

// Initialize Censor Logic at page level to ensure sidebar <-> interaction sync
const zoomLevel = computed(() => editorRef.value?.zoomLevel || 1)
const censorState = useCensor(zoomLevel)

const {
  mode,
  intensity,
  useArea,
  selections,
  getCensoredCanvas,
  initializeSelection,
  clearSelections
} = censorState

const downloadResult = async () => {
  if (editorRef.value) {
    await editorRef.value.applyAndExport('blurred-image.png')
  }
}

const applyCensoring = () => {
  if (!editorRef.value) return
  const canvas = editorRef.value.getCanvas()
  if (!canvas) return

  const tempCanvas = getCensoredCanvas(canvas)
  if (tempCanvas) {
    editorRef.value.commit(tempCanvas, 'censor')
    clearSelections()
  }
}

// Ensure the tool is activated and selection initialized when image loads
watch(() => editorRef.value?.hasImage, loaded => {
  if (loaded) {
    editorRef.value?.activateTool('censor')
    console.log('Blur Tool Page: Censor Tool Activated upon image load')

    const state = editorRef.value.getImageState()
    if (state?.width && state?.height && selections.value.length === 0) {
      initializeSelection(state.width, state.height)
    }
  }
}, { immediate: true })

const resetSelection = () => {
  if (!editorRef.value) return
  clearSelections()
  const state = editorRef.value.getImageState()
  if (state?.width && state?.height) {
    initializeSelection(state.width, state.height)
  }
}
</script>

<template>
  <div class="h-[calc(100vh-var(--header-top-height,64px))] w-full flex flex-col bg-background relative">
    <ClientOnly>
      <ImgStudio
        ref="editorRef"
        :censor="{ headless: true, state: censorState }"
        borderless
      >
        <template #header>
          <div class="flex items-center justify-between px-4 py-3 border-b border-default bg-elevated z-10 w-full relative">
            <div class="flex items-center gap-3">
              <div class="p-2 border border-primary/20 bg-primary/10 rounded-lg text-primary">
                <UIcon
                  name="i-lucide-shield-alert"
                  class="size-5"
                />
              </div>
              <div>
                <h1 class="font-bold tracking-tight text-sm">
                  Privacy Blur &amp; Pixelate
                </h1>
                <p class="text-[10px] text-muted">
                  Quickly hide sensitive information.
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
                @click="editorRef?.undo()"
              />
              <UButton
                label="Redo"
                icon="i-lucide-redo"
                variant="ghost"
                color="neutral"
                size="sm"
                :disabled="!editorRef?.canRedo"
                @click="editorRef?.redo()"
              />
              <UButton
                label="Export"
                icon="i-lucide-download"
                color="primary"
                size="sm"
                @click="downloadResult"
              />
            </div>
          </div>
        </template>

        <template #censor="{ censorProps }">
          <div class="space-y-6">
            <ImgCensor v-bind="censorProps" />

            <!-- Tool Controls -->
            <div class="space-y-4">
              <h3 class="font-bold text-xs uppercase tracking-widest text-muted flex items-center gap-2 px-1">
                <UIcon name="i-lucide-settings-2" />
                Censor Settings
              </h3>

              <div class="grid grid-cols-2 gap-2">
                <UButton
                  label="Blur"
                  :color="mode === 'blur' ? 'primary' : 'neutral'"
                  :variant="mode === 'blur' ? 'solid' : 'subtle'"
                  size="sm"
                  block
                  @click="mode = 'blur'"
                />
                <UButton
                  label="Pixelate"
                  :color="mode === 'pixelate' ? 'primary' : 'neutral'"
                  :variant="mode === 'pixelate' ? 'solid' : 'subtle'"
                  size="sm"
                  block
                  @click="mode = 'pixelate'"
                />
              </div>

              <div class="space-y-4 pt-2 px-1">
                <div class="flex items-center justify-between">
                  <span class="text-[11px] font-semibold text-muted">Censor Type</span>
                  <div class="flex items-center gap-2">
                    <span class="text-[10px] text-muted">
                      {{ useArea ? 'Selective' : 'Full Image' }}
                    </span>
                    <USwitch
                      v-model="useArea"
                      size="xs"
                    />
                  </div>
                </div>

                <div class="space-y-2">
                  <div class="flex justify-between text-[11px] font-semibold text-muted">
                    <span>Intensity</span>
                    <span>{{ intensity }}</span>
                  </div>
                  <USlider
                    v-model="intensity"
                    :min="1"
                    :max="50"
                    size="sm"
                  />
                </div>

                <UButton
                  v-if="useArea"
                  label="Clear Selections"
                  icon="i-lucide-refresh-cw"
                  variant="ghost"
                  color="neutral"
                  size="xs"
                  block
                  @click="resetSelection"
                />

                <UButton
                  v-if="selections.length > 0 || !useArea"
                  label="Apply Censoring"
                  icon="i-lucide-check"
                  color="primary"
                  block
                  class="mt-2"
                  @click="applyCensoring"
                />
              </div>
            </div>

            <UDivider class="my-4 opacity-50" />

            <div class="space-y-2 px-1">
              <h3 class="font-bold text-[10px] uppercase tracking-widest text-muted">
                Privacy Tips
              </h3>
              <ul class="text-[11px] text-muted space-y-2 list-disc pl-4 leading-relaxed">
                <li>Choose "Blur" for a soft hide or "Pixelate" for digital censoring.</li>
                <li>Adjust the "Intensity" slider to control how much is hidden.</li>
                <li>Toggle "Selective" to protect specific parts or the whole image.</li>
              </ul>
            </div>

            <div class="p-4 rounded-xl space-y-1 bg-info/5 border border-info/20 text-[11px] text-info/90">
              <p class="font-bold flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-info">
                <UIcon
                  name="i-lucide-shield-check"
                  class="size-4"
                />
                Secure Processing
              </p>
              <p class="leading-relaxed">
                Your images are processed locally in your browser and are never uploaded to our servers.
              </p>
            </div>
          </div>
        </template>
      </ImgStudio>
    </ClientOnly>
  </div>
</template>
