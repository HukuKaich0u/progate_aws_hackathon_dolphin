import { useQuery } from '@tanstack/react-query'
import { Outlet } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { currentUserQueryOptions } from '../features/auth/current-user-query'
import { getCurrentUser, type CurrentUser } from '../features/auth/get-current-user'
import { logout } from '../features/auth/logout'

type RootLayoutProps = {
  fetchCurrentUser?: () => Promise<CurrentUser | null>
  outlet?: ReactNode
  performLogout?: (redirectTo?: string) => void
}

export function RootLayout({
  fetchCurrentUser = getCurrentUser,
  outlet,
  performLogout = logout,
}: RootLayoutProps) {
  const currentUserQuery = useQuery(currentUserQueryOptions(fetchCurrentUser))

  return (
    <div data-testid="app-root">
      <header>
        {currentUserQuery.data ? <p>Signed in as {currentUserQuery.data.email ?? currentUserQuery.data.userId}</p> : null}
        {currentUserQuery.isPending ? <p>Checking session...</p> : null}
        {!currentUserQuery.isPending && !currentUserQuery.data ? <p>Not signed in</p> : null}
        {currentUserQuery.data ? (
          <button onClick={() => performLogout()} type="button">
            Sign out
          </button>
        ) : null}
      </header>
      {outlet ?? <Outlet />}
    </div>
  )
}
