import { fireEvent, screen, waitFor } from '@testing-library/react'
import { render } from '../../test/render'
import type { Profile } from '../profile/types'
import { SendPage } from './send-page'
import type { Transmitter } from './transmitter'

function makeProfile(overrides: Partial<Profile>): Profile {
  return {
    bottomStyle: 'pants',
    genderExpression: 'feminine',
    glasses: 'glasses',
    hairColor: 'brown',
    hairStyle: 'medium',
    heightRange: '165_175',
    topColor: 'white',
    userId: 'base',
    ...overrides,
  }
}

function stubTransmitter(): Transmitter & { calls: number[] } {
  const calls: number[] = []
  return {
    calls,
    play: vi.fn(async (frequencyHz: number) => {
      calls.push(frequencyHz)
    }) as Transmitter['play'],
  }
}

describe('SendPage', () => {
  it('renders candidates fetched from the backend and sends the mapped frequency for "好き"', async () => {
    const listProfiles = vi.fn().mockResolvedValue([
      makeProfile({ hairColor: 'blonde', userId: 'alice' }),
      makeProfile({ hairColor: 'black', userId: 'bob' }),
    ])
    const transmitter = stubTransmitter()

    render(<SendPage listProfiles={listProfiles} transmitter={transmitter} />)

    const candidates = await screen.findAllByRole('button', { pressed: false, name: /髪色|トップス/ })
    expect(candidates.length).toBeGreaterThanOrEqual(2)
    fireEvent.click(candidates[0])

    fireEvent.click(screen.getByRole('button', { name: /好き/ }))

    await waitFor(() => {
      expect(transmitter.calls).toEqual([18000])
    })
    await screen.findByText(/「好き」を 18000 Hz で送信しました。/)
  })

  it('partial filter narrows the list by hair color', async () => {
    const listProfiles = vi.fn().mockResolvedValue([
      makeProfile({ hairColor: 'blonde', userId: 'a' }),
      makeProfile({ hairColor: 'black', userId: 'b' }),
    ])

    render(<SendPage listProfiles={listProfiles} transmitter={stubTransmitter()} />)

    await waitFor(() => {
      expect(screen.getAllByRole('button', { pressed: false, name: /髪色|トップス/ }).length).toBe(2)
    })

    fireEvent.change(screen.getByLabelText('髪色'), { target: { value: 'blonde' } })

    await waitFor(() => {
      const candidates = screen.getAllByRole('button', { pressed: false, name: /髪色|トップス/ })
      expect(candidates.length).toBe(1)
    })
  })

  it('exact filter returns an empty hint until a filter is set', async () => {
    const listProfiles = vi.fn().mockResolvedValue([makeProfile({ userId: 'a' })])

    render(<SendPage listProfiles={listProfiles} transmitter={stubTransmitter()} />)

    await waitFor(() => {
      expect(screen.getAllByRole('button', { pressed: false, name: /髪色|トップス/ }).length).toBe(1)
    })

    fireEvent.click(screen.getByLabelText(/完全一致/))

    expect(
      screen.getByText('条件を1つ以上選ぶと、完全一致する人が表示されます。'),
    ).toBeInTheDocument()
  })
})
