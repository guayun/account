<script setup lang="ts">
import data from '../content/data.json'

useHead({
  title: '首页'
})

const hero = data.hero
const sections = data.sections
const features = data.features
const cta = data.cta
</script>

<template>
  <div>
    <div class="absolute inset-0 landing-grid z-[-1] [mask-image:radial-gradient(100%_100%_at_top_right,white,transparent)]" />
    <ULandingHero :title="hero.name" :description="hero.description" :links="hero.actions" />
    <ULandingSection v-for="item in sections" :title="item.title" :description="item.description" :align="item.align" :features="item.features">
      <div class="bg-gray-900/5 dark:bg-white/5 ring-1 ring-inset ring-gray-900/10 dark:ring-white/10 rounded-xl lg:-m-4 p-4">
        <div class="aspect-w-16 aspect-h-9 rounded-lg relative overflow-hidden border border-dashed border-gray-900/10 dark:border-white/10">
          <img :src="item.img" alt="Image" class="absolute inset-0 h-full w-full object-cover" />
        </div>
      </div>
    </ULandingSection>
    <ULandingSection :title="features.title" :description="features.description">
      <UPageGrid>
        <ULandingCard v-for="item in features.items" v-bind="item" />
      </UPageGrid>
    </ULandingSection>
    <ULandingSection>
      <ULandingCTA v-bind="cta" class="bg-gray-100/50 dark:bg-gray-800/50" />
    </ULandingSection>
  </div>
</template>

<style scoped>
.landing-grid {
  background-size: 100px 100px;
  background-image:
    linear-gradient(to right, rgb(var(--color-gray-200)) 1px, transparent 1px),
    linear-gradient(to bottom, rgb(var(--color-gray-200)) 1px, transparent 1px);
}

.dark {
  .landing-grid {
    background-image:
      linear-gradient(to right, rgb(var(--color-gray-800)) 1px, transparent 1px),
      linear-gradient(to bottom, rgb(var(--color-gray-800)) 1px, transparent 1px);
  }
}
</style>