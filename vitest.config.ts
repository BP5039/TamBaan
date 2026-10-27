import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

// Unit tests (Test Plan 3.1): Firebase, vue-router and heic2any are replaced
// by in-memory fakes, so the tests never touch the live Firebase project.
const fake = (f: string) => fileURLToPath(new URL(`./tests/unit/support/fakes/${f}`, import.meta.url))

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: [
      { find: /^firebase\/app$/, replacement: fake('firebase-app.mjs') },
      { find: /^firebase\/auth$/, replacement: fake('firebase-auth.mjs') },
      { find: /^firebase\/firestore$/, replacement: fake('firebase-firestore.mjs') },
      { find: /^firebase\/storage$/, replacement: fake('firebase-storage.mjs') },
      { find: /^vue-router$/, replacement: fake('vue-router.mjs') },
      { find: /^heic2any$/, replacement: fake('heic2any.mjs') },
      { find: /^@\/firebase\/config$/, replacement: fake('config.mjs') },
      { find: /^@\//, replacement: fileURLToPath(new URL('./src/', import.meta.url)) },
    ],
  },
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.test.mjs'],
    setupFiles: ['tests/unit/support/setup.mjs'],
    sequence: { concurrent: false },
    fileParallelism: false,
  },
})
