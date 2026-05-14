<script setup lang="ts">
import { useCookie } from '#app'
import data from '~/content/data.json'
import { ref, reactive, computed } from 'vue'
import { message, Modal } from 'ant-design-vue'
import { useUserStore } from '~/plugins/store/user'
import { isEmpty, isTel, isEmail } from '~/server/utils/validate'

const page_title = '登录账号'
definePageMeta({
  layout: 'sign',
  title: page_title,
})

useHead({
  title: page_title,
  script: [{ type: 'text/javascript', src: '/js/geetest.js' }],
})

const route = useRoute()
const agree_terms = ref(true)
const cookie = useCookie('token')
const state = route.query.state
const client_key = route.query.client_key
const redirect_uri = route.query.redirect_uri

const wechat_dialog = ref(false)
const wechat_code = ref('')

const { data: application_info } = await useAsyncData('application_info', () =>
  $fetch('/api/v1/developers', {
    method: 'GET',
    params: { client_key, redirect_uri }
  })
)

const config = useRuntimeConfig()
const signin_method = ref<'code' | 'pass'>('code')
const user_info = await $fetch('/api/v1/user-info', {
    method: 'POST',
    headers: {
        Authorization: cookie.value
    }
})
/* if(user_info?.data.status === 'nomal'){
  //重定向控制台
} */
const form = reactive({
  account: '',
  code: '',
  password: ''
})

const form_state = reactive({
  loading: false,
  disabled: false,
})

const send_code_state = reactive({
  loading: false,
  disabled: false,
  countdown: 0,
  intervalId: null,
})

function validateAccount() {
  if (isEmpty(form.account)) {
    message.error('账号不能为空')
    return false
  }
  if (!isEmail(form.account) && !isTel(form.account)) {
    message.error('请输入有效的邮箱或手机号')
    return false
  }
  return true
}

function validateForm() {
  if (!validateAccount()) return false
  if (signin_method.value === 'pass' && isEmpty(form.password)) {
    message.error('密码不能为空')
    return false
  }
  if (signin_method.value === 'code' && isEmpty(form.code)) {
    message.error('验证码不能为空')
    return false
  }
  return true
}

async function signin() {
  if (!validateForm()) return
  form_state.loading = true
  form_state.disabled = true
  try {
    const body = {
      account: form.account,
      client_key,
      signin_method: signin_method.value,
      redirect_uri,
      state,
    }
    if (signin_method.value === 'code') body.code = form.code
    if (signin_method.value === 'pass') body.password = form.password

    const res = await $fetch('/api/v1/sign/signin', {
      method: 'POST',
      body
    })
    if (!res) {
      message.error('网络错误')
      return
    }
    switch (res.status) {
      case 20000:
        message.success('登录成功')
        setTokenAndRedirect(res.data.token, res.data.redirect_uri, 3600)
        break
      case 20001:
        message.warning('请完成两步验证')
        setTokenAndRedirect(res.data.token, res.data.redirect_uri, 300)
        break
      case 20002:
        message.warning('请完成应用授权')
        setTokenAndRedirect(res.data.token, res.data.redirect_uri, 300)
        console.log(res.data.redirect_uri)
        break
      default:
        message.error(res.message || '登录失败')
    }
  } catch (error) {
    console.error('登录请求失败:', error)
    message.error('登录请求失败，请稍后重试')
  } finally {
    form_state.loading = false
    form_state.disabled = false
  }
}

function setTokenAndRedirect(token, redirectUri, maxAge) {
  cookie.value = token
  window.location.href = redirectUri
}

async function initCaptcha() {
  return new Promise((resolve, reject) => {
    initGeetest4({
        captchaId: config.public.GEETEST_ID,
        product: 'bind',
      }, (captchaObj) => {
        captchaObj.onReady(() => {}).onSuccess(() => {
            resolve(captchaObj.getValidate())
            captchaObj.reset()
          }).onError(() => reject(new Error('验证码加载失败')))
        captchaObj.showCaptcha()
      }
    )
  })
}

async function handleSendCode() {
  if (!validateAccount()) return
  send_code_state.loading = true
  send_code_state.disabled = true
  try {
    const captcha = await initCaptcha()
    const res = await $fetch('/api/v1/send-code', {
      method: 'POST',
      body: {
        account: form.account,
        captcha_id: captcha.captcha_id,
        captcha_output: captcha.captcha_output,
        gen_time: captcha.gen_time,
        lot_number: captcha.lot_number,
        pass_token: captcha.pass_token,
      }
    })
    if (res.status === 20000) {
      message.success('验证码发送成功')
      startCountdown()
    } else {
      message.error(res.message || '验证码发送失败')
      send_code_state.disabled = false
    }
  } catch (err) {
    console.error(err)
    message.error('验证码验证失败，请重试')
    send_code_state.disabled = false
  } finally {
    send_code_state.loading = false
  }
}

function startCountdown() {
  send_code_state.countdown = 59
  if (send_code_state.intervalId) {
    clearInterval(send_code_state.intervalId)
  }
  send_code_state.intervalId = setInterval(() => {
    if (send_code_state.countdown > 0) {
      send_code_state.countdown--
    } else {
      clearInterval(send_code_state.intervalId!)
      send_code_state.intervalId = null
      send_code_state.disabled = false
    }
  }, 1000)
}

async function wechatGetCode() {
  const res = await $fetch('/api/v1/sign/signin/wechat/code')
  if (res.status === 20000) {
    wechat_code.value = res.data.code
    wechat_dialog.value = true
  } else {
    message.error(res.message || '请求失败，请稍后重试')
  }
}
async function wechatSignin() {
  const res = await $fetch('/api/v1/sign/signin/wechat/status', {
    method: 'POST',
    body: {
      code: wechat_code.value,
      client_key,
      redirect_uri,
      state
    }
  })
  switch (res.status) {
      case 20000:
        message.success('登录成功')
        setTokenAndRedirect(res.data.token, res.data.redirect_uri, 3600)
        break
      case 20001:
        message.warning('请完成两步验证')
        setTokenAndRedirect(res.data.token, res.data.redirect_uri, 300)
        break
      case 20002:
        message.warning('请完成应用授权')
        setTokenAndRedirect(res.data.token, res.data.redirect_uri, 300)
        console.log(res.data.redirect_uri)
        break
      default:
        message.error(res.message || '登录失败')
    }
}
</script>

<template>
  <div class="space-y-6">
    <van-tabs v-model:active="signin_method">
      <van-tab title="验证码登录" name="code">
        <div class="space-y-6">
          <div class="mt-5">
            <a-alert message="通过此方式登录时，未注册的账号将自动注册为新账号。" type="info" show-icon />
          </div>
          <van-field v-model="form.account" class="rounded-lg glass-card" :style="{ color: `${application_info.data.text_color.light.color2}` }" label="账号" placeholder="请输入邮箱或手机号">
          </van-field>
          <van-field v-model="form.code" class="rounded-lg glass-card" :style="{ color: `${application_info.data.text_color.light.color2}` }" label="验证码" placeholder="请输入验证码">
            <template #button>
              <button type="button" class="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-primary-500 hover:text-primary-600" :disabled="send_code_state.disabled" @click="handleSendCode">
                <span v-if="send_code_state.loading">验证码发送中</span>
                <span v-else>{{ send_code_state.countdown > 0 ? `${send_code_state.countdown}秒后重新获取` : '获取验证码' }}</span>
              </button>
            </template>
          </van-field>
        </div>
      </van-tab>
      <van-tab title="密码登录" name="pass">
        <div class="space-y-6">
          <div class="mt-5">
            <a-alert message="若您是新用户，请使用“验证码登录”方式进行登录。" type="info" show-icon />
          </div>
          <van-field v-model="form.account" class="rounded-lg glass-card mt-6" :style="{ color: `${application_info.data.text_color.light.color2}` }" label="账号" placeholder="请输入邮箱或手机号" />
          <van-field v-model="form.password" type="password" class="rounded-lg glass-card" :style="{ color: `${application_info.data.text_color.light.color2}` }" label="密码" placeholder="请输入密码" />
        </div>
      </van-tab>
    </van-tabs>
    <div>
      <a-checkbox class="mb-5" v-model:checked="agree_terms">我已阅读并同意<a :href="`https://docs.guaplus.com/terms/${application_info.data.terms}`" target="_blank" class="hover:text-primary-500">《IDNest服务条款》</a>和<a :href="`https://docs.guaplus.com/policy/${application_info.data.policy}`" target="_blank" class="hover:text-primary-500">《IDNest隐私政策》</a>。</a-checkbox>
      <button class="inline-flex w-full items-center justify-center gap-2 rounded-lg px-6 py-3 leading-5 font-semibold text-white bg-primary-500 hover:bg-primary-600 disabled:bg-primary-400" @click="signin()" :disabled="form_state.disabled">
        <span v-if="form_state.loading">加载中...</span>
        <span v-else>登录账号</span>
      </button>
      <div class="my-5 flex items-center">
        <span class="h-0.5 grow rounded-sm glass-card"></span>
        <span class="mx-2 rounded-full glass-card px-3 py-1 text-xs font-medium text-gray-800" :style="{ color: `${application_info.data.text_color.light.color2}` }">使用第三方账号登录</span>
        <span class="h-0.5 grow rounded-sm glass-card"></span>
      </div>
      <div class="grid grid-cols-1 mb-5">
        <a-alert message="通过以下方式登录时，未注册的账号将自动注册为新账号。" type="info" show-icon />
      </div>
      <div class="grid grid-cols-3 gap-3">
        <button @click="wechatGetCode()" type="button" class="inline-flex items-center justify-center gap-2 rounded-lg bg-white/40 hover:bg-white/20 px-3 py-2 text-sm leading-5" :style="{ color: `${application_info.data.text_color.light.color2}` }">
          <img src="https://s3.hi168.com/hi168-25512-4716xkbi/website/account/88f1e58b7ce766da11c87e7381c20d92.jpg" class="h-5 w-5 object-contain rounded" />
          <span>微信</span>
        </button>
        <NuxtLink to="https://open.douyin.com/platform/oauth/pc/auth?client_key=awn865clagbpfg38&response_type=code&scope=user_info&redirect_uri=https%3A%2F%2Fpassport.guapro.cn%2Fapi%2Fsignin%2Fbytedance%2Fcallback&state=state" target="_blank" class="inline-flex items-center justify-center gap-2 rounded-lg bg-white/40 hover:bg-white/20 px-3 py-2 text-sm leading-5" :style="{ color: `${application_info.data.text_color.light.color2}` }" >
          <img src="https://s3.hi168.com/hi168-25512-4716xkbi/website/account/2bb9d04f6b677245cad2f62bce05d5c9.jpg" class="h-5 w-5 object-contain rounded" />
          <span>抖音</span>
        </NuxtLink>
        <button type="button" class="inline-flex items-center justify-center gap-2 rounded-lg bg-white/40 hover:bg-white/20 px-3 py-2 text-sm leading-5" :style="{ color: `${application_info.data.text_color.light.color2}` }">
          <img src="https://s3.hi168.com/hi168-25512-4716xkbi/website/account/e6f4138cbbefeb310806e7fc6d8e1ead.jpg" class="h-5 w-5 object-contain rounded" />
          <span>QQ</span>
        </button>
        <button type="button" class="inline-flex items-center justify-center gap-2 rounded-lg bg-white/40 hover:bg-white/20 px-3 py-2 text-sm leading-5" :style="{ color: `${application_info.data.text_color.light.color2}` }">
          <img src="https://s3.hi168.com/hi168-25512-4716xkbi/website/account/00853fdf7fb75fb9d3a3446545a8f4a0.jpg" class="h-5 w-5 object-contain rounded" />
          <span>快手</span>
        </button>
        <button type="button" class="inline-flex items-center justify-center gap-2 rounded-lg bg-white/40 hover:bg-white/20 px-3 py-2 text-sm leading-5" :style="{ color: `${application_info.data.text_color.light.color2}` }">
          <img src="https://s3.hi168.com/hi168-25512-4716xkbi/website/account/450dd2941c1c214d32e0014457bdd154.jpg" class="h-5 w-5 object-contain rounded" />
          <span>微博</span>
        </button>
        <button type="button" class="inline-flex items-center justify-center gap-2 rounded-lg bg-white/40 hover:bg-white/20 px-3 py-2 text-sm leading-5" :style="{ color: `${application_info.data.text_color.light.color2}` }">
          <img src="https://s3.hi168.com/hi168-25512-4716xkbi/website/account/f66b7313dbeda6df39b10b6c6640a496.jpg" class="h-5 w-5 object-contain rounded" />
          <span>百度</span>
        </button>
        <button type="button" class="inline-flex items-center justify-center gap-2 rounded-lg bg-white/40 hover:bg-white/20 px-3 py-2 text-sm leading-5" :style="{ color: `${application_info.data.text_color.light.color2}` }">
          <img src="https://s3.hi168.com/hi168-25512-4716xkbi/website/account/f58d25541b7ceca94de86d9345981a4f.jpg" class="h-5 w-5 object-contain rounded" />
          <span>飞书</span>
        </button>
        <button type="button" class="inline-flex items-center justify-center gap-2 rounded-lg bg-white/40 hover:bg-white/20 px-3 py-2 text-sm leading-5" :style="{ color: `${application_info.data.text_color.light.color2}` }">
          <img src="https://s3.hi168.com/hi168-25512-4716xkbi/website/account/52af5c312edd64a951cf0442bbe6ee91.jpg" class="h-5 w-5 object-contain rounded" />
          <span>钉钉</span>
        </button>
        <button type="button" class="inline-flex items-center justify-center gap-2 rounded-lg bg-white/40 hover:bg-white/20 px-3 py-2 text-sm leading-5" :style="{ color: `${application_info.data.text_color.light.color2}` }">
          <img src="https://www.huawei.com/-/media/hcomponent-header/1.0.1.20260424171441/component/img/huawei_logo.png" class="h-5 object-contain rounded" />

        </button>
        <button type="button" class="inline-flex items-center justify-center gap-2 rounded-lg bg-white/40 hover:bg-white/20 px-3 py-2 text-sm leading-5" :style="{ color: `${application_info.data.text_color.light.color2}` }">
          <img src="https://s3.hi168.com/hi168-25512-4716xkbi/website/account/8f4077f45227811c7b405491d2442a87.jpg" class="h-5 w-5 object-contain rounded" />
          <span>支付宝</span>
        </button>
        <button type="button" class="inline-flex items-center justify-center gap-2 rounded-lg bg-white/40 hover:bg-white/20 px-3 py-2 text-sm leading-5" :style="{ color: `${application_info.data.text_color.light.color2}` }">
          <img src="https://s3.hi168.com/hi168-25512-4716xkbi/website/account/3219fa9f9b8fadadaf8afdafae798327.jpg" class="h-5 w-5 object-contain rounded" />
          <span>哔哩哔哩</span>
        </button>
        <button type="button" class="inline-flex items-center justify-center gap-2 rounded-lg bg-white/40 hover:bg-white/20 px-3 py-2 text-sm leading-5" :style="{ color: `${application_info.data.text_color.light.color2}` }">
          <img src="https://s3.hi168.com/hi168-25512-4716xkbi/website/account/9e777261b07962258e4c6775aedcf4b3.jpg" class="h-5 w-5 object-contain rounded" />
          <span>阿里云盘</span>
        </button>
        <button type="button" class="inline-flex items-center justify-center gap-2 rounded-lg bg-white/40 hover:bg-white/20 px-3 py-2 text-sm leading-5" :style="{ color: `${application_info.data.text_color.light.color2}` }">
          <img src="https://s3.hi168.com/hi168-25512-4716xkbi/website/account/95efa5afa5517c2644f7ac4f952237db.jpg" class="h-5 w-5 object-contain rounded" />
          <span>企业微信</span>
        </button>
        <button type="button" class="inline-flex items-center justify-center gap-2 rounded-lg bg-white/40 hover:bg-white/20 px-3 py-2 text-sm leading-5" :style="{ color: `${application_info.data.text_color.light.color2}` }">
          <img src="https://s3.hi168.com/hi168-25512-4716xkbi/website/account/logo-black.d4cfe066.svg" class="h-5 object-contain rounded" />
        </button>
        <NuxtLink :to="config.public.GITHUB_OAUTH_URL" target="_blank" class="inline-flex items-center justify-center gap-2 rounded-lg bg-white/40 hover:bg-white/20 px-3 py-2 text-sm leading-5" :style="{ color: `${application_info.data.text_color.light.color2}` }" >
          <img src="https://s3.hi168.com/hi168-25512-4716xkbi/website/account/aa0efae1efd61f871062a3176eefef86.jpg" class="h-5 w-5 object-contain rounded" />
          <span>Github</span>
        </NuxtLink>
      </div>
    </div>
  </div>
  <a-modal v-model:open="wechat_dialog" title="微信快捷登录" centered @ok="wechatSignin()" cancelText="取消登录" okText="我已发送" :maskClosable="false" :closable="false" :keyboard="false">
    <div class="flex flex-col items-center text-center space-y-4">
      <h1 class="text-xl font-bold" :style="{ color: application_info.data.text_color.light.color2 }">请使用微信扫码关注公众号后</h1>
      <a-image :width="200" class="rounded-lg border" src="https://s3.hi168.com/hi168-25512-4716xkbi/website/account/wechat_mp.jpg" />
      <label class="text-sm font-bold flex items-center gap-1" :style="{ color: application_info.data.text_color.light.color3 }">向其发送<a-tag color="processing" :bordered="false">{{ wechat_code }}</a-tag></label>
    </div>
  </a-modal>
</template>

<style>
.van-tabs__nav {
  background: none
}

.van-tabs__line {
  background: #3B82F6
}
</style>