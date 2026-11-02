// Motion foundation (Step 3). Constants mirror the CSS tokens in styles/tokens.css.
// Use `m` from 'motion/react' — LazyMotion(strict) rejects `motion` to keep the bundle small.
import { LazyMotion, domAnimation, MotionConfig } from 'motion/react'

export const DUR = { fast: 0.12, base: 0.2, slow: 0.32 } // mirrors --dur-fast/base/slow
export const EASE = [0.2, 0, 0, 1] // mirrors --ease

export function MotionProvider({ children }) {
  return (
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion="user" transition={{ duration: DUR.base, ease: EASE }}>
        {children}
      </MotionConfig>
    </LazyMotion>
  )
}
