import { reactive } from 'vue'
export const routerState = {
  route: reactive({ name: 'home', path: '/home', params: {}, query: {} }),
  pushes: [],
  backs: 0,
  reset() {
    this.pushes.length = 0; this.backs = 0
    Object.assign(this.route, { name: 'home', path: '/home', params: {}, query: {} })
  },
}
const router = {
  push(to) { routerState.pushes.push(to); return Promise.resolve() },
  replace(to) { routerState.pushes.push(to); return Promise.resolve() },
  back() { routerState.backs++ },
}
export function useRoute() { return routerState.route }
export function useRouter() { return router }
export function createRouter() { return router }
export function createWebHistory() { return {} }
export const RouterLink = { name: 'RouterLink', render: () => null }
export const RouterView = { name: 'RouterView', render: () => null }
