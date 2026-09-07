<script setup lang="ts">
import { reactive, ref, watchEffect } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { THAI_PROVINCES } from '@/constants/provinces'
import type { ProfileFormData } from '@/types'
import AvatarUpload from '@/components/profile/AvatarUpload.vue'
import WorkCategorySelect from '@/components/profile/WorkCategorySelect.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import AlertBanner from '@/components/ui/AlertBanner.vue'

const router = useRouter()
const authStore = useAuthStore()

const form = reactive<ProfileFormData>({
  firstName: '',
  lastName: '',
  phone: '',
  username: '',
  lineId: '',
  facebookId: '',
  province: '',
  role: 'homeowner',
  workCategories: [],
})

const avatarUploadRef = ref<InstanceType<typeof AvatarUpload> | null>(null)
const saveErrorTitle = ref('')
const errors = reactive<Partial<Record<keyof ProfileFormData, string>>>({})
const pendingAvatarFile = ref<File | null>(null)
const saving = ref(false)
const saveError = ref('')

watchEffect(() => {
  const p = authStore.profile
  if (!p) return
  form.firstName = p.firstName
  form.lastName = p.lastName
  form.phone = p.phone
  form.username = p.username
  form.lineId = p.lineId
  form.facebookId = p.facebookId
  form.province = p.province
  form.role = p.role
  form.workCategories = [...p.workCategories]
})

function onAvatarSelected(file: File) {
  pendingAvatarFile.value = file
}

function onAvatarInvalid(message: string) {
  saveErrorTitle.value = "Can't use this photo"
  saveError.value = message
}

function validate(): boolean {
  Object.keys(errors).forEach((k) => delete errors[k as keyof ProfileFormData])
  if (!form.firstName.trim()) errors.firstName = 'Required'
  if (!form.lastName.trim()) errors.lastName = 'Required'
  if (!form.phone.trim()) errors.phone = 'Required'
  if (!form.province) errors.province = 'Select a province'
  if (form.role === 'professional' && form.workCategories.length === 0) {
    errors.workCategories = 'Select at least one'
  }
  return Object.keys(errors).length === 0
}

async function onSubmit() {
  saveError.value = ''
  saveErrorTitle.value = ''
  if (!validate()) return

  saving.value = true
  try {
    await authStore.saveProfile({ ...form })
  } catch (err) {
    console.error('saveProfile failed:', err)
    const code = (err as { code?: string })?.code
    saveErrorTitle.value = "Couldn't save your profile"
    saveError.value =
      code === 'permission-denied'
        ? 'You don’t have permission to save this. Check Firestore rules are published.'
        : 'Please try again.'
    saving.value = false
    return
  }

  if (pendingAvatarFile.value) {
    try {
      await authStore.uploadAvatar(pendingAvatarFile.value)
    } catch (err) {
      console.error('uploadAvatar failed:', err)
      saveErrorTitle.value = 'Photo upload failed'
      saveError.value = 'Your other details were saved. Your previous photo was kept — try again anytime.'
      pendingAvatarFile.value = null
      avatarUploadRef.value?.reset()
      saving.value = false
      return
    }
  }

  saving.value = false
  router.push('/profile')
}
</script>

<template>
  <div class="w-full px-[15%] py-10">
    <div class="mx-auto max-w-lg">
    <h1 class="mb-1 text-2xl font-semibold text-ink">Edit profile</h1>
    <p class="mb-6 text-sm text-muted">
      This is what contractors and homeowners will see about you.
    </p>

    <AlertBanner
      v-if="saveError"
      variant="error"
      :title="saveErrorTitle"
      :message="saveError"
      class="mb-5"
    />

    <form class="space-y-5" @submit.prevent="onSubmit">
      <div class="flex justify-center">
        <AvatarUpload
          ref="avatarUploadRef"
          :current-url="authStore.profile?.photoURL"
          @file-selected="onAvatarSelected"
          @invalid-file="onAvatarInvalid"
        />
      </div>

      <div class="grid grid-cols-2 gap-4">
        <BaseInput v-model="form.firstName" label="First name" :error="errors.firstName" required />
        <BaseInput v-model="form.lastName" label="Last name" :error="errors.lastName" required />
      </div>

      <BaseInput
        v-model="form.phone"
        type="tel"
        label="Phone number"
        placeholder="08X-XXX-XXXX"
        :error="errors.phone"
        required
      />

      <div>
        <span class="mb-1.5 block text-sm font-medium text-ink">Username</span>
        <div class="rounded-lg border border-cream bg-cream/30 px-3 py-2.5 text-sm text-muted">
          @{{ form.username }}
        </div>
        <p class="mt-1 text-xs text-muted">Usernames can't be changed once set.</p>
      </div>

      <div class="grid grid-cols-2 gap-4">
        <BaseInput
          v-model="form.lineId"
          label="LINE ID"
          hint="So people can reach you directly."
          placeholder="e.g. siriporn.k"
        />
        <BaseInput
          v-model="form.facebookId"
          label="Facebook name"
          hint="Optional, if you prefer Facebook."
          placeholder="e.g. Siriporn Kaewkla"
        />
      </div>

      <BaseSelect
        v-model="form.province"
        label="Province"
        :options="THAI_PROVINCES"
        :error="errors.province"
        required
      />

      <div>
        <span class="mb-1.5 block text-sm font-medium text-ink">Role</span>
        <div class="rounded-lg border border-cream bg-cream/30 px-3 py-2.5 text-sm capitalize text-muted">
          {{ form.role }}
        </div>
        <p class="mt-1 text-xs text-muted">Role can't be changed after signup.</p>
      </div>

      <div v-if="form.role === 'professional'">
        <WorkCategorySelect v-model="form.workCategories" />
        <span v-if="errors.workCategories" class="mt-1 block text-xs text-error-text">
          {{ errors.workCategories }}
        </span>
      </div>

      <div class="flex gap-2">
        <BaseButton type="button" variant="outline" full-width @click="router.push('/profile')">
          Cancel
        </BaseButton>
        <BaseButton type="submit" full-width :loading="saving">Save profile</BaseButton>
      </div>
    </form>
    </div>
  </div>
</template>