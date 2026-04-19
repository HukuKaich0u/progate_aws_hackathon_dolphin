import type { Profile } from '../profile/types'
import { EMPTY_FILTERS, filterProfiles } from './filters'

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

describe('filterProfiles', () => {
  const profiles = [
    makeProfile({ hairColor: 'blonde', glasses: 'glasses', userId: 'a' }),
    makeProfile({ hairColor: 'black', glasses: 'none', userId: 'b' }),
    makeProfile({ hairColor: 'blonde', glasses: 'none', userId: 'c' }),
  ]

  it('partial: returns any profile that matches at least one active filter', () => {
    const result = filterProfiles(profiles, { ...EMPTY_FILTERS, hairColor: 'blonde' }, 'partial')
    expect(result.map((p) => p.userId)).toEqual(['a', 'c'])
  })

  it('partial: returns all profiles when no filter is active', () => {
    const result = filterProfiles(profiles, EMPTY_FILTERS, 'partial')
    expect(result.map((p) => p.userId)).toEqual(['a', 'b', 'c'])
  })

  it('exact: returns only profiles that match every active filter', () => {
    const result = filterProfiles(
      profiles,
      { ...EMPTY_FILTERS, glasses: 'glasses', hairColor: 'blonde' },
      'exact',
    )
    expect(result.map((p) => p.userId)).toEqual(['a'])
  })

  it('exact: returns empty when no filter is active', () => {
    const result = filterProfiles(profiles, EMPTY_FILTERS, 'exact')
    expect(result).toEqual([])
  })
})
