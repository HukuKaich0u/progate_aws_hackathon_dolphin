import { createRoute, createRouter, createRootRoute } from '@tanstack/react-router'
import { HomePage } from '../features/home/home-page'
import { requireAuth } from '../features/auth/require-auth'
import { RoomRouteComponent } from '../routes/rooms/$roomId'
import { AuthCallbackRouteComponent } from '../routes/auth/callback'
import { LoginRouteComponent } from '../routes/login'
import { RootLayout } from '../routes/__root'

const rootRoute = createRootRoute({
  component: RootLayout,
})

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: HomePage,
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

const roomRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/rooms/$roomId',
  beforeLoad: ({ location }) => requireAuth(location.pathname + location.search + location.hash),
  component: RoomRoutePage,
})

function RoomRoutePage() {
  const { roomId } = roomRoute.useParams()

  return <RoomRouteComponent roomId={roomId} />
}

const routeTree = rootRoute.addChildren([indexRoute, loginRoute, authCallbackRoute, roomRoute])

export const appRouter = createRouter({
  routeTree,
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof appRouter
  }
}
