import type { InputHTMLAttributes } from 'react'
import { useId, useState } from 'react'

type FormFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string
  error?: string | null
  hint?: string
}

export function FormField({ label, error, hint, id, className = '', ...props }: FormFieldProps) {
  const generatedId = useId()
  const inputId = id || generatedId
  const messageId = `${inputId}-message`
  const describedBy = error || hint ? messageId : undefined

  return (
    <div className="field">
      <label className="field__label" htmlFor={inputId}>
        {label}
      </label>
      <input
        className={`field__input ${error ? 'field__input--error' : ''} ${className}`.trim()}
        id={inputId}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy}
        {...props}
      />
      {(error || hint) && (
        <p
          className={error ? 'field__message field__message--error' : 'field__message'}
          id={messageId}
        >
          {error || hint}
        </p>
      )}
    </div>
  )
}

type PasswordFieldProps = Omit<FormFieldProps, 'type'> & {
  showLabel: string
  hideLabel: string
}

export function PasswordField({
  showLabel,
  hideLabel,
  label,
  error,
  hint,
  id,
  className = '',
  ...props
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false)
  const generatedId = useId()
  const inputId = id || generatedId
  const messageId = `${inputId}-message`
  const describedBy = error || hint ? messageId : undefined

  return (
    <div className="field">
      <label className="field__label" htmlFor={inputId}>
        {label}
      </label>
      <div className="password-field">
        <input
          className={`field__input ${error ? 'field__input--error' : ''} ${className}`.trim()}
          id={inputId}
          type={visible ? 'text' : 'password'}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          {...props}
        />
        <button
          className="password-field__toggle"
          type="button"
          aria-label={visible ? hideLabel : showLabel}
          aria-pressed={visible}
          onClick={() => setVisible((current) => !current)}
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" focusable="false">
            {visible ? (
              <>
                <path d="M3 3 21 21" />
                <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
                <path d="M9.4 4.4A10.8 10.8 0 0 1 12 4c5.5 0 9 4.7 9 8a9.8 9.8 0 0 1-2.1 4.4" />
                <path d="M6.2 6.2C4.2 7.6 3 10 3 12c0 3.3 3.5 8 9 8 1.4 0 2.7-.3 3.8-.8" />
              </>
            ) : (
              <>
                <path d="M3 12s3.5-8 9-8 9 8 9 8-3.5 8-9 8-9-8-9-8Z" />
                <circle cx="12" cy="12" r="2.5" />
              </>
            )}
          </svg>
        </button>
      </div>
      {(error || hint) && (
        <p
          className={error ? 'field__message field__message--error' : 'field__message'}
          id={messageId}
        >
          {error || hint}
        </p>
      )}
    </div>
  )
}
