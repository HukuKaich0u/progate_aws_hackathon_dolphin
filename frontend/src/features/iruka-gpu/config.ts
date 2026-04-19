export const FLEET_SIZE = 126
export const GRID_COLS = 14
export const GRID_ROWS = 9

// iruka_cnn の実際の定型文ラベル (mock event 生成用)
export const LABELS = [
  '了解しました',
  '停止してください',
  '再開してください',
  '助けてください',
  '対象を発見しました',
  '対象は見つかりません',
  'こちらへ来てください',
  '充電が必要です',
  '周囲はクリアです',
  '危険です',
  '天候が悪化しています',
  '探索を開始します',
  '探索を終了します',
  '到着しました',
  '出発します',
  '待機します',
  'もう一度お願いします',
  '少し待ってください',
  '送信します',
  '受信しました',
  '確認しました',
  '状態は正常です',
  '問題ありません',
  '任務完了',
]

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
