import { useEffect, useMemo, useState } from 'react'
import { listProfiles as defaultListProfiles } from '../profile/api'
import {
  BOTTOM_STYLE_OPTIONS,
  GENDER_EXPRESSION_OPTIONS,
  GLASSES_OPTIONS,
  HAIR_COLOR_OPTIONS,
  HAIR_STYLE_OPTIONS,
  HEIGHT_RANGE_OPTIONS,
  TOP_COLOR_OPTIONS,
  type Profile,
  type ProfileOptions,
} from '../profile/types'
import { EMPTY_FILTERS, filterProfiles, type MatchMode, type ProfileFilters } from './filters'
import { SEND_MESSAGES, type SendMessage } from './messages'
import { createWebAudioTransmitter, type Transmitter } from './transmitter'

type SendPageProps = {
  listProfiles?: () => Promise<Profile[]>
  transmitter?: Transmitter
}

function labelFor(options: ProfileOptions[], value: string): string {
  return options.find((option) => option.value === value)?.label ?? value
}

function describeProfile(profile: Profile): string {
  return [
    labelFor(HAIR_COLOR_OPTIONS, profile.hairColor),
    labelFor(HAIR_STYLE_OPTIONS, profile.hairStyle),
    labelFor(GLASSES_OPTIONS, profile.glasses),
    `${labelFor(TOP_COLOR_OPTIONS, profile.topColor)}トップス`,
    labelFor(BOTTOM_STYLE_OPTIONS, profile.bottomStyle),
    labelFor(HEIGHT_RANGE_OPTIONS, profile.heightRange),
    labelFor(GENDER_EXPRESSION_OPTIONS, profile.genderExpression),
  ].join(' / ')
}

export function SendPage({
  listProfiles = defaultListProfiles,
  transmitter,
}: SendPageProps = {}) {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [filters, setFilters] = useState<ProfileFilters>(EMPTY_FILTERS)
  const [matchMode, setMatchMode] = useState<MatchMode>('partial')
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [playbackError, setPlaybackError] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [outputLevelDb, setOutputLevelDb] = useState<number | null>(null)
  const [playingMessage, setPlayingMessage] = useState<SendMessage | null>(null)

  const tx = useMemo(() => transmitter ?? createWebAudioTransmitter(), [transmitter])

  useEffect(() => {
    let cancelled = false
    listProfiles()
      .then((fetched) => {
        if (!cancelled) setProfiles(fetched)
      })
      .catch((caught: unknown) => {
        if (!cancelled) {
          setLoadError(caught instanceof Error ? caught.message : 'プロフィール一覧の取得に失敗しました。')
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [listProfiles])

  const filtered = useMemo(
    () => filterProfiles(profiles, filters, matchMode),
    [profiles, filters, matchMode],
  )

  function updateFilter<K extends keyof ProfileFilters>(key: K, value: ProfileFilters[K]) {
    setFilters((prev) => ({ ...prev, [key]: value }))
    setSelectedUserId(null)
  }

  async function handleSend(message: SendMessage) {
    if (!selectedUserId) return
    setPlaybackError(null)
    setStatus(null)
    setIsPlaying(true)
    setPlayingMessage(message)
    setOutputLevelDb(null)
    try {
      await tx.play(message.frequencyHz, {
        onLevel: (db) => setOutputLevelDb(db),
      })
      setStatus(`「${message.label}」を ${message.frequencyHz} Hz で送信しました。`)
    } catch (caught) {
      setPlaybackError(caught instanceof Error ? caught.message : '音声の再生に失敗しました。')
    } finally {
      setIsPlaying(false)
      setPlayingMessage(null)
      setOutputLevelDb(null)
    }
  }

  return (
    <div className="send-screen">
      <header className="send-header">
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
        <h1 className="send-title">メッセージを贈る</h1>
        <p className="send-sub">見た目で相手を絞って、固定メッセージを高周波で送ります。</p>
      </header>

      <section className="send-filters" aria-label="絞り込み">
        <div className="send-mode">
          <label className="send-mode-option">
            <input
              checked={matchMode === 'partial'}
              name="match-mode"
              onChange={() => setMatchMode('partial')}
              type="radio"
              value="partial"
            />
            <span>部分一致（どれか当てはまれば表示）</span>
          </label>
          <label className="send-mode-option">
            <input
              checked={matchMode === 'exact'}
              name="match-mode"
              onChange={() => setMatchMode('exact')}
              type="radio"
              value="exact"
            />
            <span>完全一致（全部同じ人だけ表示）</span>
          </label>
        </div>

        <FilterSelect
          label="髪色"
          options={HAIR_COLOR_OPTIONS}
          onChange={(value) => updateFilter('hairColor', value)}
          value={filters.hairColor}
        />
        <FilterSelect
          label="髪型"
          options={HAIR_STYLE_OPTIONS}
          onChange={(value) => updateFilter('hairStyle', value)}
          value={filters.hairStyle}
        />
        <FilterSelect
          label="メガネ"
          options={GLASSES_OPTIONS}
          onChange={(value) => updateFilter('glasses', value)}
          value={filters.glasses}
        />
        <FilterSelect
          label="トップスの色"
          options={TOP_COLOR_OPTIONS}
          onChange={(value) => updateFilter('topColor', value)}
          value={filters.topColor}
        />
        <FilterSelect
          label="ボトムス"
          options={BOTTOM_STYLE_OPTIONS}
          onChange={(value) => updateFilter('bottomStyle', value)}
          value={filters.bottomStyle}
        />
        <FilterSelect
          label="身長"
          options={HEIGHT_RANGE_OPTIONS}
          onChange={(value) => updateFilter('heightRange', value)}
          value={filters.heightRange}
        />
        <FilterSelect
          label="見た目の性別表現"
          options={GENDER_EXPRESSION_OPTIONS}
          onChange={(value) => updateFilter('genderExpression', value)}
          value={filters.genderExpression}
        />
      </section>

      <section className="send-list" aria-label="候補一覧">
        {isLoading ? <p className="profile-loading">読み込み中...</p> : null}
        {loadError ? <p className="login-error" role="alert">{loadError}</p> : null}
        {!isLoading && !loadError && filtered.length === 0 ? (
          <p className="send-empty">
            {matchMode === 'exact'
              ? '条件を1つ以上選ぶと、完全一致する人が表示されます。'
              : '該当するプロフィールが見つかりませんでした。'}
          </p>
        ) : null}
        <ul className="send-candidates">
          {filtered.map((profile) => {
            const isSelected = selectedUserId === profile.userId
            return (
              <li key={profile.userId}>
                <button
                  aria-pressed={isSelected}
                  className={isSelected ? 'send-candidate send-candidate--selected' : 'send-candidate'}
                  onClick={() => setSelectedUserId(profile.userId)}
                  type="button"
                >
                  <span className="send-candidate-desc">{describeProfile(profile)}</span>
                </button>
              </li>
            )
          })}
        </ul>
      </section>

      <section className="send-messages" aria-label="メッセージ">
        <h2 className="send-section-title">メッセージを選んで送信</h2>
        <div className="send-message-grid">
          {SEND_MESSAGES.map((message) => (
            <button
              className="send-message-button"
              disabled={!selectedUserId || isPlaying}
              key={message.id}
              onClick={() => void handleSend(message)}
              type="button"
            >
              <span className="send-message-label">{message.label}</span>
              <span className="send-message-freq">{message.frequencyHz} Hz</span>
            </button>
          ))}
        </div>
        {!selectedUserId ? (
          <p className="send-hint">まず上から1人選んでください。</p>
        ) : null}

        {isPlaying && playingMessage ? (
          <div className="send-output" role="status" aria-live="polite">
            <div className="send-output-head">
              <span className="send-output-label">
                送信中: {playingMessage.label}
              </span>
              <span className="send-output-meta">
                {playingMessage.frequencyHz} Hz
              </span>
            </div>
            <div className="send-output-bar">
              <div
                className="send-output-bar-fill"
                style={{
                  width:
                    outputLevelDb === null || !Number.isFinite(outputLevelDb)
                      ? '0%'
                      : `${Math.max(0, Math.min(100, ((outputLevelDb - -100) / 80) * 100))}%`,
                }}
              />
            </div>
            <span className="send-output-db">
              {outputLevelDb === null || !Number.isFinite(outputLevelDb)
                ? '出力を測定中…'
                : `${outputLevelDb.toFixed(1)} dB @ ${playingMessage.frequencyHz} Hz`}
            </span>
          </div>
        ) : null}

        {status ? <p className="signup-notice">{status}</p> : null}
        {playbackError ? <p className="login-error" role="alert">{playbackError}</p> : null}
      </section>
    </div>
  )
}

type FilterSelectProps = {
  label: string
  options: ProfileOptions[]
  onChange: (value: string | null) => void
  value: string | null
}

function FilterSelect({ label, options, onChange, value }: FilterSelectProps) {
  return (
    <label className="profile-field">
      <span className="profile-field-label">{label}</span>
      <select
        className="profile-select"
        onChange={(event) => onChange(event.target.value === '' ? null : event.target.value)}
        value={value ?? ''}
      >
        <option value="">指定なし</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  )
}
