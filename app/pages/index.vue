<script lang="ts" setup>
const { tools } = useToolsList()

const categories = computed(() => {
  const map = new Map<string, typeof tools>()
  for (const tool of tools) {
    const cat = tool.category.label
    if (!map.has(cat)) map.set(cat, [])
    map.get(cat)!.push(tool)
  }
  return map
})
</script>

<template>
  <UMain>
    <UContainer class="py-10 space-y-12">
      <div v-for="[category, categoryTools] in categories" :key="category">
        <div class="flex items-center gap-2 mb-6">
          <UIcon :name="categoryTools[0]!.category.icon" class="size-5 text-primary" />
          <h2 class="text-lg font-semibold">
            {{ category }}
          </h2>
          <UBadge :label="categoryTools.length.toString()" variant="soft" size="sm" />
        </div>
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <UPageCard
            v-for="tool in categoryTools"
            :key="tool.label"
            :icon="tool.icon"
            :title="tool.label"
            :description="tool.description"
            variant="subtle" />
        </div>
      </div>
    </UContainer>
  </UMain>
</template>
