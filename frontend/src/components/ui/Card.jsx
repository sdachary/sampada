import { forwardRef } from 'react'

/**
 * Premium Card Component — Double-Bezel (Doppelrand) Architecture
 * Variants: default | elevated | glass | interactive | bordered | shell (double-bezel)
 * Features: double-bezel pattern, glassmorphism, spring hover animations
 */

const variants = {
  default: 'card card--default',
  elevated: 'card card--elevated',
  glass: 'card card--glass',
  interactive: 'card card--interactive',
  bordered: 'card card--bordered',
  // New double-bezel variants
  shell: 'card-shell',
  'shell-interactive': 'card-shell card-shell--interactive',
  'shell-elevated': 'card-shell card-shell--elevated',
  'shell-glass': 'card-shell card-shell--glass',
  'shell-bordered': 'card-shell card-shell--bordered',
}

const corePadding = {
  none: 'card-core--pad-none',
  sm: 'card-core--pad-sm',
  base: 'card-core--pad-base',
  lg: 'card-core--pad-lg',
  xl: 'card-core--pad-xl',
}

function CardComponent({ variant = 'default', className = '', style, children, padded = true, padding = 'base', doubleBezel = false, ...restProps }, ref) {

  const variantClass = variants[variant] || variants.default
  const paddingClass = padded ? (corePadding[padding] || corePadding.base) : ''

  // Double-bezel (shell) architecture
  if (doubleBezel || variant.startsWith('shell')) {
    const shellClass = [
      'card-shell',
      variant === 'shell' ? '' : variantClass.replace('card-shell ', ''),
      className,
    ].filter(Boolean).join(' ')

    return (
      <div ref={ref} className={shellClass} style={style} {...restProps}>
        <div className={`card-core ${paddingClass}`}>
          {children}
        </div>
      </div>
    )
  }

  // Legacy single-layer card (backward compatibility)
  const legacyPaddingClasses = {
    none: '',
    sm: 'card--pad-sm',
    base: 'card--pad-base',
    lg: 'card--pad-lg',
    xl: 'card--pad-xl',
  }

  const legacyPaddingClass = padded ? (legacyPaddingClasses[padding] || legacyPaddingClasses.base) : ''

  const cls = [
    'card',
    variantClass,
    legacyPaddingClass,
    children && 'card--has-children',
  ].filter(Boolean).join(' ')

  return (
    <div ref={ref} className={cls} style={style} {...restProps}>
      {children}
    </div>
  )
}

const Card = forwardRef(CardComponent)
Card.displayName = 'Card'

export default Card