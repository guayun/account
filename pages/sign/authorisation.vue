<script setup lang="ts">
import { useCookie, useRoute } from '#app'
import { message } from 'ant-design-vue'
import { ref, reactive, watch } from 'vue'

const page_title = '授权应用'
definePageMeta({
    layout: 'sign',
    title: page_title,
})

useHead({
  title: page_title
})

const route = useRoute()
const gauth_state = route.query.state
const client_key = route.query.client_key
const redirect_uri = route.query.redirect_uri

const agree_terms = ref(true)
const token_cookie = useCookie('token')

const form_state = reactive({
  loading: false,
  disabled: false
})


const { data: application_info } = await useAsyncData('application_info', () =>
    $fetch('/api/v1/developers', {
        method: 'GET',
        params: { client_key, redirect_uri }
    })
)
const requested_scope = (application_info.value.data.scope || [])
const user_info = await $fetch('/api/v1/user-info', {
    method: 'POST',
    headers: {
        Authorization: token_cookie.value
    }
})
/* if(!user_info?.data.status === 'auth'){
    //
}else{
    //重定向控制台
} */
const scope_map = {
    'openid': '唯一标识符',
    'avatar': '头像',
    'tel': '手机号',
    'username': '用户名',
    'is_realname': '是否完成实名认证',
    'email': '邮箱'
}

const scope_state = reactive({
    indeterminate: false,
    check_all: true,
    checked_list: [...requested_scope]
})

async function on_check_all_change(e) {
    const is_checked = e.target.checked
    Object.assign(scope_state, {
        checked_list: is_checked ? requested_scope : [],
        indeterminate: false,
        check_all: is_checked
    })
}

watch(() => scope_state.checked_list, val => {
    scope_state.indeterminate = !!val.length && val.length < requested_scope.length
    scope_state.check_all = val.length === requested_scope.length
})

async function on_authorize() {
    if (!scope_state.checked_list.length) {
        return message.error('请至少选择一项权限')
    }
    form_state.loading = true
    form_state.disabled = true
    const authorize_res = await $fetch('/api/v1/sign/authorisation', {
        method: 'POST',
        headers: {
            Authorization: token_cookie.value
        },
        body: {
            scope: scope_state.checked_list,
            client_key,
            redirect_uri
        }
    })

    if (authorize_res && authorize_res.status === 20000) {
        message.success(authorize_res?.message)
        window.location.href = authorize_res.data.redirect_uri || redirect_uri
    } else {
        message.error(authorize_res?.message || '网络或授权错误')
    }
}

function on_cancel() {
    token_cookie.value = null
    window.location.href = `/sign/signin?action=signup&client_key=${client_key}&redirect_uri=${redirect_uri}&state=${gauth_state}`
}
</script>

<template>
    <div v-if="!user_info?.data" class="grid min-h-full place-items-center px-6 py-24 sm:py-32 lg:px-8">
        <header class="flex flex-col items-center justify-center text-center">
            <img src="https://assets.guaplus.cn/tos-cn-i-v7fwg41dlf/e4e0fdd280f77b66171bca840f3f51c1.png" class="w-[300px]"/>
            <h1 class="mb-2 inline-flex items-center gap-2 text-2xl font-bold">
                <span>{{ user_info.status }}</span>
            </h1>
            <h2 class="text-sm font-medium">{{ user_info.message }}</h2>
        </header>
    </div>
    <div v-else class="space-y-6">
        <div class="text-center">
            <UAvatar :src="user_info.data.avatar" size="2xl" />
            <h1 class="mb-2 text-2xl font-bold" :style="{ color: application_info.data.text_color?.light?.color2 }">{{ user_info.data.username }}</h1>
            <label class="text-sm text-gray-500 font-bold" :style="{ color: application_info.data.text_color?.light?.color3 }">当前平台 "{{ application_info.data.name }}" 请求此账号的以下权限</label>
        </div>
        <UDivider />
        <div>
            <a-checkbox v-model:checked="scope_state.check_all" :indeterminate="scope_state.indeterminate" @change="on_check_all_change">全选</a-checkbox>
        </div>
        <a-divider />
        <a-checkbox-group v-model:value="scope_state.checked_list">
            <div class="grid grid-cols-2 gap-3">
                <a-checkbox v-for="item in requested_scope" :key="item" :value="item">{{ scope_map[item] || item }}</a-checkbox>
            </div>
        </a-checkbox-group>
        <div class="flex items-center gap-x-2">
            <a-alert type="info" show-icon>
                <template #message>若您不愿向 "{{ application_info.data.name }}" 透露某项信息，可不选，我们会返回适配的假数据以保障 "{{ application_info.data.name }}" 能够正常使用，同时守护您的隐私。</template>
            </a-alert>
        </div>
        <UDivider />
        <div>
            <a-checkbox class="mb-5" v-model:checked="agree_terms">我已阅读并同意<a :href="`https://docs.guaplus.com/terms/${application_info.data.terms}`" target="_blank" class="hover:text-primary-500">《{{ application_info.data.name }}服务条款》</a>和<a :href="`https://docs.guaplus.com/policy/${application_info.data.policy}`" target="_blank" class="hover:text-primary-500">《{{ application_info.data.name }}隐私政策》</a>。</a-checkbox>
            <button @click="on_authorize" :disabled="form_state.disabled" class="inline-flex w-full items-center justify-center gap-2 rounded-lg px-6 py-3 leading-5 font-semibold text-white bg-primary-500 hover:bg-primary-600 disabled:bg-primary-400">
                <span v-if="form_state.loading">加载中...</span>
                <span v-else>授权并登录</span>
            </button>
            <button @click="on_cancel" class="inline-flex w-full items-center justify-center gap-2 rounded-lg px-6 py-3 leading-5 font-semibold bg-white/40 hover:bg-white/20 border border-gray-300 mt-5" :style="{ color: application_info.data.text_color?.light?.color2 }">取消授权</button>
        </div>
    </div>
</template>
