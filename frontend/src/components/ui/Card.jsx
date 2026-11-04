import { forwardRef } from 'react'

/**
 * Premium Card Component
 * Variants: default | elevated | glass | interactive | bordered
 * Features: double-bezel pattern, glassmorphism, spring hover animations
 */

const variants = {
  default: 'card card--default',
  elevated: 'card card--elevated',
  glass: 'card card--glass',
  interactive: 'card card--interactive',
  bordered: 'card card--bordered',
}

function CardComponent(parameters, ref) {
  const {
    variant = 'default',
    className = '',
    style,
    children,
    padded = true,
    padding = 'base',
    ...restProps
  } = parameters

  const variantClass = variants[variant] || variants.default

  const paddingClasses = {
    none: '',
    sm: 'card--pad-sm',
    base: 'card--pad-base',
    lg: 'card--pad-lg',
    xl: 'card--pad-xl',
  }

  const paddingClass = padded ? (paddingClasses[padding] || paddingClasses.base) : ''

  const cls = [
    'card',
    variantClass,
    paddingClass,
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