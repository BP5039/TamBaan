<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { THAI_PROVINCES } from '@/constants/provinces'
import { baseUsernameFrom, slugify } from '@/constants/username'
import type { ProfileFormData, UserRole } from '@/types'
import AvatarUpload from '@/components/profile/AvatarUpload.vue'
import WorkCategorySelect from '@/components/profile/WorkCategorySelect.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import AlertBanner from '@/components/ui/AlertBanner.vue'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'

const router = useRouter()
const authStore = useAuthStore()

const step = ref<1 | 2 | 3>(1)

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

const errors = reactive<Partial<Record<keyof ProfileFormData, string>>>({})
const pendingAvatarFile = ref<File | null>(null)
const avatarUploadRef = ref<InstanceType<typeof AvatarUpload> | null>(null)

const usernameStatus = ref<'idle' | 'checking' | 'available' | 'taken'>('idle')
const usernameSuggestions = ref<string[]>([])
const usernameConfirmed = ref(false)
const showUsernameConfirm = ref(false)
let debounceTimer: number | undefined

const roleConfirmed = ref(false)
const showRoleConfirm = ref(false)
const saving = ref(false)
const saveErrorTitle = ref('')
const saveError = ref('')

function onAvatarSelected(file: File) {
  pendingAvatarFile.value = file
}

function onAvatarInvalid(message: string) {
  saveErrorTitle.value = "Can't use this photo"
  saveError.value = message
}

function validateStep1(): boolean {
  errors.firstName = form.firstName.trim() ? '' : 'Required'
  errors.lastName = form.lastName.trim() ? '' : 'Required'
  errors.phone = form.phone.trim() ? '' : 'Required'
  return !errors.firstName && !errors.lastName && !errors.phone
}

async function checkUsername() {
  const candidate = form.username.trim()
  if (!candidate) {
    usernameStatus.value = 'idle'
    return
  }
  usernameStatus.value = 'checking'
  try {
    const available = await authStore.isUsernameAvailable(candidate)
    if (available) {
      usernameStatus.value = 'available'
      usernameSuggestions.value = []
    } else {
      usernameStatus.value = 'taken'
      usernameSuggestions.value = await authStore.suggestUsernames(candidate)
    }
  } catch (err) {
    console.error('username check failed:', err)
    usernameStatus.value = 'idle'
    errors.username = "Couldn't check that username. Try again."
  }
}

function onUsernameChange(value: string) {
  form.username = slugify(value)
  errors.username = ''
  usernameStatus.value = 'idle'
  usernameSuggestions.value = []
  usernameConfirmed.value = false // editing the value un-confirms it
  window.clearTimeout(debounceTimer)
  debounceTimer = window.setTimeout(checkUsername, 450)
}

function pickSuggestion(name: string) {
  form.username = name
  usernameStatus.value = 'available'
  usernameSuggestions.value = []
  usernameConfirmed.value = false
  errors.username = ''
}

function validateStep3(): boolean {
  errors.province = form.province ? '' : 'Select a province'
  errors.workCategories =
    form.role === 'professional' && form.workCategories.length === 0
      ? 'Select at least one'
      : ''
  return !errors.province && !errors.workCategories
}

async function goNext() {
  saveError.value = ''

  if (step.value === 1) {
    if (!validateStep1()) return
    step.value = 2
    if (!form.username) {
      form.username = baseUsernameFrom(form.firstName, form.lastName)
    }
    await checkUsername()
    return
  }

  if (step.value === 2) {
    if (usernameStatus.value !== 'available') await checkUsername()
    if (usernameStatus.value !== 'available') {
      errors.username =
        usernameStatus.value === 'taken'
          ? 'That username is taken — try a suggestion below'
          : 'Choose a username'
      return
    }
    if (!usernameConfirmed.value) {
      showUsernameConfirm.value = true
      return
    }
    step.value = 3
  }
}

function confirmUsername() {
  usernameConfirmed.value = true
  showUsernameConfirm.value = false
  step.value = 3
}

function cancelUsernameConfirm() {
  showUsernameConfirm.value = false
}

function goBack() {
  saveError.value = ''
  if (step.value > 1) step.value = (step.value - 1) as 1 | 2
}

function selectRole(role: UserRole) {
  form.role = role
  if (role === 'homeowner') form.workCategories = []
}

async function onFinalSubmit() {
  saveError.value = ''
  if (!validateStep3()) return
  if (!roleConfirmed.value) {
    showRoleConfirm.value = true
    return
  }
  await performSave()
}

function confirmRole() {
  roleConfirmed.value = true
  showRoleConfirm.value = false
  performSave()
}

function cancelRoleConfirm() {
  showRoleConfirm.value = false
}

async function performSave() {
  saving.value = true
  try {
    await authStore.createProfileWithUsername({ ...form })
  } catch (err) {
    if ((err as Error).message === 'username-taken') {
      saveErrorTitle.value = 'Username was just taken'
      saveError.value = 'Someone grabbed that username seconds ago — pick another.'
      step.value = 2
      usernameConfirmed.value = false
      usernameStatus.value = 'taken'
      usernameSuggestions.value = await authStore.suggestUsernames(form.username)
    } else {
      saveErrorTitle.value = "Couldn't save your profile"
      saveError.value = 'Please try again.'
    }
    saving.value = false
    return
  }

  if (pendingAvatarFile.value) {
    try {
      await authStore.uploadAvatar(pendingAvatarFile.value)
    } catch {
      saveErrorTitle.value = 'Photo upload failed'
      saveError.value = 'Your profile was saved — add a photo anytime from Edit profile.'
      pendingAvatarFile.value = null
      avatarUploadRef.value?.reset()
      saving.value = false
      router.push('/profile')
      return
    }
  }

  saving.value = false
  router.push('/profile')
}
</script>

<template>
  <div class="mx-auto max-w-lg px-4 py-10">
    <p class="mb-1 text-xs font-medium uppercase tracking-wide text-muted">
      Step {{ step }} of 3
    </p>
    <h1 class="mb-6 text-2xl font-semibold text-ink">Complete your profile</h1>

    <AlertBanner
      v-if="saveError"
      variant="error"
      :title="saveErrorTitle"
      :message="saveError"
      class="mb-5"
    />

    <!-- Step 1: personal -->
    <div v-if="step === 1" class="space-y-5">
      <div class="flex justify-center">
        <AvatarUpload ref="avatarUploadRef" @file-selected="onAvatarSelected" @invalid-file="onAvatarInvalid" />
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
      <BaseButton full-width @click="goNext">Next</BaseButton>
    </div>

    <!-- Step 2: handle + socials -->
    <div v-else-if="step === 2" class="space-y-5">
      <div>
        <BaseInput
          :model-value="form.username"
          label="Username"
          placeholder="e.g. somchai-p"
          :error="errors.username"
          required
          @update:model-value="onUsernameChange"
        />
        <p class="mt-1 text-xs text-muted">* Can't be changed once you continue past this step</p>
        <p v-if="usernameStatus === 'checking'" class="mt-1.5 text-xs text-muted">Checking availability…</p>
        <p v-else-if="usernameStatus === 'available'" class="mt-1.5 text-xs text-success-text">
          @{{ form.username }} is available
        </p>
        <div v-else-if="usernameStatus === 'taken'" class="mt-2">
          <p class="mb-1.5 text-xs text-error-text">That username is taken. Try one of these:</p>
          <div class="flex flex-wrap gap-1.5">
            <button
              v-for="s in usernameSuggestions"
              :key="s"
              type="button"
              class="rounded-full border border-cream px-2.5 py-1 text-xs font-medium text-ink hover:border-primary"
              @click="pickSuggestion(s)"
            >
              @{{ s }}
            </button>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-4">
        <BaseInput v-model="form.lineId" label="LINE ID" placeholder="e.g. siriporn.k" />
        <BaseInput v-model="form.facebookId" label="Facebook name" placeholder="e.g. Siriporn Kaewkla" />
      </div>

      <div class="flex gap-2">
        <BaseButton variant="outline" full-width @click="goBack">Back</BaseButton>
        <BaseButton full-width @click="goNext">Next</BaseButton>
      </div>
    </div>

    <!-- Step 3: location + role -->
    <div v-else class="space-y-5">
      <BaseSelect
        v-model="form.province"
        label="Province"
        :options="THAI_PROVINCES"
        :error="errors.province"
        required
      />

      <div>
        <span class="mb-2 block text-sm font-medium text-ink">I am a…</span>
        <div class="grid grid-cols-2 gap-2">
          <button
            type="button"
            class="rounded-lg border px-4 py-3 text-sm font-medium transition"
            :class="
              form.role === 'homeowner'
                ? 'border-primary bg-primary text-white'
                : 'border-cream text-muted hover:border-primary/50'
            "
            @click="selectRole('homeowner')"
          >
            Homeowner
          </button>
          <button
            type="button"
            class="rounded-lg border px-4 py-3 text-sm font-medium transition"
            :class="
              form.role === 'professional'
                ? 'border-primary bg-primary text-white'
                : 'border-cream text-muted hover:border-primary/50'
            "
            @click="selectRole('professional')"
          >
            Professional
          </button>
        </div>
        <p class="mt-1.5 text-xs text-muted">* Can't be changed after signup</p>
      </div>

      <div v-if="form.role === 'professional'">
        <WorkCategorySelect v-model="form.workCategories" />
        <span v-if="errors.workCategories" class="mt-1 block text-xs text-error-text">
          {{ errors.workCategories }}
        </span>
      </div>

      <div class="flex gap-2">
        <BaseButton variant="outline" full-width @click="goBack">Back</BaseButton>
        <BaseButton full-width :loading="saving" @click="onFinalSubmit">Save profile</BaseButton>
      </div>
    </div>

    <ConfirmDialog
      v-if="showUsernameConfirm"
      title="Confirm your username"
      :message="`@${form.username} can't be changed once you continue. Make sure it's the one you want.`"
      confirm-label="Yes, use this"
      @confirm="confirmUsername"
      @cancel="cancelUsernameConfirm"
    />

    <ConfirmDialog
      v-if="showRoleConfirm"
      title="Confirm your role"
      :message="`You're signing up as a ${form.role}. This can't be changed later, only your listed jobs can be updated. Continue?`"
      confirm-label="Yes, continue"
      @confirm="confirmRole"
      @cancel="cancelRoleConfirm"
    />
  </div>
</template>