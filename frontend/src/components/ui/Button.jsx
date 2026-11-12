import { forwardRef } from 'react'

const variants = {
  primary: 'btn btn--primary',
  secondary: 'btn btn--secondary',
  ghost: 'btn btn--ghost',
  outline: 'btn btn--outline',
  glass: 'btn btn--glass',
  danger: 'btn btn--danger',
  success: 'btn btn--success',
}

const sizes = {
  sm: 'btn--sm',
  base: '',
  lg: 'btn--lg',
  xl: 'btn--xl',
}

function ButtonComponent(parameters, ref) {
  const {
    variant = 'primary',
    size = 'base',
    loading = false,
    children,
    className = '',
    disabled,
    trailingIcon,
    leadingIcon,
    glass = false,
    as: Tag = 'button',
    'aria-label': ariaLabel,
    ...restProps
  } = parameters

  const variantClass = variants[variant] || variants.primary
  const sizeClass = sizes[size] || ''
  const glassClass = glass ? 'btn--glass' : ''

  const cls = [
    'btn',
    variantClass,
    sizeClass,
    glassClass,
    className,
  ].filter(Boolean).join(' ')

  const isDisabled = disabled || loading

  // Default trailing arrow for primary buttons
  const defaultTrailingArrow = (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="btn__arrow" aria-hidden="true">
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  )

  const trailingContent = trailingIcon || (variant === 'primary' && !loading ? defaultTrailingArrow : null)

  return (
    <Tag
      ref={ref}
      className={cls}
      disabled={Tag === 'button' ? isDisabled : undefined}
      aria-busy={loading}
      aria-disabled={isDisabled}
      aria-label={ariaLabel}
      {...restProps}
    >
      {loading ? (
        <span className="btn__spinner" role="status" aria-label="Loading" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="btn__spinner-svg">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeDasharray="31.4 31.4" className="btn__spinner-circle" />
          </svg>
          <span className="sr-only">Loading...</span>
        </span>
      ) : (
        <>
          {leadingIcon && (
            <span className="btn__icon btn__icon--leading" aria-hidden="true">
              {leadingIcon}
            </span>
          )}
          <span className="btn__content">{children}</span>
          {trailingContent && (
            <span className="btn__icon-wrapper" aria-hidden="true">
              {trailingContent}
            </span>
          )}
        </>
      )}
    </Tag>
  )
}

const Button = forwardRef(ButtonComponent)
Button.displayName = 'Button'

export default Button