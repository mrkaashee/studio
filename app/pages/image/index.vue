<script lang="ts" setup>
import { ref } from 'vue'
import type { AspectPreset, CropResult } from '~/components/img/types'
import ImgStudio from '~/components/img/ImgStudio.vue'

const activeTool2 = ref<'crop' | 'none'>('crop')
const activeTool3 = ref<'crop' | 'none'>('crop')
const activeTool4 = ref<'crop' | 'none'>('crop')

const src1 = ref('https://picsum.photos/id/237/800/600')
const src2 = ref('https://picsum.photos/id/1015/800/600')
const src3 = ref('https://picsum.photos/id/1025/800/600')
const src4 = ref('https://picsum.photos/id/1035/800/600')

const presets: AspectPreset[] = [
  { label: 'Free', value: null },
  { label: 'Square (1:1)', value: 1 },
  { label: 'Video (16:9)', value: 16 / 9 },
  { label: 'Portrait (9:16)', value: 9 / 16 },
  { label: 'Photo (4:3)', value: 4 / 3 }
]

function onCropApply(res: CropResult) {
  console.log('Crop applied', res.dataUrl.substring(0, 30) + '...')
}

function onCropCancel() {
  console.log('Crop cancelled')
}

function onReset() {
  console.log('Studio reset')
}
</script>

<template>
  <UMain>
    <UContainer class="py-10 space-y-6">
      <div>
        <h1 class="text-2xl font-bold mb-2">
          Image Studio Component
        </h1>
        <p class="text-gray-500 mb-6">
          Testing the fresh ImgStudio component root with props, emits, and slots.
        </p>
      </div>

      <div class="grid grid-cols-1 xl:grid-cols-2 gap-8">
        <!-- 1. Standard Instance -->
        <div class="space-y-4">
          <h2 class="text-xl font-semibold">
            1. Standard Studio
          </h2>
          <ImgStudio
            v-model:src="src1"
            :crop="true"
            :crop-presets="presets"
            @crop:apply="onCropApply"
            @crop:cancel="onCropCancel"
            @reset="onReset">
            <template #toolbar>
              <div class="text-[0.6rem] text-center text-gray-500 mt-2 mb-1">
                Extras
              </div>
              <UButton icon="i-lucide-wand-2" color="neutral" variant="ghost" square />
              <UButton icon="i-lucide-download" color="neutral" variant="ghost" square />
            </template>
            <template #actions>
              <UButton
                label="Save Standard"
                color="primary"
                variant="solid"
                :disabled="!src1"
                icon="i-lucide-save" />
            </template>
          </ImgStudio>
        </div>

        <!-- 2. Fixed Cropper Instance -->
        <div class="space-y-4">
          <h2 class="text-xl font-semibold">
            2. Fixed 16:9 Cropper
          </h2>
          <ImgStudio
            v-model:src="src2"
            v-model:active-tool="activeTool2"
            :crop="true"
            :crop-aspect="16/9"
            @crop:apply="onCropApply"
            @crop:cancel="onCropCancel"
            @reset="onReset">
            <template #actions>
              <UButton
                label="Apply & Save"
                color="primary"
                variant="solid"
                :disabled="!src2"
                icon="i-lucide-check" />
            </template>
          </ImgStudio>
        </div>

        <!-- 3. WhatsApp Profile Picture Style (Draggable) -->
        <div class="space-y-4">
          <h2 class="text-xl font-semibold">
            3. Profile Picture (Draggable)
          </h2>
          <ImgStudio
            v-model:src="src3"
            v-model:active-tool="activeTool3"
            :crop="true"
            crop-shape="round"
            @crop:apply="onCropApply"
            @crop:cancel="onCropCancel"
            @reset="onReset">
            <template #actions>
              <UButton
                label="Set Profile Picture"
                color="primary"
                variant="solid"
                :disabled="!src3"
                icon="i-lucide-user" />
            </template>
          </ImgStudio>
        </div>

        <!-- 4. Fixed Circular Cropper (WhatsApp Style) -->
        <div class="space-y-4">
          <h2 class="text-xl font-semibold">
            4. Fixed DP Cropper (WhatsApp)
          </h2>
          <ImgStudio
            v-model:src="src4"
            v-model:active-tool="activeTool4"
            :crop="true"
            crop-shape="round"
            fixed-crop
            @crop:apply="onCropApply"
            @crop:cancel="onCropCancel"
            @reset="onReset">
            <template #actions>
              <UButton
                label="Apply Fixed DP"
                color="primary"
                variant="solid"
                :disabled="!src4"
                icon="i-lucide-check-circle" />
            </template>
          </ImgStudio>
        </div>
      </div>
    </UContainer>
  </UMain>
</template>
