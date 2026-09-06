'use client'

import type { Key, ReactNode } from 'react'
import * as React from 'react'
import { Button, type ButtonProps } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export interface DynamicButtonProps extends Omit<ButtonProps, 'children'> {
  /** The label. A string, because the button animates between labels. */
  children: string
  icon?: ReactNode
  /** Changing this swaps the contents. Defaults to the label itself. */
  stateKey?: Key
  /** `content` animates the width to fit the label; `full` fills its container. */
  width?: 'content' | 'full'
}

/**
 * A button whose label and icon can change while it is on screen — "Add to
 * bag" → "Added", "Copy" → "Copied" — without the layout jumping: the width
 * eases to the new label and the contents cross over in place.
 *
 * Built on the plain `Button` so every variant, size and focus style is the
 * same as everywhere else, and on CSS transitions rather than a motion
 * library. The global `prefers-reduced-motion` reset in `globals.css` turns
 * all of it off.
 */
export const DynamicButton = React.forwardRef<HTMLButtonElement, DynamicButtonProps>(
  function DynamicButton(
    { children, className, icon, stateKey, width = 'content', ...props },
    forwardedRef,
  ) {
    const buttonRef = React.useRef<HTMLButtonElement>(null)
    const measureRef = React.useRef<HTMLSpanElement>(null)
    const [measuredWidth, setMeasuredWidth] = React.useState<number | null>(null)

    React.useImperativeHandle(forwardedRef, () => buttonRef.current as HTMLButtonElement)

    const contentKey = stateKey ?? children
    const measuresWidth = width === 'content'

    // The visible label is absolutely positioned so it cannot stretch the
    // button; the hidden copy is what the width is measured from.
    React.useLayoutEffect(() => {
      const button = buttonRef.current
      const measure = measureRef.current

      if (!button || !measure || !measuresWidth) {
        setMeasuredWidth(null)
        return
      }

      const sync = () => {
        const styles = window.getComputedStyle(button)
        const frame =
          Number.parseFloat(styles.paddingLeft) +
          Number.parseFloat(styles.paddingRight) +
          Number.parseFloat(styles.borderLeftWidth) +
          Number.parseFloat(styles.borderRightWidth)

        const next = Math.ceil(measure.scrollWidth + frame)
        setMeasuredWidth((current) => (current === next ? current : next))
      }

      sync()

      // Fonts land after first paint and containers reflow, so keep watching
      // rather than measuring once.
      const observer = new ResizeObserver(sync)
      observer.observe(measure)
      window.addEventListener('resize', sync)

      return () => {
        observer.disconnect()
        window.removeEventListener('resize', sync)
      }
    }, [measuresWidth])

    return (
      <Button
        className={cn(
          'relative overflow-hidden whitespace-nowrap transition-[width,color,background-color,border-color] active:scale-[0.98]',
          width === 'full' && 'w-full',
          className,
        )}
        ref={buttonRef}
        style={measuresWidth && measuredWidth !== null ? { width: measuredWidth } : undefined}
        {...props}
      >
        <span
          className="absolute inset-0 flex animate-in items-center justify-center gap-2 fade-in slide-in-from-bottom-2 duration-200 ease-[var(--ease-out-soft)]"
          key={contentKey}
        >
          {icon}
          {children}
        </span>

        {/* Sizing ghost: laid out, never seen, never read aloud. */}
        <span aria-hidden className="inline-flex items-center gap-2 opacity-0" ref={measureRef}>
          {icon}
          {children}
        </span>
      </Button>
    )
  },
)
