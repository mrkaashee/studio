<script lang="ts" setup>
const { tools } = useToolsList()
</script>

<template>
  <UHeader title="Tools">
    <UNavigationMenu :items="tools" />
    <template #right>
      <UColorModeButton />
    </template>
    <template #bottom>
      <USeparator class="hidden lg:flex" />
      <UContainer class="hidden lg:flex items-center justify-between">
        <!-- <UNavigationMenu :items="tools" class="-mx-2.5 -mb-px" /> -->
      </UContainer>
    </template>
  </UHeader>
</template>
