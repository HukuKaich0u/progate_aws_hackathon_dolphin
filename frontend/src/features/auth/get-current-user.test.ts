import { getCurrentUser } from './get-current-user'

const { apiClient } = vi.hoisted(() => ({
  apiClient: vi.fn(),
}))

vi.mock('../../lib/http/api-client', () => ({
  apiClient,
}))

describe('getCurrentUser', () => {
  beforeEach(() => {
    apiClient.mockReset()
  })

  it('maps /v1/auth/me response into CurrentUser', async () => {
    apiClient.mockResolvedValue(
      new Response(
        JSON.stringify({
          email: 'user@example.com',
          groups: ['admin'],
          user_id: 'user-123',
        }),
        {
          headers: {
            'Content-Type': 'application/json',
          },
          status: 200,
        },
      ),
    )

    await expect(getCurrentUser()).resolves.toEqual({
      email: 'user@example.com',
      groups: ['admin'],
      userId: 'user-123',
    })
  })
})
