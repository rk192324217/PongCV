import { useEffect, useRef, useCallback } from 'react'

// useGameLoop runs a callback at ~60fps using requestAnimationFrame.
// It handles starting, stopping, and pausing cleanly.
//
// WHAT YOU LEARN HERE:
// - requestAnimationFrame: the browser's way to sync with the display refresh rate
//   (much better than setInterval for animations — it pauses when tab is hidden)
// - useRef for mutable values that shouldn't trigger re-renders
// - How to properly cancel animation frames to prevent memory leaks

export function useGameLoop(callback, active = true) {
  // Store the callback in a ref so the loop always has the latest version
  // without needing to restart when the callback changes
  const callbackRef = useRef(callback)
  const frameRef    = useRef(null)  // stores the RAF id so we can cancel it
  const lastTimeRef = useRef(null)

  // Keep callbackRef current — useLayoutEffect runs synchronously before paint
  useEffect(() => {
    callbackRef.current = callback
  })

  const stop = useCallback(() => {
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current)
      frameRef.current  = null
      lastTimeRef.current = null
    }
  }, [])

  const start = useCallback(() => {
    if (frameRef.current !== null) return // already running

    const loop = (timestamp) => {
      // Calculate delta time (seconds since last frame)
      // Cap at 100ms to prevent spiral of death if tab was hidden
      const dt = lastTimeRef.current === null
        ? 1 / 60
        : Math.min((timestamp - lastTimeRef.current) / 1000, 0.1)

      lastTimeRef.current = timestamp

      // Call the game update/render function
      callbackRef.current(dt)

      // Schedule next frame
      frameRef.current = requestAnimationFrame(loop)
    }

    frameRef.current = requestAnimationFrame(loop)
  }, [])

  // Start/stop based on the active flag
  useEffect(() => {
    if (active) {
      start()
    } else {
      stop()
    }
    // Cleanup: always stop the loop when the component unmounts
    return stop
  }, [active, start, stop])

  return { start, stop }
}
