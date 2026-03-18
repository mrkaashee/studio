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
  <ImgToolPage
    title="Privacy Blur & Pixelate"
    description="Quickly hide sensitive information in your photos using blur or pixelation."
    icon="i-lucide-shield-alert">
    <template #default="{ img }">
      <div class="absolute inset-0 h-full w-full">
        <ClientOnly>
          <ImgStudio
            ref="editorRef"
            :src="img"
            borderless>
            <template #header>
              <div class="hidden" />
            </template>
            <template #default>
              <ImgCensor :censor-state="censorState" />
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
      <div class="space-y-6">
        <!-- Tool Controls -->
        <div class="bg-elevated p-6 rounded-xl border border-muted space-y-4">
          <h3 class="font-semibold text-sm flex items-center gap-2">
            <UIcon name="i-lucide-settings-2" />
            Censor Settings
          </h3>

          <div class="space-y-4">
            <div class="grid grid-cols-2 gap-2">
              <UButton
                label="Blur"
                :color="mode === 'blur' ? 'primary' : 'neutral'"
                :variant="mode === 'blur' ? 'solid' : 'outline'"
                size="xs"
                block
                @click="mode = 'blur'" />
              <UButton
                label="Pixelate"
                :color="mode === 'pixelate' ? 'primary' : 'neutral'"
                :variant="mode === 'pixelate' ? 'solid' : 'outline'"
                size="xs"
                block
                @click="mode = 'pixelate'" />
            </div>

            <div class="space-y-3 pt-2">
              <div class="flex items-center justify-between">
                <span class="text-[10px] text-muted uppercase font-bold tracking-tight">Censor Type</span>
                <div class="flex items-center gap-2">
                  <span class="text-[10px] text-muted">{{ useArea ? 'Selective' : 'Full Image' }}</span>
                  <USwitch
                    v-model="useArea"
                    size="xs" />
                </div>
              </div>

              <div class="space-y-1.5">
                <div class="flex justify-between text-[10px] text-muted uppercase font-bold tracking-tight">
                  <span>Intensity</span>
                  <span>{{ intensity }}</span>
                </div>
                <USlider
                  v-model="intensity"
                  :min="1"
                  :max="50"
                  size="sm" />
              </div>

              <UButton
                v-if="useArea"
                label="Clear Selections"
                icon="i-lucide-refresh-cw"
                variant="ghost"
                color="neutral"
                size="xs"
                block
                @click="resetSelection" />
            </div>

            <UButton
              label="Apply Censoring"
              icon="i-lucide-check"
              color="primary"
              block
              class="mt-4"
              @click="applyCensoring" />
          </div>
        </div>

        <div class="bg-elevated p-6 rounded-xl border border-muted space-y-4">
          <h3 class="font-semibold text-sm">
            Privacy Tips
          </h3>
          <ul class="text-xs text-muted space-y-2 list-disc pl-4">
            <li>Choose between "Blur" for a soft hide or "Pixelate" for digital censoring.</li>
            <li>Adjust the "Intensity" slider to control how much is hidden.</li>
            <li>Toggle "Censor Area" to protect specific parts or the whole image.</li>
          </ul>
        </div>

        <div class="p-6 rounded-xl space-y-2 bg-info/5 border border-info/20 text-xs text-info/80">
          <p class="font-semibold text-info flex items-center gap-1">
            <UIcon name="i-lucide-shield-check" />
            Secure Processing
          </p>
          <p>Your images are processed locally in your browser and are never uploaded to our servers.</p>
        </div>
      </div>
    </template>
  </ImgToolPage>
</template>
