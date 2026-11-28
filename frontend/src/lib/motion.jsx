// Motion foundation (Step 3). Constants mirror the CSS tokens in styles/tokens.css.
// Use `m` from 'motion/react' — LazyMotion(strict) rejects `motion` to keep the bundle small.
import { LazyMotion, domAnimation, MotionConfig } from 'motion/react'

export const DUR = { fast: 0.12, base: 0.2, slow: 0.32, slower: 0.48, slowest: 0.64 } // mirrors --dur-fast/base/slow/slower/slowest

// Easing variants (mirror tokens.css)
export const EASE = [0.2, 0, 0, 1] // --ease (default)
export const EASE_EXPO_OUT = [0.19, 1, 0.22, 1] // --ease-expo-out (entrances 640ms+)
export const EASE_SPRING = [0.34, 1.56, 0.64, 1] // --ease-spring (spring interactions)
export const EASE_SPRING_GENTLE = [0.25, 1, 0.5, 1] // --ease-spring-gentle (micro-interactions)
export const EASE_OUT = [0, 0, 0.2, 1] // --ease-out (exits 200ms)

export function MotionProvider({ children }) {
  return (
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion="user" transition={{ duration: DUR.base, ease: EASE }}>
        {children}
      </MotionConfig>
    </LazyMotion>
  )
}
