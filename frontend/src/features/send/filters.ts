import type { Profile } from '../profile/types'

export type ProfileFilters = {
  hairColor: string | null
  hairStyle: string | null
  glasses: string | null
  topColor: string | null
  bottomStyle: string | null
  heightRange: string | null
  genderExpression: string | null
}

export type MatchMode = 'partial' | 'exact'

export const EMPTY_FILTERS: ProfileFilters = {
  bottomStyle: null,
  genderExpression: null,
  glasses: null,
  hairColor: null,
  hairStyle: null,
  heightRange: null,
  topColor: null,
}

type FieldPair = [keyof ProfileFilters, keyof Profile]

const FIELD_PAIRS: FieldPair[] = [
  ['hairColor', 'hairColor'],
  ['hairStyle', 'hairStyle'],
  ['glasses', 'glasses'],
  ['topColor', 'topColor'],
  ['bottomStyle', 'bottomStyle'],
  ['heightRange', 'heightRange'],
  ['genderExpression', 'genderExpression'],
]

export function filterProfiles(
  profiles: Profile[],
  filters: ProfileFilters,
  mode: MatchMode,
): Profile[] {
  const activePairs = FIELD_PAIRS.filter(([filterKey]) => filters[filterKey] !== null)

  if (mode === 'exact') {
    if (activePairs.length === 0) return []
    return profiles.filter((profile) =>
      activePairs.every(([filterKey, profileKey]) => profile[profileKey] === filters[filterKey]),
    )
  }

  if (activePairs.length === 0) return profiles
  return profiles.filter((profile) =>
    activePairs.some(([filterKey, profileKey]) => profile[profileKey] === filters[filterKey]),
  )
}
