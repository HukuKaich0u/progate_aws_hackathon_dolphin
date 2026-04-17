import { createRoute, createRouter, createRootRoute } from '@tanstack/react-router'
import { RootLayout } from '../routes/__root'

const rootRoute = createRootRoute({
  component: RootLayout,
})

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: () => null,
})

const routeTree = rootRoute.addChildren([indexRoute])

export const appRouter = createRouter({
  routeTree,
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof appRouter
  }
}
