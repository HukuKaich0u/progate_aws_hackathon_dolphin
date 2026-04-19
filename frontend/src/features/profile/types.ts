export type Profile = {
  userId: string
  hairColor: string
  hairStyle: string
  glasses: string
  topColor: string
  bottomStyle: string
  heightRange: string
  genderExpression: string
}

export type ProfileInput = Omit<Profile, 'userId'>

export type ProfileOptions = {
  label: string
  value: string
}

export const HAIR_COLOR_OPTIONS: ProfileOptions[] = [
  { label: '黒', value: 'black' },
  { label: '茶', value: 'brown' },
  { label: '金', value: 'blonde' },
  { label: '白・灰', value: 'white_gray' },
  { label: '赤系', value: 'red' },
  { label: 'その他', value: 'other' },
]

export const HAIR_STYLE_OPTIONS: ProfileOptions[] = [
  { label: 'ショート', value: 'short' },
  { label: 'ミディアム', value: 'medium' },
  { label: 'ロング', value: 'long' },
  { label: 'スキン(坊主)', value: 'shaved' },
]

export const GLASSES_OPTIONS: ProfileOptions[] = [
  { label: 'なし', value: 'none' },
  { label: 'メガネ', value: 'glasses' },
  { label: 'サングラス', value: 'sunglasses' },
]

export const TOP_COLOR_OPTIONS: ProfileOptions[] = [
  { label: '白', value: 'white' },
  { label: '黒', value: 'black' },
  { label: '灰', value: 'gray' },
  { label: '赤', value: 'red' },
  { label: '青', value: 'blue' },
  { label: '緑', value: 'green' },
  { label: '黄', value: 'yellow' },
  { label: 'ベージュ', value: 'beige' },
  { label: 'ピンク', value: 'pink' },
  { label: 'その他', value: 'other' },
]

export const BOTTOM_STYLE_OPTIONS: ProfileOptions[] = [
  { label: 'パンツ', value: 'pants' },
  { label: 'スカート', value: 'skirt' },
  { label: 'ワンピース', value: 'dress' },
]

export const HEIGHT_RANGE_OPTIONS: ProfileOptions[] = [
  { label: '〜155cm', value: 'under_155' },
  { label: '155〜165cm', value: '155_165' },
  { label: '165〜175cm', value: '165_175' },
  { label: '175〜185cm', value: '175_185' },
  { label: '185cm〜', value: 'over_185' },
]

export const GENDER_EXPRESSION_OPTIONS: ProfileOptions[] = [
  { label: '男性寄り', value: 'masculine' },
  { label: '女性寄り', value: 'feminine' },
  { label: '中性・その他', value: 'androgynous_other' },
]
