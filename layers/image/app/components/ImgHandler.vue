<script setup lang="ts">
import { inject, computed } from 'vue'
import type { ImgHandlerProps, ImageEditorContext } from '../types/editor'

const props = defineProps<ImgHandlerProps>()

const imgStudio = inject<ImageEditorContext>('imgStudio')
const handlerCfg = computed(() => imgStudio?.handlerCfg?.value ?? null)

const cursorMap = {
  'top-left': 'nw-resize',
  'top-right': 'ne-resize',
  'bottom-left': 'sw-resize',
  'bottom-right': 'se-resize',
  top: 'n-resize',
  bottom: 's-resize',
  left: 'w-resize',
  right: 'e-resize',
}

const posClasses = {
  'top-left': '-top-3 -left-3',
  'top-right': '-top-3 -right-3',
  'bottom-left': '-bottom-3 -left-3',
  'bottom-right': '-bottom-3 -right-3',
  top: '-top-3 left-1/2 -translate-x-1/2',
  bottom: '-bottom-3 left-1/2 -translate-x-1/2',
  left: '-left-3 top-1/2 -translate-y-1/2',
  right: '-right-3 top-1/2 -translate-y-1/2',
}

const sizeClasses = {
  sm: 'w-2 h-2',
  md: 'w-2.5 h-2.5',
  lg: 'w-3.5 h-3.5',
}

const dotSizeClass = computed(() => sizeClasses[handlerCfg.value?.size ?? 'md'])

const dotStyle = computed(() => {
  const cfg = handlerCfg.value
  if (!cfg?.color && !cfg?.borderColor) return undefined
  return {
    ...(cfg.color ? { backgroundColor: cfg.color } : {}),
    ...(cfg.borderColor ? { borderColor: cfg.borderColor } : {}),
  }
})
</script>

<template>
  <div
    class="absolute w-6 h-6 flex items-center justify-center pointer-events-auto z-50 hover:scale-110"
    :class="[posClasses[position], { 'group is-active': active }, handlerCfg?.class]"
    :style="{ cursor: cursorMap[position] }">
    <!-- Inner Dot -->
    <div
      :class="['rounded-xs border-[1.5px] border-inverted relative z-10 shadow-sm',
               'group-hover:bg-primary group-hover:border-white group-hover:rounded-full',
               '[.group.is-active_&]:bg-primary [.group.is-active_&]:border-white [.group.is-active_&]:shadow-[0_0_10_rgba(var(--color-primary-500),0.5)]',
               dotSizeClass, handlerCfg?.color ? '' : 'bg-white']"
      :style="dotStyle" />

    <!-- Glow Effect -->
    <div
      class="absolute inset-0 bg-[radial-gradient(circle,--theme(--color-primary-500/0.4)_0%,transparent_70%)] opacity-0 pointer-events-none
             group-hover:opacity-100" />
  </div>
</template>
