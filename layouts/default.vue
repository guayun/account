<script lang="ts" setup>
import type { NavItem } from '@nuxt/content'
import data from '../content/data.json'

const head = data.head
const foot = data.foot
</script>

<template>
  <UHeader :links="head.navigations">
    <template #logo>
      {{ head.name }}
      <UBadge :label="head.slogan" variant="subtle" class="mb-0.5" />
    </template>
    <template #right>
      <UButton :label="head.signup.label" class="hidden md:block" :to="head.signup.to" :target="head.signup.target" />
      <UButton :label="head.signin.label" class="hidden md:block" color="gray" :to="head.signin.to" :target="head.signup.target" />
    </template>
    <template #panel>
      <UNavigationTree :links="mapContentNavigation(head.navigations)" default-open :multiple="false" />
    </template>
  </UHeader>
  <slot />
  <footer>
    <div class="container mx-auto px-4 lg:px-8 xl:max-w-7xl pb-5 lg:pb-10">
      <div class="my-14 h-px w-full border-t border-dashed border-gray-200 dark:border-gray-800" />
      <div class="grid grid-cols-2 gap-12 sm:grid-cols-2 lg:grid-cols-4 lg:gap-4 xl:gap-20">
        <div class="flex flex-col gap-12" v-for="item in foot.navigations">
          <div class="space-y-6">
            <h4 class="text-xs font-bold tracking-wider text-secondary-900 uppercase dark:text-secondary-50">{{ item.title }}</h4>
            <nav class="flex flex-col items-start gap-4 text-sm/relaxed">
              <a v-for="item in item.navigations" class="font-medium text-secondary-500 hover:text-primary-500 dark:text-secondary-400 dark:hover:text-primary-400" :href="item.to" :target="item.target">{{ item.name }}</a>
            </nav>
          </div>
        </div>
      </div>
      <div class="mt-14 mb-10 h-px w-full border-t border-dashed border-gray-200 dark:border-gray-800" />
      <div class="flex flex-col items-center gap-6 text-center text-sm">
        <div class="text-secondary-900 dark:text-secondary-50">&copy;<span class="font-medium">{{ foot.copyright }}</span></div>
      </div>
    </div>
  </footer>
</template>