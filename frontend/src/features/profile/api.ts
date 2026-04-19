import { apiClient } from '../../lib/http/api-client'
import type { Profile, ProfileInput } from './types'

type ApiProfile = {
  user_id: string
  hair_color: string
  hair_style: string
  glasses: string
  top_color: string
  bottom_style: string
  height_range: string
  gender_expression: string
}

function fromApi(raw: ApiProfile): Profile {
  return {
    userId: raw.user_id,
    hairColor: raw.hair_color,
    hairStyle: raw.hair_style,
    glasses: raw.glasses,
    topColor: raw.top_color,
    bottomStyle: raw.bottom_style,
    heightRange: raw.height_range,
    genderExpression: raw.gender_expression,
  }
}

function toApi(input: ProfileInput) {
  return {
    hair_color: input.hairColor,
    hair_style: input.hairStyle,
    glasses: input.glasses,
    top_color: input.topColor,
    bottom_style: input.bottomStyle,
    height_range: input.heightRange,
    gender_expression: input.genderExpression,
  }
}

export async function listProfiles(): Promise<Profile[]> {
  const response = await apiClient('/v1/profiles')
  if (!response.ok) {
    throw new Error(`Failed to fetch profiles (${response.status})`)
  }
  const raw = (await response.json()) as ApiProfile[]
  return raw.map(fromApi)
}

export async function getMyProfile(): Promise<Profile | null> {
  const response = await apiClient('/v1/me/profile')
  if (response.status === 404) {
    return null
  }
  if (!response.ok) {
    throw new Error(`Failed to fetch profile (${response.status})`)
  }
  const raw = (await response.json()) as ApiProfile
  return fromApi(raw)
}

export async function upsertMyProfile(input: ProfileInput): Promise<Profile> {
  const response = await apiClient('/v1/me/profile', {
    body: JSON.stringify(toApi(input)),
    method: 'PUT',
  })
  if (!response.ok) {
    throw new Error(`Failed to save profile (${response.status})`)
  }
  const raw = (await response.json()) as ApiProfile
  return fromApi(raw)
}
