<script setup lang="ts">
import data from '~/content/data.json'
const head = data.head
const foot = data.foot

const route = useRoute()
const client_key = route.query.client_key
const redirect_uri = route.query.redirect_uri
const sub_title = computed(() => route.meta?.title || '')

const { data: application_info } = await useAsyncData('application_info', () =>
    $fetch('/api/v1/developers', {
        method: 'GET',
        params: { client_key, redirect_uri }
    })
)
if (application_info.value.status !== 20000) {
    useHead({
        title: '应用加载失败'
    })
}
</script>

<template>
    <div v-if="!application_info?.data" class="relative min-h-dvh w-full min-w-80 background bg-[url(https://tdesign.gtimg.com/site/images/breathe-top.png)]">
        <div class="absolute inset-0 backdrop-blur-lg z-0"></div>
        <main class="relative z-10 flex max-w-full flex-auto flex-col">
            <div class="mx-auto flex min-h-dvh w-full max-w-10xl items-center justify-center overflow-hidden p-4 lg:p-8">
                <section class="w-full max-w-xl py-6">
                    <header class="flex flex-col items-center justify-center text-center mb-10">
                        <img src="https://s3.hi168.com/hi168-25512-4716xkbi/website/account/error.png" class="w-[300px]"/>
                        <h1 class="mb-2 inline-flex items-center gap-2 text-2xl font-bold">
                            <span>{{ application_info.status }}</span>
                        </h1>
                        <h2 class="text-sm font-medium">{{ application_info.message }}</h2>
                    </header>
                </section>
            </div>
        </main>
    </div>
    <div v-else class="relative min-h-dvh w-full min-w-80 background" :style="{ backgroundImage: `url(${application_info?.data?.bg_url?.light || ''})` }">
        <div class="absolute inset-0 backdrop-blur-lg z-0"></div>
        <main class="relative z-10 flex max-w-full flex-auto flex-col">
            <div class="mx-auto flex min-h-dvh w-full max-w-10xl items-center justify-center overflow-hidden p-4 lg:p-8">
                <section class="w-full max-w-xl py-6">
                    <header class="mb-10 text-center">
                        <h1 class="mb-2 inline-flex items-center gap-2 text-2xl font-bold" :style="{ color: application_info?.data?.text_color?.light?.color1 || '#000' }">
                            <span>{{ head.name }}</span>
                        </h1>
                        <h2 class="text-sm font-medium" :style="{ color: application_info?.data?.text_color?.light?.color1 || '#000' }">{{ sub_title }}</h2>
                    </header>
                    <van-notice-bar class="rounded-lg glass-card mb-5" left-icon="volume-o" :style="{ color: application_info?.data?.text_color?.light?.color1 || '#000' }">
                        <span class="text-sm"> 来自“{{ application_info?.data?.name || '未知应用' }}”的公告: {{ application_info?.data?.notice || '暂无公告' }}</span>
                    </van-notice-bar>
                    <div class="flex flex-col overflow-hidden rounded-lg glass-card">
                        <div class="grow p-5 md:px-16 md:py-12">
                            <slot />
                        </div>
                    </div>
                    <div class="mt-6 text-center text-sm" :style="{ color: application_info?.data?.text_color?.light?.color1 || '#000' }">&copy;{{ foot.copyright }}</div>
                </section>
            </div>
        </main>
    </div>
</template>

<style>
@import "~/public/css/sign.css";
</style>
