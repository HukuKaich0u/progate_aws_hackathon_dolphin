import { fireEvent, screen, waitFor } from '@testing-library/react'
import { render } from '../../test/render'
import { ProfilePage } from './profile-page'
import type { Profile, ProfileInput } from './types'

function makeProfile(overrides: Partial<Profile> = {}): Profile {
  return {
    bottomStyle: 'pants',
    genderExpression: 'feminine',
    glasses: 'glasses',
    hairColor: 'brown',
    hairStyle: 'medium',
    heightRange: '165_175',
    topColor: 'white',
    userId: 'user-1',
    ...overrides,
  }
}

describe('ProfilePage', () => {
  it('prefills the form from an existing profile', async () => {
    const getMyProfile = vi.fn().mockResolvedValue(makeProfile({ hairColor: 'blonde' }))
    const upsertMyProfile = vi.fn<(input: ProfileInput) => Promise<Profile>>()

    render(<ProfilePage getMyProfile={getMyProfile} upsertMyProfile={upsertMyProfile} />)

    await waitFor(() => {
      expect(screen.getByLabelText('髪色')).toHaveValue('blonde')
    })
    expect(screen.getByLabelText('髪型')).toHaveValue('medium')
  })

  it('falls back to defaults when no profile exists yet', async () => {
    const getMyProfile = vi.fn().mockResolvedValue(null)
    const upsertMyProfile = vi.fn<(input: ProfileInput) => Promise<Profile>>()

    render(<ProfilePage getMyProfile={getMyProfile} upsertMyProfile={upsertMyProfile} />)

    await waitFor(() => {
      expect(screen.getByLabelText('髪色')).toHaveValue('black')
    })
  })

  it('saves the current selections and shows a success notice', async () => {
    const getMyProfile = vi.fn().mockResolvedValue(null)
    const upsertMyProfile = vi.fn<(input: ProfileInput) => Promise<Profile>>().mockResolvedValue(makeProfile())

    render(<ProfilePage getMyProfile={getMyProfile} upsertMyProfile={upsertMyProfile} />)

    await waitFor(() => {
      expect(screen.getByLabelText('髪色')).toBeInTheDocument()
    })

    fireEvent.change(screen.getByLabelText('髪色'), { target: { value: 'blonde' } })
    fireEvent.change(screen.getByLabelText('メガネ'), { target: { value: 'sunglasses' } })
    fireEvent.click(screen.getByRole('button', { name: '保存する' }))

    await waitFor(() => {
      expect(upsertMyProfile).toHaveBeenCalledWith(
        expect.objectContaining({ glasses: 'sunglasses', hairColor: 'blonde' }),
      )
    })
    expect(screen.getByText('保存しました。')).toBeInTheDocument()
  })

  it('shows an error message when saving fails', async () => {
    const getMyProfile = vi.fn().mockResolvedValue(null)
    const upsertMyProfile = vi
      .fn<(input: ProfileInput) => Promise<Profile>>()
      .mockRejectedValue(new Error('Failed to save profile (500)'))

    render(<ProfilePage getMyProfile={getMyProfile} upsertMyProfile={upsertMyProfile} />)

    await waitFor(() => {
      expect(screen.getByLabelText('髪色')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: '保存する' }))

    await screen.findByRole('alert')
    expect(screen.getByRole('alert')).toHaveTextContent('Failed to save profile (500)')
  })
})
