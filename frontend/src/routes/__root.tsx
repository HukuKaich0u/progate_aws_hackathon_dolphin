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
    <div className="app-shell" data-testid="app-root">
      <header className="app-header">
        <div>
          <p className="app-brand">Dolphin</p>
          {currentUserQuery.data ? (
            <p className="app-status">Signed in as {currentUserQuery.data.email ?? currentUserQuery.data.userId}</p>
          ) : null}
          {currentUserQuery.isPending ? <p className="app-status">Checking session...</p> : null}
          {!currentUserQuery.isPending && !currentUserQuery.data ? <p className="app-status">Not signed in</p> : null}
        </div>
        {currentUserQuery.data ? (
          <button onClick={() => performLogout()} type="button">
            Sign out
          </button>
        ) : null}
      </header>
      <div className="app-content">{outlet ?? <Outlet />}</div>
    </div>
  )
}
