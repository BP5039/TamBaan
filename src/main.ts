import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { useAuthStore } from './stores/auth'
import './style.css'

const app = createApp(App)
app.use(createPinia())

// Start the auth listener before mounting so the first route guard
// check has real data to work with.
const authStore = useAuthStore()
authStore.init()

app.use(router)
app.mount('#app')
