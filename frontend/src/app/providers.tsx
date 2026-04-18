import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import { appRouter } from './router'

const queryClient = new QueryClient()

export function AppProviders() {
  return (
    <QueryClientProvider client={queryClient}>
      <div data-testid="app-root">
        <RouterProvider router={appRouter} />
      </div>
    </QueryClientProvider>
  )
}
