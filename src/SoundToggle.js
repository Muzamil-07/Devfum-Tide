import React from "react"

export default function SoundToggle({ muted, onToggle }) {
  return (
    <button
      type="button"
      aria-label={muted ? "Unmute" : "Mute"}
      title={muted ? "Unmute" : "Mute"}
      onClick={onToggle}
      style={{
        position: "fixed",
        right: 18,
        bottom: 18,
        zIndex: 9999,
        width: 44,
        height: 44,
        borderRadius: 8,
        border: "none",
        background: "rgba(0,0,0,0.45)",
        color: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
      }}
    >
      {muted ? (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 9v6h4l5 5V4l-5 5h-4z"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
      ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M19 8a6 6 0 0 1 0 8"/><path d="M15 4a10 10 0 0 1 0 16"/></svg>
      )}
    </button>
  )
}
