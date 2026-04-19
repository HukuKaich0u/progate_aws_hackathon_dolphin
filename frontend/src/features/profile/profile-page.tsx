import { useEffect, useState, type FormEvent } from 'react'
import {
  getMyProfile as defaultGetMyProfile,
  upsertMyProfile as defaultUpsertMyProfile,
} from './api'
import {
  BOTTOM_STYLE_OPTIONS,
  GENDER_EXPRESSION_OPTIONS,
  GLASSES_OPTIONS,
  HAIR_COLOR_OPTIONS,
  HAIR_STYLE_OPTIONS,
  HEIGHT_RANGE_OPTIONS,
  TOP_COLOR_OPTIONS,
  type Profile,
  type ProfileInput,
  type ProfileOptions,
} from './types'

type ProfilePageProps = {
  getMyProfile?: () => Promise<Profile | null>
  upsertMyProfile?: (input: ProfileInput) => Promise<Profile>
}

const initialInput: ProfileInput = {
  bottomStyle: BOTTOM_STYLE_OPTIONS[0].value,
  genderExpression: GENDER_EXPRESSION_OPTIONS[0].value,
  glasses: GLASSES_OPTIONS[0].value,
  hairColor: HAIR_COLOR_OPTIONS[0].value,
  hairStyle: HAIR_STYLE_OPTIONS[0].value,
  heightRange: HEIGHT_RANGE_OPTIONS[2].value,
  topColor: TOP_COLOR_OPTIONS[0].value,
}

function profileToInput(profile: Profile): ProfileInput {
  return {
    bottomStyle: profile.bottomStyle,
    genderExpression: profile.genderExpression,
    glasses: profile.glasses,
    hairColor: profile.hairColor,
    hairStyle: profile.hairStyle,
    heightRange: profile.heightRange,
    topColor: profile.topColor,
  }
}

export function ProfilePage({
  getMyProfile = defaultGetMyProfile,
  upsertMyProfile = defaultUpsertMyProfile,
}: ProfilePageProps = {}) {
  const [input, setInput] = useState<ProfileInput>(initialInput)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    getMyProfile()
      .then((profile) => {
        if (cancelled) return
        if (profile) setInput(profileToInput(profile))
      })
      .catch((caught: unknown) => {
        if (cancelled) return
        setError(caught instanceof Error ? caught.message : 'プロフィール取得に失敗しました。')
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [getMyProfile])

  function update<K extends keyof ProfileInput>(key: K, value: ProfileInput[K]) {
    setInput((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isSaving) return
    setError(null)
    setNotice(null)
    setIsSaving(true)
    try {
      await upsertMyProfile(input)
      setNotice('保存しました。')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '保存に失敗しました。')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="profile-screen">
      <header className="profile-header">
        <button
          aria-label="戻る"
          className="login-back"
          onClick={() => window.history.back()}
          type="button"
        >
          <svg aria-hidden="true" fill="none" height="20" viewBox="0 0 24 24" width="20">
            <path
              d="M15 5l-7 7 7 7"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
            />
          </svg>
        </button>
        <h1 className="profile-title">あなたの見た目</h1>
        <p className="profile-sub">相手がデコードした時に特定できる外見情報を登録します。</p>
      </header>

      {isLoading ? (
        <p className="profile-loading">読み込み中...</p>
      ) : (
        <form className="profile-form" onSubmit={handleSubmit}>
          <Field
            label="髪色"
            options={HAIR_COLOR_OPTIONS}
            onChange={(value) => update('hairColor', value)}
            value={input.hairColor}
          />
          <Field
            label="髪型"
            options={HAIR_STYLE_OPTIONS}
            onChange={(value) => update('hairStyle', value)}
            value={input.hairStyle}
          />
          <Field
            label="メガネ"
            options={GLASSES_OPTIONS}
            onChange={(value) => update('glasses', value)}
            value={input.glasses}
          />
          <Field
            label="トップスの色"
            options={TOP_COLOR_OPTIONS}
            onChange={(value) => update('topColor', value)}
            value={input.topColor}
          />
          <Field
            label="ボトムスの系統"
            options={BOTTOM_STYLE_OPTIONS}
            onChange={(value) => update('bottomStyle', value)}
            value={input.bottomStyle}
          />
          <Field
            label="身長"
            options={HEIGHT_RANGE_OPTIONS}
            onChange={(value) => update('heightRange', value)}
            value={input.heightRange}
          />
          <Field
            label="見た目の性別表現"
            options={GENDER_EXPRESSION_OPTIONS}
            onChange={(value) => update('genderExpression', value)}
            value={input.genderExpression}
          />

          {error ? <p className="login-error" role="alert">{error}</p> : null}
          {notice ? <p className="signup-notice">{notice}</p> : null}

          <button className="login-submit" disabled={isSaving} type="submit">
            {isSaving ? '保存中...' : '保存する'}
          </button>
        </form>
      )}
    </div>
  )
}

type FieldProps = {
  label: string
  options: ProfileOptions[]
  onChange: (value: string) => void
  value: string
}

function Field({ label, options, onChange, value }: FieldProps) {
  return (
    <label className="profile-field">
      <span className="profile-field-label">{label}</span>
      <select
        className="profile-select"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  )
}
