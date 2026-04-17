import { createRoute, createRouter, createRootRoute } from '@tanstack/react-router'
import { AuthCallbackRouteComponent } from '../routes/auth/callback'
import { LoginRouteComponent } from '../routes/login'
import { RootLayout } from '../routes/__root'

const rootRoute = createRootRoute({
  component: RootLayout,
})

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: () => null,
})

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  component: LoginRouteComponent,
})

const authCallbackRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/auth/callback',
  component: AuthCallbackRouteComponent,
})

const routeTree = rootRoute.addChildren([indexRoute, loginRoute, authCallbackRoute])

export const appRouter = createRouter({
  routeTree,
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof appRouter
  }
}
