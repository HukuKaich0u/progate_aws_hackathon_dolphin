export type SendMessage = {
  id: string
  label: string
  frequencyHz: number
}

export const SEND_MESSAGES: SendMessage[] = [
  { frequencyHz: 18000, id: 'like', label: '好き' },
  { frequencyHz: 18200, id: 'cool', label: 'かっこいい' },
  { frequencyHz: 18400, id: 'cute', label: 'かわいい' },
  { frequencyHz: 18600, id: 'treat', label: '奢ります' },
  { frequencyHz: 18800, id: 'sneak_out', label: '抜け出しませんか' },
  { frequencyHz: 19000, id: 'smoke_outside', label: '外でタバコ吸いませんか' },
  { frequencyHz: 19200, id: 'love_at_first_sight', label: '一目惚れです' },
  { frequencyHz: 19400, id: 'change_venue', label: '別のお店行きませんか' },
]
