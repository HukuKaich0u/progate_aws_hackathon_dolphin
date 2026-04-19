import { createRoute, createRouter, createRootRoute } from '@tanstack/react-router'
import { HomePage } from '../features/home/home-page'
import { requireAuth } from '../features/auth/require-auth'
import { RoomRouteComponent } from '../routes/rooms/$roomId'
import { AuthCallbackRouteComponent } from '../routes/auth/callback'
import { LoginRouteComponent } from '../routes/login'
import { ProfileRouteComponent } from '../routes/profile'
import { ReceiveRouteComponent } from '../routes/receive'
import { SendRouteComponent } from '../routes/send'
import { SignupRouteComponent } from '../routes/signup'
import { SonicRouteComponent } from '../routes/sonic'
import { IrukaGpuRouteComponent } from '../routes/iruka-gpu'
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

const signupRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/signup',
  component: SignupRouteComponent,
})

const sonicRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/sonic',
  component: SonicRouteComponent,
})

const irukaGpuRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/iruka-gpu',
  component: IrukaGpuRouteComponent,
})

const profileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/profile',
  component: ProfileRouteComponent,
})

const sendRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/send',
  beforeLoad: ({ location }) => requireAuth(location.href),
  component: SendRouteComponent,
})

const receiveRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/receive',
  component: ReceiveRouteComponent,
})

const authCallbackRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/auth/callback',
  component: AuthCallbackRouteComponent,
})

const roomRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/rooms/$roomId',
  beforeLoad: ({ location }) => requireAuth(location.href),
  component: RoomRoutePage,
})

function RoomRoutePage() {
  const { roomId } = roomRoute.useParams()

  return <RoomRouteComponent roomId={roomId} />
}

const routeTree = rootRoute.addChildren([indexRoute, loginRoute, signupRoute, sonicRoute, irukaGpuRoute, profileRoute, sendRoute, receiveRoute, authCallbackRoute, roomRoute])

export const appRouter = createRouter({
  routeTree,
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof appRouter
  }
}
