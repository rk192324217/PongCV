import { useEffect, useRef, useState, useCallback } from 'react'
import { useSettingsStore } from '../store/settingsStore.js'

// useHandTracking encapsulates ALL MediaPipe logic.
// It returns the current smoothed paddle Y positions (0..1).
// The component that uses this hook never touches MediaPipe directly.
//
// WHAT YOU LEARN HERE:
// - useRef: holds values that shouldn't trigger re-renders (detector, smoothed positions)
// - useEffect: runs side effects (starting the camera, cleaning up on unmount)
// - useCallback: memoises a function so it doesn't get recreated every render

export function useHandTracking(videoRef, canvasRef) {
  const sensitivity = useSettingsStore((s) => s.sensitivity)
  const deadZone    = useSettingsStore((s) => s.deadZone)
  const smoothing   = useSettingsStore((s) => s.smoothing)

  // useRef stores values that persist across renders but don't cause re-renders.
  // If we used useState here, every hand position update would re-render the component.
  const detectorRef  = useRef(null)
  const smoothedRef  = useRef({ left: null, right: null })
  const runningRef   = useRef(false)

  // These ARE state because components need to re-render when detection status changes
  const [handsDetected, setHandsDetected] = useState({ left: false, right: false })

  // ── Build the sensitivity curve ─────────────────────────────────────────────
  // raw y (0..1 from MediaPipe) → paddle target y (0..1)
  // sensitivity < 1 = you only need to move your hand through the middle portion
  // of the frame. e.g. sensitivity=0.75 means the middle 75% of the frame
  // maps to the full paddle range — you don't need to reach top/bottom of screen.
  const mapY = useCallback((rawY) => {
    const margin = (1 - sensitivity) / 2
    const normalised = Math.max(0, Math.min(1, (rawY - margin) / sensitivity))
    // Apply dead zone at top — ignore top X% of frame
    return Math.max(0, Math.min(1, (normalised - deadZone) / (1 - deadZone)))
  }, [sensitivity, deadZone])

  // ── MediaPipe results callback ───────────────────────────────────────────────
  // This runs every time MediaPipe processes a frame (60fps).
  // Do NOT call setState here for positions — it would cause 60 re-renders/second.
  const onResults = useCallback((results) => {
    const canvas = canvasRef.current
    const video  = videoRef.current
    if (!canvas || !video) return

    const ctx = canvas.getContext('2d')
    canvas.width  = video.videoWidth
    canvas.height = video.videoHeight
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Reset detection
    let leftDetected = false, rightDetected = false
    smoothedRef.current.left  = null
    smoothedRef.current.right = null

    if (results.multiHandLandmarks?.length) {
      results.multiHandLandmarks.forEach((landmarks, i) => {
        // MediaPipe labels are from the camera's perspective — swap for mirrored view
        const side = results.multiHandedness[i].label === 'Left' ? 'right' : 'left'

        // Use average of wrist(0), index knuckle(5), pinky knuckle(17)
        // More stable than wrist alone
        const rawY = (landmarks[0].y + landmarks[5].y + landmarks[17].y) / 3

        // Smooth: blend towards new value instead of jumping
        // smoothing=0.25 means "move 25% of the way to the new position each frame"
        const prev = smoothedRef.current[side]
        smoothedRef.current[side] = prev === null
          ? mapY(rawY)
          : prev + (mapY(rawY) - prev) * (1 - smoothing)

        if (side === 'left')  leftDetected  = true
        if (side === 'right') rightDetected = true

        // Draw skeleton overlay on camera canvas
        drawSkeleton(ctx, landmarks, canvas.width, canvas.height, side)
      })
    }

    setHandsDetected({ left: leftDetected, right: rightDetected })
  }, [mapY, smoothing, videoRef, canvasRef])

  // ── Init MediaPipe on mount ──────────────────────────────────────────────────
  useEffect(() => {
    // useEffect with [] runs once after the component mounts.
    // The return function runs when the component unmounts — this is the cleanup.
    let hands = null

    async function init() {
      // Wait for Hands constructor (loaded from CDN in index.html)
      let tries = 0
      while (typeof Hands === 'undefined' && tries < 60) {
        await sleep(300)
        tries++
      }
      if (typeof Hands === 'undefined') {
        console.error('MediaPipe Hands failed to load')
        return
      }

      hands = new Hands({
        locateFile: (f) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${f}`,
      })
      hands.setOptions({
        maxNumHands: 2,
        modelComplexity: 1,
        minDetectionConfidence: 0.65,
        minTrackingConfidence:  0.55,
      })
      hands.onResults(onResults)
      detectorRef.current = hands

      // Vision loop: send frames to MediaPipe continuously
      runningRef.current = true
      const video = videoRef.current
      const loop = async () => {
        if (!runningRef.current) return
        if (video?.readyState >= 2 && detectorRef.current) {
          try { await detectorRef.current.send({ image: video }) } catch {}
        }
        requestAnimationFrame(loop)
      }
      loop()
    }

    init()

    // Cleanup — runs when the Game component unmounts
    return () => {
      runningRef.current = false
      hands?.close?.()
    }
  }, [onResults, videoRef]) // re-run if these change

  // Public API: components read from smoothedRef directly (not state)
  // so paddle updates don't trigger React re-renders
  const getPaddleY = useCallback((side) => smoothedRef.current[side], [])

  return { getPaddleY, handsDetected }
}

// ── Skeleton drawing ───────────────────────────────────────────────────────────
function drawSkeleton(ctx, landmarks, w, h, side) {
  const color = side === 'left' ? '#3bf5c0' : '#f53b7e'
  const CONNECTIONS = [
    [0,1],[1,2],[2,3],[3,4],
    [0,5],[5,6],[6,7],[7,8],
    [5,9],[9,10],[10,11],[11,12],
    [9,13],[13,14],[14,15],[15,16],
    [13,17],[17,18],[18,19],[19,20],[0,17],
  ]

  ctx.strokeStyle = color
  ctx.lineWidth   = 2
  ctx.globalAlpha = 0.8
  for (const [a, b] of CONNECTIONS) {
    ctx.beginPath()
    ctx.moveTo(landmarks[a].x * w, landmarks[a].y * h)
    ctx.lineTo(landmarks[b].x * w, landmarks[b].y * h)
    ctx.stroke()
  }

  ctx.fillStyle   = color
  ctx.globalAlpha = 1
  for (const lm of landmarks) {
    ctx.beginPath()
    ctx.arc(lm.x * w, lm.y * h, 3, 0, Math.PI * 2)
    ctx.fill()
  }
}

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)) }
