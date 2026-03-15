<script lang="ts" setup>
import type { NavigationMenuItem } from '@nuxt/ui'

const links: NavigationMenuItem[] = [
  { icon: '', label: 'Image', to: '' },
  { icon: '', label: 'PDF', to: '' },
]
</script>

<template>
  <UHeader title="Tools">
    <template #right>
      <UColorModeButton />
    </template>
    <template #bottom>
      <USeparator class="hidden lg:flex" />
      <UContainer class="hidden lg:flex items-center justify-between">
        <UNavigationMenu :items="links" variant="pill" highlight class="-mx-2.5 -mb-px" />
      </UContainer>
    </template>
  </UHeader>
</template>
