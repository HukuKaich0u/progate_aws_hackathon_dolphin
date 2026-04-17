import { Outlet } from '@tanstack/react-router'

export function RootLayout() {
  return (
    <div data-testid="app-root">
      <Outlet />
    </div>
  )
}
