import type { CurrentUser } from './get-current-user'
import { useQuery } from '@tanstack/react-query'
import { screen, waitFor } from '@testing-library/react'
import { renderWithQueryClient } from '../../test/render'
import { currentUserQueryOptions } from './current-user-query'

function CurrentUserProbe({
  fetchCurrentUser,
}: {
  fetchCurrentUser: () => Promise<CurrentUser | null>
}) {
  const query = useQuery(currentUserQueryOptions(fetchCurrentUser))

  if (query.isPending) {
    return <p>loading</p>
  }

  return <p>{query.data ? 'signed-in' : 'signed-out'}</p>
}

describe('currentUserQueryOptions', () => {
  it('surfaces unauthorized response as signed-out state', async () => {
    const fetchCurrentUser = vi.fn().mockResolvedValue(null)

    renderWithQueryClient(<CurrentUserProbe fetchCurrentUser={fetchCurrentUser} />)

    await waitFor(() => {
      expect(screen.getByText('signed-out')).toBeInTheDocument()
    })
  })
})
