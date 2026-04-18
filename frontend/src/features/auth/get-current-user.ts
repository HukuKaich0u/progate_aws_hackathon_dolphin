import { apiClient } from '../../lib/http/api-client'

type CurrentUserResponse = {
  email?: string | null
  groups?: string[] | null
  user_id: string
}

export type CurrentUser = {
  email?: string | null
  groups: string[]
  userId: string
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const response = await apiClient('/v1/auth/me')

  if (response.status === 401 || response.status === 403) {
    return null
  }

  if (!response.ok) {
    throw new Error('Failed to fetch current user.')
  }

  const payload = (await response.json()) as CurrentUserResponse

  return {
    email: payload.email ?? null,
    groups: payload.groups ?? [],
    userId: payload.user_id,
  }
}
