const bubbleUrl = encodeURI(`${process.env.PUBLIC_URL}/bubble.ogg`)

const bubblePool = []
const BUBBLE_POOL_SIZE = 8
let lastBubblePlayAt = 0
let bubbleVolume = 0.55

function clamp01(v) {
  const n = Number(v)
  if (!Number.isFinite(n)) return 0
  return Math.min(1, Math.max(0, n))
}

export function setBubbleSfxVolume(v) {
  bubbleVolume = clamp01(v)
}

function nowMs() {
  // Prefer high-res timer when available
  if (typeof performance !== "undefined" && typeof performance.now === "function") {
    return performance.now()
  }
  return Date.now()
}

/**
 * Play the bubble hover sound (from `public/bubble.ogg`).
 * Uses a small Audio() pool so multiple bubbles can overlap without creating an Audio per bubble instance.
 */
export function playBubbleSfx({ volume = bubbleVolume, minIntervalMs = 120 } = {}) {
  const t = nowMs()
  if (t - lastBubblePlayAt < minIntervalMs) return
  lastBubblePlayAt = t

  let audio = bubblePool.find((a) => a.paused || a.ended)

  if (!audio) {
    if (bubblePool.length < BUBBLE_POOL_SIZE) {
      audio = new Audio(bubbleUrl)
      audio.preload = "auto"
      audio.playsInline = true
      bubblePool.push(audio)
    } else {
      audio = bubblePool[0]
    }
  }

  try {
    audio.volume = volume
    audio.currentTime = 0
    const p = audio.play()
    if (p && typeof p.catch === "function") p.catch(() => {})
  } catch (e) {
    // Ignore (autoplay policy / decode errors)
  }
}


