import React, { useCallback } from "react"

function pct(v) {
  return `${Math.round(v * 100)}%`
}

export default function SoundControls({
  seaVolume,
  bubbleVolume,
  onSeaVolumeChange,
  onBubbleVolumeChange,
}) {
  const onSea = useCallback(
    (e) => onSeaVolumeChange?.(Number(e.target.value)),
    [onSeaVolumeChange]
  )
  const onBubble = useCallback(
    (e) => onBubbleVolumeChange?.(Number(e.target.value)),
    [onBubbleVolumeChange]
  )

  return (
    <div className="soundControls" aria-label="Sound settings">
      <div className="soundControlsTitle">Sound</div>

      <label className="soundRow">
        <span className="soundLabel">Sea</span>
        <input
          className="soundSlider"
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={seaVolume}
          onChange={onSea}
          aria-label="Sea volume"
        />
        <span className="soundValue">{pct(seaVolume)}</span>
      </label>

      <label className="soundRow">
        <span className="soundLabel">Bubbles</span>
        <input
          className="soundSlider"
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={bubbleVolume}
          onChange={onBubble}
          aria-label="Bubble volume"
        />
        <span className="soundValue">{pct(bubbleVolume)}</span>
      </label>
    </div>
  )
}


