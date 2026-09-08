import {
  useRef,
  useState,
  type ChangeEvent,
  type ClipboardEvent,
  type KeyboardEvent,
} from 'react'

const PIN_LENGTH = 4

export function AuthPinField({
  value,
  onChange,
  id = 'auth-pin',
  ariaLabel = '4-digit PIN',
}: {
  value: string
  onChange: (pin: string) => void
  id?: string
  ariaLabel?: string
}) {
  const inputsRef = useRef<Array<HTMLInputElement | null>>([])
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null)

  const digits = Array.from({ length: PIN_LENGTH }, (_, i) => value[i] ?? '')

  const emit = (nextDigits: string[]) => {
    onChange(nextDigits.join('').replace(/\D/g, '').slice(0, PIN_LENGTH))
  }

  const focusAt = (index: number) => {
    const el = inputsRef.current[index]
    if (!el) return
    el.focus()
    el.select()
  }

  const fillFrom = (index: number, raw: string) => {
    const chars = raw.replace(/\D/g, '')
    if (!chars) {
      const next = [...digits]
      next[index] = ''
      emit(next)
      return
    }

    const next = [...digits]
    let cursor = index
    for (const ch of chars) {
      if (cursor >= PIN_LENGTH) break
      next[cursor] = ch
      cursor += 1
    }
    emit(next)

    if (cursor >= PIN_LENGTH) {
      inputsRef.current[PIN_LENGTH - 1]?.blur()
    } else {
      focusAt(cursor)
    }
  }

  const handleChange = (index: number, event: ChangeEvent<HTMLInputElement>) => {
    fillFrom(index, event.target.value)
  }

  const handleKeyDown = (index: number, event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Backspace' && !digits[index] && index > 0) {
      event.preventDefault()
      const next = [...digits]
      next[index - 1] = ''
      emit(next)
      focusAt(index - 1)
      return
    }

    if (event.key === 'ArrowLeft' && index > 0) {
      event.preventDefault()
      focusAt(index - 1)
    }

    if (event.key === 'ArrowRight' && index < PIN_LENGTH - 1) {
      event.preventDefault()
      focusAt(index + 1)
    }
  }

  const handlePaste = (index: number, event: ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault()
    fillFrom(index, event.clipboardData.getData('text'))
  }

  return (
    <div className="auth-pin-field" role="group" aria-label={ariaLabel}>
      {digits.map((digit, index) => {
        const filled = digit.length > 0
        const focused = focusedIndex === index
        return (
          <div
            key={`${id}-${index}`}
            className={`auth-pin-cell${filled ? ' filled' : ''}${focused ? ' focused' : ''}`}
          >
            <input
              ref={(el) => {
                inputsRef.current[index] = el
              }}
              id={index === 0 ? id : `${id}-${index + 1}`}
              className="auth-pin-input"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              pattern="[0-9]*"
              maxLength={PIN_LENGTH}
              value={digit}
              aria-label={`PIN digit ${index + 1} of ${PIN_LENGTH}`}
              onChange={(event) => handleChange(index, event)}
              onKeyDown={(event) => handleKeyDown(index, event)}
              onPaste={(event) => handlePaste(index, event)}
              onFocus={() => {
                setFocusedIndex(index)
                inputsRef.current[index]?.select()
              }}
              onBlur={() =>
                setFocusedIndex((current) => (current === index ? null : current))
              }
            />
          </div>
        )
      })}
    </div>
  )
}
