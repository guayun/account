<script setup lang="ts">
import { ref, reactive } from 'vue'
import { message } from 'ant-design-vue'

const page_title = '两步验证'
definePageMeta({
  layout: 'sign',
  title: page_title,
})

useHead({ title: page_title })
const route = useRoute()
const cookie_token = useCookie('token')
const query_state = route.query.state
const query_client_key = route.query.client_key
const query_redirect_uri = route.query.redirect_uri
const ui_state = reactive({
  is_loading: false,
  is_disabled: false,
})
const { data: app_info } = await useAsyncData('app_info', () =>
  $fetch('/api/v1/developers', {
    method: 'GET',
    params: { client_key: query_client_key, redirect_uri: query_redirect_uri },
  })
)
const user_profile = await $fetch('/api/v1/user-info', {
  method: 'POST',
  headers: {
    Authorization: cookie_token.value,
  },
})
const input_1 = ref(null)
const input_2 = ref(null)
const input_3 = ref(null)
const input_4 = ref(null)
const input_5 = ref(null)
const input_6 = ref(null)
const input_refs = { input_1, input_2, input_3, input_4, input_5, input_6 }
const is_digit = (value: string) => /^\d$/.test(value)

const handle_input = (event, next_ref_key) => {
  const { value } = event.target
  if (!is_digit(value)) {
    event.target.value = ''
    return
  }
  input_refs[next_ref_key].value.focus()
}

const handle_backspace = (event, prev_ref_key) => {
  if (event.target.value === '') {
    input_refs[prev_ref_key].value.focus()
  }
}

const handle_paste = (event) => {
  const pasted_text = event.clipboardData.getData('text').trim()
  if (!/^\d{6}$/.test(pasted_text)) {
    event.preventDefault()
    return
  }
  event.preventDefault()
  for (let i = 0; i < pasted_text.length; i++) {
    const ref_key = `input_${i + 1}`
    input_refs[ref_key].value.value = pasted_text[i]
    if (i < 5) input_refs[`input_${i + 2}`].value.focus()
  }
}
const handle_submit = async () => {
  ui_state.loading = true
  ui_state.disabled = true
  const code_value = Object.values(input_refs).map((ref) => ref.value.value).join('')
  const response = await $fetch('/api/v1/sign/two-factor', {
    method: 'POST',
    headers: {
      Authorization: cookie_token.value,
    },
    body: {
      code: code_value,
      redirect_uri: query_redirect_uri,
      client_key: query_client_key,
      state: query_state,
    }
  })
  if (response && response.status === 20000) {
    message.success(response?.message)
    window.location.href = response.data.redirect_uri || query_redirect_uri
  } else {
    message.error(response?.message || '网络或授权错误')
  }
}

const handle_cancel = () => {
  cookie_token.value = null
  window.location.href = `/sign/signin?action=signup&client_key=${query_client_key}&redirect_uri=${query_redirect_uri}&state=${query_state}`
}
</script>

<template>
  <div v-if="!user_profile?.data" class="grid min-h-full place-items-center px-6 py-24 sm:py-32 lg:px-8">
    <div class="text-center">
      <h1 class="mt-4 text-balance text-5xl font-semibold tracking-tight text-gray-900 sm:text-7xl">{{ user_profile.status }}</h1>
      <p class="mt-6 text-pretty text-lg font-medium text-gray-500 sm:text-xl/8">{{ user_profile.message }}，请重新登录</p>
      <div class="mt-10 flex items-center justify-center gap-x-6">
        <a href="/" class="rounded-md bg-primary-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600">返回首页</a>
      </div>
    </div>
  </div>
  <div v-else class="space-y-6 text-center">
    <h1 class="mb-2 text-2xl font-bold" :style="{ color: `${app_info.data.text_color.light.color2}` }">您的账号已开启两步验证</h1>
    <label class="text-sm" :style="{ color: `${app_info.data.text_color.light.color3}` }">请输入您的验证器应用生成的6位验证码</label>
    <div class="inline-flex items-center gap-3">
      <input ref="input_1" @input="handle_input($event, 'input_2')" @paste="handle_paste" type="text" maxlength="1" autofocus class="block w-9 rounded-lg bg-white/40 hover:bg-white/20 focus:bg-white/20 px-2 py-1.5 text-center text-sm/6" />
      <input ref="input_2" @input="handle_input($event, 'input_3')" @keydown.backspace="handle_backspace($event, 'input_1')" @paste="handle_paste" type="text" maxlength="1" class="block w-9 rounded-lg bg-white/40 hover:bg-white/20 focus:bg-white/20 px-2 py-1.5 text-center text-sm/6" />
      <input ref="input_3" @input="handle_input($event, 'input_4')" @keydown.backspace="handle_backspace($event, 'input_2')" @paste="handle_paste" type="text" maxlength="1" class="block w-9 rounded-lg bg-white/40 hover:bg-white/20 focus:bg-white/20 px-2 py-1.5 text-center text-sm/6" />
      <span class="text-sm" :style="{ color: `${app_info.data.text_color.light.color2}` }">-</span>
      <input ref="input_4" @input="handle_input($event, 'input_5')" @keydown.backspace="handle_backspace($event, 'input_3')" @paste="handle_paste" type="text" maxlength="1" class="block w-9 rounded-lg bg-white/40 hover:bg-white/20 focus:bg-white/20 px-2 py-1.5 text-center text-sm/6" />
      <input ref="input_5" @input="handle_input($event, 'input_6')" @keydown.backspace="handle_backspace($event, 'input_4')" @paste="handle_paste" type="text" maxlength="1" class="block w-9 rounded-lg bg-white/40 hover:bg-white/20 focus:bg-white/20 px-2 py-1.5 text-center text-sm/6" />
      <input ref="input_6" @keydown.backspace="handle_backspace($event, 'input_5')" @paste="handle_paste" type="text" maxlength="1" class="block w-9 rounded-lg bg-white/40 hover:bg-white/20 focus:bg-white/20 px-2 py-1.5 text-center text-sm/6" />
    </div>
    <div>
      <button @click="handle_submit" :disabled="ui_state.is_disabled" class="inline-flex w-full items-center justify-center gap-2 rounded-lg px-6 py-3 leading-5 font-semibold text-white bg-primary-500 hover:bg-primary-600 disabled:bg-primary-400">
        <span v-if="ui_state.is_loading">加载中...</span>
        <span v-else>提交并登录</span>
      </button>
      <button @click="handle_cancel" class="inline-flex w-full items-center justify-center gap-2 rounded-lg px-6 py-3 leading-5 font-semibold bg-white/40 hover:bg-white/20 border border-gray-300 mt-5" :style="{ color: app_info.data.text_color?.light?.color2 }">取消登录</button>
    </div>
  </div>
</template>