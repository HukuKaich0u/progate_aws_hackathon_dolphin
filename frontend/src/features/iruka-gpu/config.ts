export const FLEET_SIZE = 126
export const GRID_COLS = 14
export const GRID_ROWS = 9

// iruka_cnn の定型文とその内部キー。text はモック時のレスポンス表示にも使う。
// key は `/infer` 時に WAV 選択のために parent gateway へ渡す識別子。
export interface Phrase {
  key: string
  text: string
}

export const PHRASES: readonly Phrase[] = [
  { key: 'ack_yes', text: '了解しました' },
  { key: 'ack_no', text: '難しいです' },
  { key: 'ack_wait', text: '少し待ってください' },
  { key: 'status_ok', text: '問題ありません' },
  { key: 'status_help', text: '助けてください' },
  { key: 'status_arrived', text: '到着しました' },
  { key: 'status_depart', text: '出発します' },
  { key: 'status_return', text: '戻ります' },
  { key: 'status_search', text: '探索を開始します' },
  { key: 'status_found', text: '対象を発見しました' },
  { key: 'status_not_found', text: '対象は見つかりません' },
  { key: 'status_stop', text: '停止してください' },
  { key: 'status_resume', text: '再開してください' },
  { key: 'status_danger', text: '危険です' },
  { key: 'status_safe', text: '安全を確認しました' },
  { key: 'status_follow', text: 'こちらへ来てください' },
  { key: 'status_hold', text: 'その場で待機してください' },
  { key: 'status_charge', text: '充電が必要です' },
  { key: 'status_complete', text: '作業完了です' },
  { key: 'status_retry', text: 'もう一度お願いします' },
  { key: 'status_receive', text: '受信しました' },
  { key: 'status_send', text: '送信します' },
  { key: 'status_weather', text: '天候が悪化しています' },
  { key: 'status_clear', text: '周囲はクリアです' },
]

/** Back-compat: text 一覧だけ欲しい箇所向け (mock-events 等)。 */
export const LABELS: readonly string[] = PHRASES.map((p) => p.text)

// Colors
export const COLORS = {
  oceanTop: 0x06132a,
  oceanBottom: 0x00060f,
  dolphinIdle: 0xe6f2ff,
  dolphinIdleTint: 0xffffff,
  dolphinBusy: 0xfbbf24,
  dolphinReturned: 0x34d399,
  dolphinError: 0xef4444,
  parentCoreOuter: 0x1d4ed8,
  parentCoreMid: 0x3b82f6,
  parentCoreInner: 0xfbbf24,
  parentCoreDot: 0xffffff,
  rippleOuter: 0x60a5fa,
  rippleInner: 0x93c5fd,
  resultSparkle: 0xfde68a,
  gridGuide: 0x0e1f3c,
} as const
