import type { CurrentUser } from './get-current-user'
import { getCurrentUser } from './get-current-user'

export function currentUserQueryOptions(
  fetchCurrentUser: () => Promise<CurrentUser | null> = getCurrentUser,
) {
  return {
    queryFn: fetchCurrentUser,
    queryKey: ['current-user'],
    retry: false,
  }
}
