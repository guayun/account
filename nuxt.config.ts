export default defineNuxtConfig({
  runtimeConfig: {
    public: {
      GEETEST_ID: process.env.GEETEST_ID,
      GITHUB_OAUTH_URL: process.env.GITHUB_OAUTH_URL
    }
  },
  extends: [
    'gua-ui-pro'
  ],
  modules: [
    '@nuxt/ui',
    '@nuxt/content',
    '@ant-design-vue/nuxt',
    '@vant/nuxt'
  ]
})