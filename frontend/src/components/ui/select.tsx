import type { ChangeEventHandler } from 'react'

type SelectOption = {
  label: string
  value: string
}

type SelectProps = {
  onChange?: ChangeEventHandler<HTMLSelectElement>
  options: SelectOption[]
  value?: string
}

export function Select({ onChange, options, value }: SelectProps) {
  return (
    <select onChange={onChange} value={value}>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  )
}
