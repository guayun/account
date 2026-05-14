<script setup>
import data from '../content/data.json'
const { start, finish } = useLoadingIndicator()
definePageMeta({
  colorMode: 'system'
})
useSeoMeta({
  titleTemplate: '%s - 呱呱云账号',
  description: data.hero.description
})
useRouter().beforeEach(() => {
  start({ force: true })
})
useRouter().afterEach(() => {
  finish()
})
/* useHead({
  script: [
    {
      src: 'https://cloud.umami.is/script.js',
      defer: true,
      'data-website-id': '2c4f5748-15e6-48dc-804b-eb3262c2fda0'
    }
  ]
}) */
</script>

<template>
  <NuxtLoadingIndicator color="#1890ff" />
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>