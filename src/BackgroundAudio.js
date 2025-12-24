import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

export default function BackgroundAudio({
  src = `${process.env.PUBLIC_URL}/sea sound.ogg`,
  volume = 0.35,
}) {
  const audioRef = useRef(null);
  const [needsGesture, setNeedsGesture] = useState(false);

  const resolvedSrc = useMemo(() => encodeURI(src), [src]);

  const tryPlay = useCallback(async () => {
    const audioEl = audioRef.current;
    if (!audioEl) return false;

    try {
      audioEl.volume = volume;
      audioEl.loop = true;
      audioEl.preload = "auto";
      audioEl.playsInline = true;

      await audioEl.play();
      setNeedsGesture(false);
      return true;
    } catch (e) {
      setNeedsGesture(true);
      return false;
    }
  }, [volume]);

  useEffect(() => {
    // Attempt autoplay immediately on mount.
    void tryPlay();

    // If autoplay is blocked, start on first user gesture.
    const onGesture = () => {
      void tryPlay();
    };

    window.addEventListener("pointerdown", onGesture, { once: true, passive: true });
    window.addEventListener("touchstart", onGesture, { once: true, passive: true });
    window.addEventListener("keydown", onGesture, { once: true });

    return () => {
      window.removeEventListener("pointerdown", onGesture);
      window.removeEventListener("touchstart", onGesture);
      window.removeEventListener("keydown", onGesture);
    };
  }, [tryPlay]);

  // Update volume live without restarting playback.
  useEffect(() => {
    const audioEl = audioRef.current;
    if (!audioEl) return;
    audioEl.volume = volume;
  }, [volume]);

  return (
    <>
      <audio ref={audioRef} src={resolvedSrc} loop preload="auto" />
      {needsGesture ? (
        <button
          type="button"
          className="glassButton bgAudioEnable"
          onClick={() => void tryPlay()}
          aria-label="Enable background sound"
        >
          Enable sound
        </button>
      ) : null}
    </>
  );
}


